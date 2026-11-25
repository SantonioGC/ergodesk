//pedidos del usuario
const express = require("express");
const router = express.Router();
const db = require("../db");
const { responder, requiereLogin } = require("../util");

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


module.exports = router;
