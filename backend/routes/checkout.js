//reserva de stock por 15 min
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../db");
const { falla, responder, requiereLogin, itemsDeCarrito } = require("../util");

const ENVIOS = { estafeta: 149, dhl: 199 };
const PAGOS = ["stripe", "oxxo"];
const COMISION = 0.04;
const RESERVA_MINUTOS = 15;

const redondear = (n) => Math.round(n * 100) / 100;

const cargarCarrito = async (c, usuarioId) => {
  const [[carrito]] = await c.query("SELECT id FROM carritos WHERE usuario_id = ?", [usuarioId]);
  return { id: carrito ? carrito.id : null, items: carrito ? await itemsDeCarrito(c, carrito.id) : [] };
};

//bloquea las filas de los productos y revisa cuales no alcanzan (stock menos reservas de otros)
const sinStock = async (c, checkoutId, items) => {
  const productos = items.filter(i => i.producto_id);
  if (productos.length === 0) return [];

  const ids = productos.map(i => i.producto_id).sort((a, b) => a - b);
  const [stocks] = await c.query("SELECT id, stock FROM productos WHERE id IN (?) ORDER BY id FOR UPDATE", [ids]);
  const [ajenas] = await c.query(
    "SELECT producto_id, SUM(cantidad) AS n FROM reservas_stock WHERE producto_id IN (?) AND checkout_id <> ? AND expira_en > NOW() GROUP BY producto_id",
    [ids, checkoutId]
  );
  const stock = Object.fromEntries(stocks.map(r => [r.id, r.stock]));
  const reservado = Object.fromEntries(ajenas.map(r => [r.producto_id, Number(r.n)]));

  return productos.flatMap(i => {
    const disponible = (stock[i.producto_id] ?? 0) - (reservado[i.producto_id] || 0);
    return i.cantidad > disponible ? [{ producto_id: i.producto_id, nombre: i.nombre, disponible: Math.max(disponible, 0) }] : [];
  });
};

const reservar = async (c, checkoutId, items) => {
  const problemas = await sinStock(c, checkoutId, items);
  if (problemas.length) return problemas;

  await c.query("DELETE FROM reservas_stock WHERE checkout_id = ?", [checkoutId]);
  for (const i of items.filter(i => i.producto_id)) {
    await c.query(
      "INSERT INTO reservas_stock (checkout_id, producto_id, cantidad, expira_en) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))",
      [checkoutId, i.producto_id, i.cantidad, RESERVA_MINUTOS]
    );
  }
  return [];
};

const estado = async (c, usuarioId) => {
  const [[s]] = await c.query("SELECT * FROM checkout_sesiones WHERE usuario_id = ?", [usuarioId]);
  if (!s) throw falla(400, "no hay checkout activo");

  const { items } = await cargarCarrito(c, usuarioId);
  const [[r]] = await c.query(
    "SELECT TIMESTAMPDIFF(SECOND, NOW(), MIN(expira_en)) AS segundos FROM reservas_stock WHERE checkout_id = ? AND expira_en > NOW()",
    [s.id]
  );
  const subtotal = redondear(items.reduce((t, i) => t + i.precio * i.cantidad, 0));
  const envio = ENVIOS[s.envio_metodo] ?? 0;

  return {
    paso: s.paso,
    direccion_id: s.direccion_id,
    envio_metodo: s.envio_metodo,
    pago_metodo: s.pago_metodo,
    items,
    subtotal,
    envio,
    total: redondear(subtotal + envio),
    segundos_restantes: r.segundos,
    envios: ENVIOS
  };
};

router.use(requiereLogin);

//crea o retoma el checkout solo vuelve a reservar si falta la reserva, expiro o cambio el carrito
router.post("/iniciar", async (req, res) => {
  const uid = req.usuario.id;
  try {
    const r = await db.transaccion(async (c) => {
      const { items } = await cargarCarrito(c, uid);
      if (items.length === 0) throw falla(400, "tu carrito esta vacio");

      await c.query("INSERT INTO checkout_sesiones (usuario_id) VALUES (?) ON DUPLICATE KEY UPDATE usuario_id = usuario_id", [uid]);
      const [[s]] = await c.query("SELECT id FROM checkout_sesiones WHERE usuario_id = ?", [uid]);

      const [propias] = await c.query("SELECT producto_id, cantidad FROM reservas_stock WHERE checkout_id = ? AND expira_en > NOW()", [s.id]);
      const productos = items.filter(i => i.producto_id);
      const vigente = propias.length === productos.length &&
        productos.every(i => propias.some(p => p.producto_id === i.producto_id && p.cantidad === i.cantidad));

      const problemas = vigente ? [] : await reservar(c, s.id, items);
      return problemas.length ? { problemas } : { checkout: await estado(c, uid) };
    });

    if (r.problemas) return res.status(409).json({ error: "algunos productos no tienen stock suficiente", problemas: r.problemas });
    res.json(r.checkout);
  } catch (e) {
    responder(res, e, "error al iniciar el checkout");
  }
});

