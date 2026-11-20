//utilidades compartidas por las rutas
const jwt = require("jsonwebtoken");
const db = require("./db");
const { calcularConfiguracion } = require("./configurador");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("falta JWT_SECRET en las variables de entorno");

const falla = (status, error, extra = {}) => Object.assign(new Error(error), { status, extra });

const responder = (res, e, mensaje) => {
  if (e.status) return res.status(e.status).json({ error: e.message, ...e.extra });
  console.error(e);
  res.status(500).json({ error: mensaje });
};

//devuelve el usuario del token, null si no hay token, y falla si el token no sirve
const leerToken = (req) => {
  const cabecera = req.headers.authorization;
  if (!cabecera) return null;
  try {
    return jwt.verify(cabecera.replace("Bearer ", ""), JWT_SECRET);
  } catch {
    throw falla(401, "sesion expirada, inicia sesion de nuevo");
  }
};

const requiereLogin = (req, res, next) => {
  try {
    req.usuario = leerToken(req);
    if (!req.usuario) throw falla(401, "inicia sesion para continuar");
    next();
  } catch (e) {
    responder(res, e);
  }
};

//solo admins; el rol se lee de la BD (no del token) para que quitarlo surta efecto de inmediato
const requiereAdmin = (req, res, next) => requiereLogin(req, res, async () => {
  try {
    const [[u]] = await db.query("SELECT rol FROM usuarios WHERE id = ?", [req.usuario.id]);
    if (!u || u.rol !== "admin") throw falla(403, "acceso solo para administradores");
    next();
  } catch (e) {
    responder(res, e, "error al validar permisos");
  }
});

//items del carrito con el precio actual de la BD (los productos nunca usan el precio del cliente)
const itemsDeCarrito = async (c, carritoId) => {
  const [items] = await c.query(
    `SELECT ci.id, ci.producto_id, ci.cantidad, ci.configuracion,
            COALESCE(p.nombre, ci.nombre) AS nombre,
            COALESCE(p.precio, ci.precio) AS precio,
            COALESCE(p.imagen, ci.imagen) AS imagen,
            p.stock
     FROM carrito_items ci
     LEFT JOIN productos p ON p.id = ci.producto_id
     WHERE ci.carrito_id = ?
     ORDER BY ci.id`,
    [carritoId]
  );
  return items.map(i => {
    let configuracion = i.configuracion;
    if (typeof configuracion === "string") {
      try { configuracion = JSON.parse(configuracion); } catch { configuracion = null; }
    }
    if (!i.producto_id && configuracion) {
      const calculada = calcularConfiguracion(configuracion);
      return { ...i, nombre: calculada.nombre, precio: calculada.precio, imagen: null, configuracion: calculada.configuracion };
    }
    return { ...i, precio: Number(i.precio), configuracion };
  });
};

module.exports = { falla, responder, leerToken, requiereLogin, requiereAdmin, itemsDeCarrito };
