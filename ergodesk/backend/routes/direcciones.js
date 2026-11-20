//direcciones de envio del usuario
const express = require("express");
const router = express.Router();
const db = require("../db");
const { falla, responder, requiereLogin } = require("../util");

const CAMPOS = ["alias", "destinatario", "telefono", "calle", "num_ext", "num_int", "colonia", "ciudad", "estado", "cp", "referencias"];
const OBLIGATORIOS = ["alias", "destinatario", "telefono", "calle", "num_ext", "colonia", "ciudad", "estado", "cp"];

//largos maximos (iguales a los de la tabla direcciones) y nombres para los mensajes
const LIMITES = { alias: 50, destinatario: 100, telefono: 10, calle: 150, num_ext: 10, num_int: 10, colonia: 100, ciudad: 60, estado: 60, cp: 5, referencias: 255 };
const ETIQUETAS = { alias: "alias", destinatario: "nombre de quien recibe", telefono: "teléfono", calle: "calle", num_ext: "número exterior", num_int: "número interior", colonia: "colonia", ciudad: "ciudad", estado: "estado", cp: "código postal", referencias: "referencias" };
const ESTADOS = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua",
  "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero",
  "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro",
  "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz",
  "Yucatán", "Zacatecas"
];
const sinAcentos = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const SOLO_LETRAS = /^\p{L}[\p{L}\s.'’-]*$/u;
const NUMERO = /^[A-Za-z0-9/-]+$/;

//valida y deja los datos limpios (el telefono sin espacios y el estado con su nombre oficial)
const validar = (b) => {
  CAMPOS.forEach(k => { b[k] = String(b[k] ?? "").trim().replace(/\s+/g, " "); });
  b.telefono = b.telefono.replace(/[\s\-().]/g, "");

  const falta = OBLIGATORIOS.find(k => !b[k]);
  if (falta) throw falla(400, `Falta el campo: ${ETIQUETAS[falta]}.`);

  const largo = CAMPOS.find(k => b[k].length > LIMITES[k]);
  if (largo) throw falla(400, `El campo ${ETIQUETAS[largo]} no puede pasar de ${LIMITES[largo]} caracteres.`);

  if (!/^\d{10}$/.test(b.telefono)) throw falla(400, "El teléfono debe tener 10 dígitos");
  if (!/^\d{5}$/.test(b.cp)) throw falla(400, "El código postal debe tener 5 dígitos");
  if (!SOLO_LETRAS.test(b.destinatario)) throw falla(400, "El nombre de quien recibe solo puede llevar letras");
  if (!SOLO_LETRAS.test(b.ciudad)) throw falla(400, "La ciudad solo puede llevar letras");
  if (!NUMERO.test(b.num_ext)) throw falla(400, "El número exterior solo puede llevar letras, números, diagonal o guion");
  if (b.num_int && !NUMERO.test(b.num_int)) throw falla(400, "El número interior solo puede llevar letras, números, diagonal o guion");

  const estado = ESTADOS.find(e => sinAcentos(e) === sinAcentos(b.estado));
  if (!estado) throw falla(400, "Elige un estado de la lista");
  b.estado = estado;
};

const valores = (b) => CAMPOS.map(k => String(b[k] ?? "").trim() || null);

const marcarPredeterminada = async (c, usuarioId, id) => {
  await c.query("UPDATE direcciones SET predeterminada = 0 WHERE usuario_id = ?", [usuarioId]);
  await c.query("UPDATE direcciones SET predeterminada = 1 WHERE id = ?", [id]);
};

router.use(requiereLogin);

router.get("/", async (req, res) => {
  try {
    const [direcciones] = await db.query("SELECT * FROM direcciones WHERE usuario_id = ? ORDER BY predeterminada DESC, id", [req.usuario.id]);
    res.json({ direcciones });
  } catch (e) {
    responder(res, e, "Error al obtener las direcciones");
  }
});

router.post("/", async (req, res) => {
  try {
    validar(req.body);
    const id = await db.transaccion(async (c) => {
      const [[{ total }]] = await c.query("SELECT COUNT(*) AS total FROM direcciones WHERE usuario_id = ?", [req.usuario.id]);
      const [r] = await c.query(`INSERT INTO direcciones (usuario_id, ${CAMPOS.join(", ")}) VALUES (?, ${CAMPOS.map(() => "?").join(", ")})`, [req.usuario.id, ...valores(req.body)]);
      if (total === 0 || req.body.predeterminada) await marcarPredeterminada(c, req.usuario.id, r.insertId);
      return r.insertId;
    });
    res.json({ id });
  } catch (e) {
    responder(res, e, "Error al guardar la dirección");
  }
});

router.put("/:id", async (req, res) => {
  try {
    if (!/^[1-9]\d*$/.test(String(req.params.id))) throw falla(400, "Identificador de dirección inválido");
    validar(req.body);
    await db.transaccion(async (c) => {
      const [r] = await c.query(`UPDATE direcciones SET ${CAMPOS.map(k => `${k} = ?`).join(", ")} WHERE id = ? AND usuario_id = ?`, [...valores(req.body), req.params.id, req.usuario.id]);
      if (r.affectedRows === 0) throw falla(404, "Dirección no encontrada");
      if (req.body.predeterminada) await marcarPredeterminada(c, req.usuario.id, req.params.id);
    });
    res.json({ mensaje: "Dirección actualizada" });
  } catch (e) {
    responder(res, e, "Error al actualizar la dirección");
  }
});

router.put("/:id/predeterminada", async (req, res) => {
  try {
    if (!/^[1-9]\d*$/.test(String(req.params.id))) throw falla(400, "Identificador de dirección inválido");
    const [[d]] = await db.query("SELECT id FROM direcciones WHERE id = ? AND usuario_id = ?", [req.params.id, req.usuario.id]);
    if (!d) throw falla(404, "Dirección no encontrada");
    await db.transaccion(c => marcarPredeterminada(c, req.usuario.id, d.id));
    res.json({ mensaje: "Dirección predeterminada actualizada" });
  } catch (e) {
    responder(res, e, "Error al actualizar la dirección");
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!/^[1-9]\d*$/.test(String(req.params.id))) throw falla(400, "Identificador de dirección inválido");
    await db.transaccion(async (c) => {
      const [[d]] = await c.query("SELECT predeterminada FROM direcciones WHERE id = ? AND usuario_id = ?", [req.params.id, req.usuario.id]);
      if (!d) throw falla(404, "Dirección no encontrada");
      await c.query("DELETE FROM direcciones WHERE id = ?", [req.params.id]);
      if (d.predeterminada) await c.query("UPDATE direcciones SET predeterminada = 1 WHERE usuario_id = ? ORDER BY id DESC LIMIT 1", [req.usuario.id]);
    });
    res.json({ mensaje: "Dirección eliminada" });
  } catch (e) {
    responder(res, e, "Error al eliminar la dirección");
  }
});

module.exports = router;
