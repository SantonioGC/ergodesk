//integración de pagos con Stripe en modo de pruebas
const express = require("express");
const Stripe = require("stripe");
const router = express.Router();
const db = require("../db");
const { falla, responder, requiereLogin, itemsDeCarrito } = require("../util");
const { enviarConfirmacionPedido } = require("../services/correo");

const ENVIOS = { estafeta: 149, dhl: 199 };
const moneda = "mxn";
const redondear = (n) => Math.round(n * 100) / 100;

function stripeCliente() {
  const clave = process.env.STRIPE_SECRET_KEY || "";
  //este proyecto queda deliberadamente limitado a Stripe Test Mode
  if (!clave.startsWith("sk_test_")) {
    throw falla(503, "Stripe no está configurado. Agrega una clave secreta de prueba sk_test_ en el archivo .env.");
  }
  return new Stripe(clave);
}

function urlFrontend() {
  return (process.env.FRONTEND_URL || "https://localhost").replace(/\/$/, "");
}

async function restaurarCarrito(c, usuarioId, ordenId) {
  await c.query(
    "INSERT INTO carritos (usuario_id) VALUES (?) ON DUPLICATE KEY UPDATE usuario_id = usuario_id",
    [usuarioId]
  );
  const [[carrito]] = await c.query("SELECT id FROM carritos WHERE usuario_id = ?", [usuarioId]);
  const [items] = await c.query(
    "SELECT producto_id, nombre, precio_unitario, configuracion, cantidad FROM detalle_orden WHERE orden_id = ?",
    [ordenId]
  );

  for (const item of items) {
    const configuracion = item.configuracion == null
      ? null
      : typeof item.configuracion === "string" ? item.configuracion : JSON.stringify(item.configuracion);

    if (item.producto_id) {
      await c.query(
        `INSERT INTO carrito_items (carrito_id, producto_id, nombre, precio, configuracion, cantidad)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE cantidad = GREATEST(cantidad, VALUES(cantidad))`,
        [carrito.id, item.producto_id, item.nombre, item.precio_unitario, configuracion, item.cantidad]
      );
    } else {
      const [[existente]] = await c.query(
        `SELECT id, cantidad FROM carrito_items
         WHERE carrito_id = ? AND producto_id IS NULL AND nombre = ? AND configuracion <=> ? LIMIT 1`,
        [carrito.id, item.nombre, configuracion]
      );
      if (existente) {
        await c.query("UPDATE carrito_items SET cantidad = GREATEST(cantidad, ?) WHERE id = ?", [item.cantidad, existente.id]);
      } else {
        await c.query(
          "INSERT INTO carrito_items (carrito_id, nombre, precio, configuracion, cantidad) VALUES (?, ?, ?, ?, ?)",
          [carrito.id, item.nombre, item.precio_unitario, configuracion, item.cantidad]
        );
      }
    }
  }
}

async function liberarPedidoStripe(ordenId, sessionId) {
  return db.transaccion(async (c) => {
    const [[p]] = await c.query(
      `SELECT o.id, o.usuario_id, o.estatus, pa.estatus AS pago_estatus, pa.stripe_session_id
       FROM ordenes o JOIN pagos pa ON pa.orden_id = o.id
       WHERE o.id = ? FOR UPDATE`,
      [ordenId]
    );
    if (!p || p.estatus !== "pendiente" || p.pago_estatus !== "pendiente") return false;
    if (sessionId && p.stripe_session_id && p.stripe_session_id !== sessionId) throw falla(400, "la sesión de Stripe no corresponde al pedido");

    await c.query(
      `UPDATE productos pr
       JOIN detalle_orden d ON d.producto_id = pr.id
       SET pr.stock = pr.stock + d.cantidad
       WHERE d.orden_id = ?`,
      [ordenId]
    );
    await c.query("UPDATE ordenes SET estatus = 'rechazado' WHERE id = ?", [ordenId]);
    await c.query("UPDATE pagos SET estatus = 'rechazado' WHERE orden_id = ?", [ordenId]);
    await c.query("UPDATE envios SET estatus = 'cancelado' WHERE orden_id = ?", [ordenId]);
    await c.query("UPDATE checkout_sesiones SET stripe_orden_id = NULL WHERE usuario_id = ? AND stripe_orden_id = ?", [p.usuario_id, ordenId]);
    await restaurarCarrito(c, p.usuario_id, ordenId);
    return true;
  });
}

