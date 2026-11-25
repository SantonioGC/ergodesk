//catalogo, pedidos y metricas
const express = require("express");
const router = express.Router();
const db = require("../db");
const { falla, responder, requiereAdmin } = require("../util");

router.use(requiereAdmin);

const ENVIOS = ["en_preparacion", "enviado", "entregado"];

//para validar campos como interfaz y bd
const leerProducto = (b, parcial = false) => {
  const out = {};
  const campo = (k, fn) => {
    if (b[k] === undefined) { if (!parcial) throw falla(400, `Falta ${k}.`); return; }
    out[k] = fn(b[k]);
  };
  campo("nombre", v => {
    if (typeof v !== "string") throw falla(400, "El nombre del producto debe ser texto");
    v = v.trim();
    if (!v || v.length > 150) throw falla(400, "El nombre debe tener de 1 a 150 caracteres");
    return v;
  });
  campo("categoria_id", v => {
    if (!/^[1-9]\d*$/.test(String(v)) || !Number.isSafeInteger(Number(v))) throw falla(400, "Categoría inválida");
    return Number(v);
  });
  campo("precio", v => {
    const s = String(v);
    if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(s)) throw falla(400, "El precio admite hasta 8 dígitos enteros y 2 decimales");
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0 || n > 99999999) throw falla(400, "Precio fuera del rango permitido");
    return Math.round(n * 100) / 100;
  });
  campo("stock", v => {
    if (!/^\d{1,6}$/.test(String(v))) throw falla(400, "El stock debe ser un numero entero");
    return Number(v);
  });
  for (const k of ["descripcion", "materiales", "imagen"]) {
    if (b[k] === undefined) continue;
    if (b[k] === null) { out[k] = null; continue; }
    if (typeof b[k] !== "string") throw falla(400, `El campo ${k} debe ser texto`);
    const max = k === "descripcion" ? 5000 : (k === "imagen" ? 500 : 255);
    if (b[k].length > max) throw falla(400, `${k} no puede superar ${max} caracteres`);
    out[k] = b[k].trim() || null;
  }
  if (b.imagen && !/^https:\/\/\S+$/i.test(String(b.imagen))) throw falla(400, "La URL de la imagen debe utilizar HTTPS");
  if (b.galeria !== undefined) {
    let urls = b.galeria;
    if (typeof urls === "string") urls = urls.split(/\r?\n/).map(u => u.trim()).filter(Boolean);
    if (!Array.isArray(urls) || urls.length > 6) throw falla(400, "La galería acepta hasta 6 imágenes");
    urls = urls.map(url => String(url).trim());
    if (urls.some(url => url.length > 500 || !/^https:\/\/\S+$/i.test(url))) throw falla(400, "Cada imagen de la galería debe ser una URL HTTPS de máximo 500 caracteres");
    out.galeria = JSON.stringify([...new Set(urls)]);
  }
  if (b.destacado !== undefined) {
    if (![true, false, 0, 1, "0", "1"].includes(b.destacado)) throw falla(400, "El valor de destacado no es válido");
    out.destacado = b.destacado === true || b.destacado === 1 || b.destacado === "1" ? 1 : 0;
  }
  return out;
};

const idValido = id => /^[1-9]\d*$/.test(String(id)) && Number.isSafeInteger(Number(id));

//catalogo
router.get("/productos", async (req, res) => {
  try {
    const [r] = await db.query("SELECT p.*, c.nombre AS categoria_nombre FROM productos p JOIN categorias c ON c.id = p.categoria_id ORDER BY p.id");
    res.json(r);
  } catch (e) { responder(res, e, "error al listar productos"); }
});

router.post("/productos", async (req, res) => {
  try {
    const d = leerProducto(req.body);
    const [r] = await db.query("INSERT INTO productos SET ?", [d]);
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    if (e.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "la categoria no existe" });
    responder(res, e, "error al crear producto");
  }
});

