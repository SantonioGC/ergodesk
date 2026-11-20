//pedidos del usuario
const express = require("express");
const router = express.Router();
const db = require("../db");
const { falla, responder, requiereLogin } = require("../util");
const { enviarConfirmacionPedido } = require("../services/correo");

router.use(requiereLogin);

router.get("/", async (req, res) => {
  try {
    const [pedidos] = await db.query(
      `SELECT o.id, o.fecha, o.total, o.estatus, o.direccion_envio,
              p.metodo, p.estatus AS pago_estatus, p.referencia,
              e.paqueteria, e.guia, e.estatus AS envio_estatus
       FROM ordenes o
       LEFT JOIN pagos p ON p.orden_id = o.id
       LEFT JOIN envios e ON e.orden_id = o.id
       WHERE o.usuario_id = ?
       ORDER BY o.id DESC`,
      [req.usuario.id]
    );
    const [items] = await db.query(
      `SELECT d.orden_id, d.nombre, d.configuracion, d.cantidad, d.precio_unitario
       FROM detalle_orden d JOIN ordenes o ON o.id = d.orden_id
       WHERE o.usuario_id = ?`,
      [req.usuario.id]
    );
    res.json({ pedidos: pedidos.map(p => ({ ...p, items: items.filter(i => i.orden_id === p.id) })) });
  } catch (e) {
    responder(res, e, "error al obtener pedidos");
  }
});

//simula que el cliente pago referencia de OXXO
router.post("/:id/simular-pago", async (req, res) => {
  try {
    const { resultado } = req.body;
    if (!["aprobado", "rechazado"].includes(resultado)) throw falla(400, "resultado invalido");
    const aprobado = resultado === "aprobado";

    await db.transaccion(async (c) => {
      const [[orden]] = await c.query(
        `SELECT o.estatus, p.metodo
         FROM ordenes o JOIN pagos p ON p.orden_id = o.id
         WHERE o.id = ? AND o.usuario_id = ? FOR UPDATE`,
        [req.params.id, req.usuario.id]
      );
      if (!orden) throw falla(404, "pedido no encontrado");
      //este endpoint solo simula el depósito OXXO no puede aprobar un pedido Stripe.
      if (orden.metodo !== "oxxo") throw falla(403, "los pagos con tarjeta solo se confirman mediante Stripe");
      if (orden.estatus !== "pendiente") throw falla(400, "el pedido ya no esta pendiente");

      await c.query("UPDATE ordenes SET estatus = ? WHERE id = ?", [aprobado ? "pagado" : "rechazado", req.params.id]);
      await c.query("UPDATE pagos SET estatus = ? WHERE orden_id = ?", [resultado, req.params.id]);
      await c.query("UPDATE envios SET estatus = ? WHERE orden_id = ?", [aprobado ? "en_preparacion" : "cancelado", req.params.id]);

      //si no se pago, el stock descontado regresa al inventario
      if (!aprobado) {
        await c.query("UPDATE productos p JOIN detalle_orden d ON d.producto_id = p.id SET p.stock = p.stock + d.cantidad WHERE d.orden_id = ?", [req.params.id]);
      }
    });

    if (aprobado) await enviarConfirmacionPedido(Number(req.params.id));
    res.json({ mensaje: aprobado ? "pago confirmado" : "pedido cancelado" });
  } catch (e) {
    responder(res, e, "error al simular el pago");
  }
});

module.exports = router;