async function confirmarPedidoStripe(session, exigirCorreo = false) {
  if (session.livemode) throw falla(400, "se recibió un pago fuera del modo de pruebas");
  if (session.payment_status !== "paid") return { estatus: "pendiente", orden_id: Number(session.metadata?.order_id) || null };

  const ordenId = Number(session.metadata?.order_id);
  const usuarioId = Number(session.metadata?.user_id);
  if (!Number.isInteger(ordenId) || !Number.isInteger(usuarioId)) throw falla(400, "la sesión de Stripe no contiene los datos del pedido");

  await db.transaccion(async (c) => {
    const [[p]] = await c.query(
      `SELECT o.id, o.usuario_id, o.total, o.estatus,
              pa.monto, pa.estatus AS pago_estatus, pa.stripe_session_id
       FROM ordenes o JOIN pagos pa ON pa.orden_id = o.id
       WHERE o.id = ? FOR UPDATE`,
      [ordenId]
    );
    if (!p || Number(p.usuario_id) !== usuarioId) throw falla(404, "pedido de Stripe no encontrado");
    if (p.stripe_session_id !== session.id) throw falla(400, "la sesión de Stripe no coincide con el pedido");
    if (String(session.currency).toLowerCase() !== moneda || Number(session.amount_total) !== Math.round(Number(p.monto) * 100)) {
      throw falla(400, "el importe o la moneda recibidos de Stripe no coinciden con el pedido");
    }

    if (p.pago_estatus === "pendiente" && p.estatus === "pendiente") {
      await c.query("UPDATE ordenes SET estatus = 'pagado' WHERE id = ?", [ordenId]);
      await c.query(
        "UPDATE pagos SET estatus = 'aprobado', stripe_payment_intent_id = ? WHERE orden_id = ?",
        [typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null, ordenId]
      );
      await c.query("UPDATE envios SET estatus = 'en_preparacion' WHERE orden_id = ?", [ordenId]);
    }
  });

  const correo = await enviarConfirmacionPedido(ordenId);
  if (exigirCorreo && !correo.enviado) throw new Error(correo.error || "no se pudo enviar el correo de confirmación");
  return { estatus: "pagado", orden_id: ordenId, correo_enviado: correo.enviado };
}

//Webhook público se declara antes de requiereLogin y necesita el body sin parsear
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const secreto = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secreto) return res.status(503).send("Falta configurar STRIPE_WEBHOOK_SECRET");

  let evento;
  try {
    evento = stripeCliente().webhooks.constructEvent(req.body, req.headers["stripe-signature"], secreto);
  } catch (error) {
    return res.status(400).send(`Webhook inválido: ${error.message}`);
  }

  try {
    const session = evento.data.object;
    if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(evento.type)) {
      if (session.payment_status === "paid") await confirmarPedidoStripe(session, true);
    } else if (evento.type === "checkout.session.expired" || evento.type === "checkout.session.async_payment_failed") {
      const ordenId = Number(session.metadata?.order_id);
      if (Number.isInteger(ordenId)) await liberarPedidoStripe(ordenId, session.id);
    }
    res.json({ recibido: true });
  } catch (error) {
    console.error("Error al procesar webhook de Stripe:", error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : "no se pudo procesar el evento de Stripe" });
  }
});

router.use(requiereLogin);