//guarda direccion, envio, metodo de pago y paso para poder retomar despues
router.put("/", async (req, res) => {
  const uid = req.usuario.id;
  try {
    const { direccion_id, envio_metodo, pago_metodo, paso } = req.body;
    const checkout = await db.transaccion(async (c) => {
      const cambios = {};

      if (direccion_id !== undefined) {
        const [[d]] = await c.query("SELECT id FROM direcciones WHERE id = ? AND usuario_id = ?", [direccion_id, uid]);
        if (!d) throw falla(400, "direccion invalida");
        cambios.direccion_id = d.id;
      }
      if (envio_metodo !== undefined) {
        if (!Object.keys(ENVIOS).includes(envio_metodo)) throw falla(400, "metodo de envio invalido");
        cambios.envio_metodo = envio_metodo;
      }
      if (pago_metodo !== undefined) {
        if (!PAGOS.includes(pago_metodo)) throw falla(400, "metodo de pago invalido");
        cambios.pago_metodo = pago_metodo;
      }
      if (paso !== undefined) {
        if (![1, 2, 3, 4].includes(paso)) throw falla(400, "paso invalido");
        cambios.paso = paso;
      }

      if (Object.keys(cambios).length) await c.query("UPDATE checkout_sesiones SET ? WHERE usuario_id = ?", [cambios, uid]);
      return estado(c, uid);
    });
    res.json(checkout);
  } catch (e) {
    responder(res, e, "error al guardar el checkout");
  }
});

//OXXO conserva la referencia simulada; los pagos con tarjeta pasan por Stripe.
router.post("/pagar", async (req, res) => {
  const uid = req.usuario.id;
  try {
    const r = await db.transaccion(async (c) => {
      const [[s]] = await c.query("SELECT * FROM checkout_sesiones WHERE usuario_id = ? FOR UPDATE", [uid]);
      if (!s) throw falla(400, "no hay checkout activo");
      if (!s.direccion_id || !s.envio_metodo || !s.pago_metodo) throw falla(400, "faltan datos de envio o pago");
      if (s.pago_metodo !== "oxxo") throw falla(400, "los pagos con tarjeta deben procesarse desde Stripe");

      const carrito = await cargarCarrito(c, uid);
      if (carrito.items.length === 0) throw falla(400, "tu carrito esta vacio");

      const problemas = await sinStock(c, s.id, carrito.items);
      if (problemas.length) throw falla(409, "algunos productos ya no tienen stock suficiente", { problemas });

      const [[direccion]] = await c.query("SELECT * FROM direcciones WHERE id = ?", [s.direccion_id]);
      const envio = ENVIOS[s.envio_metodo];
      const total = redondear(carrito.items.reduce((t, i) => t + i.precio * i.cantidad, 0) + envio);

      const estatus = "pendiente";
      const estatusPago = "pendiente";
      const estatusEnvio = "pendiente";
      const referencia = `OXXO-${crypto.randomInt(1000000000, 9999999999)}`;

      const [orden] = await c.query(
        "INSERT INTO ordenes (usuario_id, direccion_id, direccion_envio, total, estatus) VALUES (?, ?, ?, ?, ?)",
        [uid, direccion.id, JSON.stringify(direccion), total, estatus]
      );
      for (const i of carrito.items) {
        await c.query(
          "INSERT INTO detalle_orden (orden_id, producto_id, nombre, configuracion, cantidad, precio_unitario) VALUES (?, ?, ?, ?, ?, ?)",
          [orden.insertId, i.producto_id, i.nombre, i.configuracion && JSON.stringify(i.configuracion), i.cantidad, i.precio]
        );
      }
      await c.query(
        "INSERT INTO pagos (orden_id, metodo, monto, estatus, comision, referencia) VALUES (?, ?, ?, ?, ?, ?)",
        [orden.insertId, s.pago_metodo, total, estatusPago, redondear(total * COMISION), referencia]
      );
      await c.query(
        "INSERT INTO envios (orden_id, paqueteria, estatus, costo_envio) VALUES (?, ?, ?, ?)",
        [orden.insertId, s.envio_metodo, estatusEnvio, envio]
      );

      //OXXO genera una referencia simulada y conserva el pedido pendiente.
      for (const i of carrito.items.filter(i => i.producto_id)) {
        await c.query("UPDATE productos SET stock = stock - ? WHERE id = ?", [i.cantidad, i.producto_id]);
      }
      await c.query("DELETE FROM carrito_items WHERE carrito_id = ?", [carrito.id]);
      await c.query("DELETE FROM checkout_sesiones WHERE id = ?", [s.id]);

      return { orden_id: orden.insertId, estatus, referencia };
    });
    res.json(r);
  } catch (e) {
    responder(res, e, "error al procesar el pago");
  }
});

module.exports = router;