//edita precio stock y dema
router.put("/productos/:id", async (req, res) => {
  try {
    if (!idValido(req.params.id)) throw falla(400, "Identificador de producto inválido");
    const d = leerProducto(req.body, true);
    if (!Object.keys(d).length) throw falla(400, "nada que actualizar");
    const [r] = await db.query("UPDATE productos SET ? WHERE id = ?", [d, req.params.id]);
    if (!r.affectedRows) throw falla(404, "producto no encontrado");
    res.json({ mensaje: "producto actualizado" });
  } catch (e) {
    if (e.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "la categoria no existe" });
    responder(res, e, "error al actualizar producto");
  }
});

router.delete("/productos/:id", async (req, res) => {
  try {
    //para que pedidos se le queden el nombre y precio
    if (!idValido(req.params.id)) throw falla(400, "Identificador de producto inválido");
    const [r] = await db.query("DELETE FROM productos WHERE id = ?", [req.params.id]);
    if (!r.affectedRows) throw falla(404, "producto no encontrado");
    res.json({ mensaje: "producto eliminado" });
  } catch (e) { responder(res, e, "error al eliminar producto"); }
});

//pedidos
router.get("/pedidos", async (req, res) => {
  try {
    const [r] = await db.query(
      `SELECT o.id, o.fecha, o.total, o.estatus, o.direccion_envio, u.nombre AS cliente, u.email,
              p.metodo, p.estatus AS pago_estatus, p.modo AS pago_modo, e.paqueteria, e.guia, e.estatus AS envio_estatus
       FROM ordenes o
       JOIN usuarios u ON u.id = o.usuario_id
       LEFT JOIN pagos p ON p.orden_id = o.id
       LEFT JOIN envios e ON e.orden_id = o.id
       ORDER BY o.id DESC LIMIT 200`
    );
    res.json(r);
  } catch (e) { responder(res, e, "error al listar pedidos"); }
});

router.put("/pedidos/:id/envio", async (req, res) => {
  try {
    const { estatus, guia } = req.body;
    if (!ENVIOS.includes(estatus)) throw falla(400, `estatus invalido (${ENVIOS.join(", ")})`);
    if (!idValido(req.params.id)) throw falla(400, "Identificador de pedido inválido.");
    const [[o]] = await db.query(
      "SELECT o.estatus, p.estatus AS pago_estatus FROM ordenes o LEFT JOIN pagos p ON p.orden_id = o.id WHERE o.id = ?",
      [req.params.id]
    );
    if (!o) throw falla(404, "Pedido no encontrado");
    if (o.estatus !== "pagado" || o.pago_estatus !== "aprobado") {
      throw falla(400, "Solo se puede cambiar el envío de pedidos con pago confirmado.");
    }
    await db.query(
      "UPDATE envios SET estatus = ?, guia = COALESCE(?, guia) WHERE orden_id = ?",
      [estatus, guia ? String(guia).slice(0, 40) : null, req.params.id]
    );
    res.json({ mensaje: "envio actualizado" });
  } catch (e) { responder(res, e, "error al actualizar envio"); }
});

//metricas
router.get("/metricas", async (req, res) => {
  try {
    const [[m]] = await db.query(
      `SELECT COALESCE(SUM(o.total), 0) AS ventas_totales,
              COUNT(*) AS pedidos_pagados,
              COALESCE(AVG(o.total), 0) AS ticket_promedio
       FROM ordenes o
       JOIN pagos p ON p.orden_id = o.id
       WHERE o.estatus = 'pagado' AND p.estatus = 'aprobado'`
    );
    const [top] = await db.query(
      `SELECT d.nombre, SUM(d.cantidad) AS unidades
       FROM detalle_orden d
       JOIN ordenes o ON o.id = d.orden_id
       JOIN pagos p ON p.orden_id = o.id
       WHERE o.estatus = 'pagado' AND p.estatus = 'aprobado'
       GROUP BY d.nombre ORDER BY unidades DESC LIMIT 5`
    );
    res.json({
      ventas_totales: Number(m.ventas_totales),
      pedidos_pagados: Number(m.pedidos_pagados || 0),
      ticket_promedio: Math.round(Number(m.ticket_promedio) * 100) / 100,
      mas_vendidos: top
    });
  } catch (e) { responder(res, e, "error al calcular metricas"); }
});

module.exports = router;