//crea la orden pendiente, aparta su inventario y obtiene la URL alojada por Stripe
router.post("/crear-sesion", async (req, res) => {
  let ordenId = null;
  let stripeSession = null;
  try {
    const stripe = stripeCliente();
    const uid = req.usuario.id;
    const datos = await db.transaccion(async (c) => {
      const [[s]] = await c.query("SELECT * FROM checkout_sesiones WHERE usuario_id = ? FOR UPDATE", [uid]);
      if (!s) throw falla(400, "no hay checkout activo; vuelve a iniciar el checkout");
      if (s.pago_metodo !== "stripe") throw falla(400, "selecciona Stripe como método de pago");
      if (s.stripe_orden_id) throw falla(409, "ya se está preparando una sesión de pago; evita pulsar pagar varias veces");
      if (!s.direccion_id || !s.envio_metodo) throw falla(400, "faltan datos de envío");

      const { id: carritoId, items } = await (async () => {
        const [[carrito]] = await c.query("SELECT id FROM carritos WHERE usuario_id = ?", [uid]);
        return { id: carrito?.id || null, items: carrito ? await itemsDeCarrito(c, carrito.id) : [] };
      })();
      if (!carritoId || items.length === 0) throw falla(400, "tu carrito está vacío");

      const [[usuario]] = await c.query("SELECT nombre, email FROM usuarios WHERE id = ?", [uid]);
      const [[direccion]] = await c.query("SELECT * FROM direcciones WHERE id = ? AND usuario_id = ?", [s.direccion_id, uid]);
      if (!usuario || !direccion) throw falla(400, "la cuenta o dirección de envío no es válida");

      const productos = items.filter((item) => item.producto_id);
      if (productos.length) {
        const [reservas] = await c.query(
          "SELECT producto_id, cantidad FROM reservas_stock WHERE checkout_id = ? AND expira_en > NOW()",
          [s.id]
        );
        const reservaValida = reservas.length === productos.length && productos.every((item) =>
          reservas.some((r) => Number(r.producto_id) === Number(item.producto_id) && Number(r.cantidad) === Number(item.cantidad))
        );
        if (!reservaValida) throw falla(409, "la reserva de inventario expiró; vuelve a cargar el checkout");

        const faltantes = [];
        for (const item of productos) {
          const [[producto]] = await c.query("SELECT id, stock FROM productos WHERE id = ? FOR UPDATE", [item.producto_id]);
          const [[reservados]] = await c.query(
            `SELECT COALESCE(SUM(cantidad), 0) AS total FROM reservas_stock
             WHERE producto_id = ? AND checkout_id <> ? AND expira_en > NOW()`,
            [item.producto_id, s.id]
          );
          const disponible = producto ? Number(producto.stock) - Number(reservados.total) : 0;
          if (!producto || Number(item.cantidad) > disponible) {
            faltantes.push({ nombre: item.nombre, disponible: Math.max(disponible, 0) });
          }
        }
        if (faltantes.length) throw falla(409, "algunos productos ya no tienen stock suficiente", { problemas: faltantes });
      }

      const envio = ENVIOS[s.envio_metodo];
      if (envio === undefined) throw falla(400, "el método de envío no es válido");
      const subtotal = redondear(items.reduce((total, item) => total + Number(item.precio) * Number(item.cantidad), 0));
      const total = redondear(subtotal + envio);

      //el inventario se descuenta mientras la sesión de pago está abierta
      for (const item of productos) {
        const [actualizado] = await c.query(
          "UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?",
          [item.cantidad, item.producto_id, item.cantidad]
        );
        if (actualizado.affectedRows !== 1) throw falla(409, `no hay stock suficiente para ${item.nombre}`);
      }

      const [orden] = await c.query(
        "INSERT INTO ordenes (usuario_id, direccion_id, direccion_envio, total, estatus) VALUES (?, ?, ?, ?, 'pendiente')",
        [uid, direccion.id, JSON.stringify(direccion), total]
      );
      for (const item of items) {
        await c.query(
          "INSERT INTO detalle_orden (orden_id, producto_id, nombre, configuracion, cantidad, precio_unitario) VALUES (?, ?, ?, ?, ?, ?)",
          [orden.insertId, item.producto_id, item.nombre, item.configuracion == null ? null : JSON.stringify(item.configuracion), item.cantidad, item.precio]
        );
      }
      await c.query(
        "INSERT INTO pagos (orden_id, metodo, monto, estatus, comision, referencia) VALUES (?, 'stripe', ?, 'pendiente', 0, NULL)",
        [orden.insertId, total]
      );
      await c.query("UPDATE checkout_sesiones SET stripe_orden_id = ? WHERE id = ?", [orden.insertId, s.id]);
      await c.query(
        "INSERT INTO envios (orden_id, paqueteria, estatus, costo_envio) VALUES (?, ?, 'pendiente', ?)",
        [orden.insertId, s.envio_metodo, envio]
      );

      return { orden_id: orden.insertId, usuario, items, envio, total, checkout_id: s.id };
    });

    ordenId = datos.orden_id;
    const lineItems = datos.items.map((item) => ({
      quantity: Number(item.cantidad),
      price_data: {
        currency: moneda,
        unit_amount: Math.round(Number(item.precio) * 100),
        product_data: { name: String(item.nombre).slice(0, 250) }
      }
    }));
    if (datos.envio > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: moneda,
          unit_amount: Math.round(datos.envio * 100),
          product_data: { name: "Envío" }
        }
      });
    }

    const base = urlFrontend();
    stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "es-419",
      customer_email: datos.usuario.email,
      client_reference_id: String(ordenId),
      line_items: lineItems,
      metadata: { order_id: String(ordenId), user_id: String(req.usuario.id) },
      payment_intent_data: { metadata: { order_id: String(ordenId), user_id: String(req.usuario.id) } },
      success_url: `${base}/checkout.html?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout.html?stripe=cancel&session_id={CHECKOUT_SESSION_ID}`,
      expires_at: Math.floor(Date.now() / 1000) + 35 * 60
    }, { idempotencyKey: `ergodesk-order-${ordenId}` });

    await db.transaccion(async (c) => {
      await c.query(
        "UPDATE pagos SET stripe_session_id = ? WHERE orden_id = ? AND metodo = 'stripe'",
        [stripeSession.id, ordenId]
      );
      const [[carrito]] = await c.query("SELECT id FROM carritos WHERE usuario_id = ?", [req.usuario.id]);
      if (carrito) await c.query("DELETE FROM carrito_items WHERE carrito_id = ?", [carrito.id]);
      await c.query("DELETE FROM checkout_sesiones WHERE id = ? AND usuario_id = ?", [datos.checkout_id, req.usuario.id]);
    });

    res.json({ url: stripeSession.url, orden_id: ordenId });
  } catch (error) {
    if (stripeSession?.id) {
      try { await stripeCliente().checkout.sessions.expire(stripeSession.id); } catch (_) { /* se intenta liberar el pedido abajo */ }
    }
    if (ordenId) {
      try { await liberarPedidoStripe(ordenId, stripeSession?.id || null); } catch (liberacion) {
        console.error("No se pudo liberar el inventario del pedido:", liberacion.message);
      }
    }
    responder(res, error, "no se pudo iniciar el pago con Stripe");
  }
});

//comprueba el resultado consultando a Stripe desde el servidor nunca desde el navegador
router.get("/estado", async (req, res) => {
  try {
    const sessionId = String(req.query.session_id || "");
    if (!sessionId.startsWith("cs_test_")) throw falla(400, "sesión de Stripe no válida");
    const stripe = stripeCliente();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (String(session.metadata?.user_id) !== String(req.usuario.id)) throw falla(404, "sesión de pago no encontrada");

    let resultado;
    if (session.payment_status === "paid") resultado = await confirmarPedidoStripe(session);
    else if (session.status === "expired") {
      const ordenId = Number(session.metadata?.order_id);
      await liberarPedidoStripe(ordenId, session.id);
      resultado = { estatus: "rechazado", orden_id: ordenId };
    } else {
      resultado = { estatus: "pendiente", orden_id: Number(session.metadata?.order_id) || null };
    }
    res.json(resultado);
  } catch (error) {
    responder(res, error, "no se pudo consultar el pago de Stripe");
  }
});

//cancela una sesión abierta y devuelve el inventario al cancelar el checkout
router.post("/cancelar", async (req, res) => {
  try {
    const sessionId = String(req.body.session_id || "");
    if (!sessionId.startsWith("cs_test_")) throw falla(400, "sesión de Stripe no válida");
    const stripe = stripeCliente();
    let session = await stripe.checkout.sessions.retrieve(sessionId);
    if (String(session.metadata?.user_id) !== String(req.usuario.id)) throw falla(404, "sesión de pago no encontrada");

    if (session.status === "open") session = await stripe.checkout.sessions.expire(sessionId);
    if (session.payment_status === "paid") {
      const resultado = await confirmarPedidoStripe(session);
      return res.json(resultado);
    }

    const ordenId = Number(session.metadata?.order_id);
    if (session.status === "expired") await liberarPedidoStripe(ordenId, session.id);
    res.json({ orden_id: ordenId, estatus: "rechazado" });
  } catch (error) {
    responder(res, error, "no se pudo cancelar la sesión de Stripe");
  }
});

module.exports = router;
