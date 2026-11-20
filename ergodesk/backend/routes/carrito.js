//carrito persistente para visitantes y usuarios autenticados.
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../db");
const { falla, responder, leerToken, requiereLogin, itemsDeCarrito } = require("../util");
const { calcularConfiguracion } = require("../configurador");

const MAX_CANTIDAD = 99;
const entero = (valor) => (typeof valor === "number" || (typeof valor === "string" && /^\d+$/.test(valor))) && Number.isSafeInteger(Number(valor));

async function buscarCarrito(c, req, crear = false) {
  const usuario = leerToken(req);
  const token = String(req.headers["x-cart-token"] || "");
  if (usuario) {
    const [[carrito]] = await c.query("SELECT id, token FROM carritos WHERE usuario_id = ? FOR UPDATE", [usuario.id]);
    if (carrito || !crear) return carrito || null;
  } else if (token && /^[0-9a-f-]{36}$/i.test(token)) {
    const [[carrito]] = await c.query("SELECT id, token FROM carritos WHERE token = ? FOR UPDATE", [token]);
    if (carrito || !crear) return carrito || null;
  } else if (!crear) {
    return null;
  }

  const nuevoToken = usuario ? null : crypto.randomUUID();
  const [r] = await c.query("INSERT INTO carritos (usuario_id, token) VALUES (?, ?)", [usuario ? usuario.id : null, nuevoToken]);
  return { id: r.insertId, token: nuevoToken };
}

router.get("/", async (req, res) => {
  try {
    const carrito = await buscarCarrito(db, req, false);
    res.json({ items: carrito ? await itemsDeCarrito(db, carrito.id) : [] });
  } catch (e) {
    responder(res, e, "Error al obtener el carrito");
  }
});

router.post("/items", async (req, res) => {
  try {
    const valorCantidad = req.body.cantidad === undefined ? 1 : req.body.cantidad;
    if (!entero(valorCantidad) || Number(valorCantidad) < 1 || Number(valorCantidad) > MAX_CANTIDAD) {
      throw falla(400, `La cantidad debe ser un número entero de 1 a ${MAX_CANTIDAD}.`);
    }
    const cantidad = Number(valorCantidad);

    const resultado = await db.transaccion(async c => {
      const carrito = await buscarCarrito(c, req, true);
      if (req.body.producto_id !== undefined && req.body.producto_id !== null) {
        if (!entero(req.body.producto_id) || Number(req.body.producto_id) < 1) throw falla(400, "El producto seleccionado no es válido");
        const productoId = Number(req.body.producto_id);
        const [[producto]] = await c.query("SELECT id, stock FROM productos WHERE id = ? FOR UPDATE", [productoId]);
        if (!producto) throw falla(404, "Producto no encontrado");
        const [[actual]] = await c.query("SELECT id, cantidad FROM carrito_items WHERE carrito_id = ? AND producto_id = ? FOR UPDATE", [carrito.id, productoId]);
        const nuevaCantidad = Number(actual?.cantidad || 0) + cantidad;
        if (nuevaCantidad > MAX_CANTIDAD) throw falla(400, `Un producto no puede superar ${MAX_CANTIDAD} unidades por carrito`);
        if (nuevaCantidad > producto.stock) throw falla(409, `Solo quedan ${producto.stock} unidades disponibles`);
        if (actual) await c.query("UPDATE carrito_items SET cantidad = ? WHERE id = ?", [nuevaCantidad, actual.id]);
        else await c.query("INSERT INTO carrito_items (carrito_id, producto_id, cantidad) VALUES (?, ?, ?)", [carrito.id, productoId, cantidad]);
      } else {
        const calculada = calcularConfiguracion(req.body.configuracion);
        await c.query(
          "INSERT INTO carrito_items (carrito_id, nombre, precio, imagen, configuracion, cantidad) VALUES (?, ?, ?, NULL, ?, ?)",
          [carrito.id, calculada.nombre, calculada.precio, JSON.stringify(calculada.configuracion), cantidad]
        );
      }
      return { token: carrito.token };
    });
    res.json(resultado);
  } catch (e) {
    responder(res, e, "Error al agregar el producto al carrito");
  }
});

router.put("/items/:id", async (req, res) => {
  try {
    if (!/^[1-9]\d*$/.test(String(req.params.id))) throw falla(400, "El identificador del producto no es válido");
    const valorCantidad = req.body.cantidad;
    if (!entero(valorCantidad) || Number(valorCantidad) < 1 || Number(valorCantidad) > MAX_CANTIDAD) {
      throw falla(400, `La cantidad debe ser un número entero de 1 a ${MAX_CANTIDAD}`);
    }
    const cantidad = Number(valorCantidad);

    await db.transaccion(async c => {
      const carrito = await buscarCarrito(c, req, false);
      if (!carrito) throw falla(404, "No se encontró el carrito");
      const [[item]] = await c.query(
        `SELECT ci.producto_id, p.stock FROM carrito_items ci
         LEFT JOIN productos p ON p.id = ci.producto_id
         WHERE ci.id = ? AND ci.carrito_id = ? FOR UPDATE`,
        [req.params.id, carrito.id]
      );
      if (!item) throw falla(404, "Producto no encontrado en el carrito");
      if (item.producto_id && cantidad > item.stock) throw falla(409, `Solo quedan ${item.stock} unidades disponibles`);
      await c.query("UPDATE carrito_items SET cantidad = ? WHERE id = ?", [cantidad, req.params.id]);
    });
    res.json({ mensaje: "Cantidad actualizada" });
  } catch (e) {
    responder(res, e, "Error al actualizar el carrito");
  }
});

router.delete("/items/:id", async (req, res) => {
  try {
    if (!/^[1-9]\d*$/.test(String(req.params.id))) throw falla(400, "El identificador del producto no es válido");
    const carrito = await buscarCarrito(db, req, false);
    if (carrito) await db.query("DELETE FROM carrito_items WHERE id = ? AND carrito_id = ?", [req.params.id, carrito.id]);
    res.json({ mensaje: "Producto eliminado del carrito" });
  } catch (e) {
    responder(res, e, "Error al eliminar el producto");
  }
});

//fusiona el carrito de invitado sin perder stock o cantidad
router.post("/fusionar", requiereLogin, async (req, res) => {
  try {
    const token = String(req.headers["x-cart-token"] || "");
    if (!/^[0-9a-f-]{36}$/i.test(token)) return res.json({ fusionado: false, motivo: "sin_carrito_invitado" });

    const resultado = await db.transaccion(async c => {
      const [[invitado]] = await c.query("SELECT id FROM carritos WHERE token = ? FOR UPDATE", [token]);
      if (!invitado) return { fusionado: false, motivo: "carrito_no_encontrado" };
      const [[propio]] = await c.query("SELECT id FROM carritos WHERE usuario_id = ? FOR UPDATE", [req.usuario.id]);
      if (!propio) {
        await c.query("UPDATE carritos SET usuario_id = ?, token = NULL WHERE id = ?", [req.usuario.id, invitado.id]);
        return { fusionado: true };
      }

      const [items] = await c.query("SELECT * FROM carrito_items WHERE carrito_id = ? ORDER BY id FOR UPDATE", [invitado.id]);
      for (const item of items) {
        if (!Number.isSafeInteger(Number(item.cantidad)) || Number(item.cantidad) < 1 || Number(item.cantidad) > MAX_CANTIDAD) {
          throw falla(409, "No se pudo fusionar el carrito: una cantidad guardada está fuera del rango de 1 a 99.");
        }
        if (item.producto_id) {
          const [[producto]] = await c.query("SELECT stock FROM productos WHERE id = ? FOR UPDATE", [item.producto_id]);
          if (!producto) continue;
          const [[destino]] = await c.query("SELECT id, cantidad FROM carrito_items WHERE carrito_id = ? AND producto_id = ? FOR UPDATE", [propio.id, item.producto_id]);
          const suma = Number(destino?.cantidad || 0) + Number(item.cantidad);
          if (suma > MAX_CANTIDAD) throw falla(409, `No se pudo fusionar el carrito: el producto ${item.producto_id} superaría ${MAX_CANTIDAD} unidades.`);
          if (suma > producto.stock) throw falla(409, `No se pudo fusionar el carrito: solo hay ${producto.stock} unidades disponibles del producto ${item.producto_id}.`);
          if (destino) await c.query("UPDATE carrito_items SET cantidad = ? WHERE id = ?", [suma, destino.id]);
          else await c.query("INSERT INTO carrito_items (carrito_id, producto_id, cantidad) VALUES (?, ?, ?)", [propio.id, item.producto_id, item.cantidad]);
        } else {
          const calculada = calcularConfiguracion(item.configuracion);
          await c.query(
            "INSERT INTO carrito_items (carrito_id, nombre, precio, imagen, configuracion, cantidad) VALUES (?, ?, ?, NULL, ?, ?)",
            [propio.id, calculada.nombre, calculada.precio, JSON.stringify(calculada.configuracion), item.cantidad]
          );
        }
      }
      await c.query("DELETE FROM carritos WHERE id = ?", [invitado.id]);
      return { fusionado: true };
    });
    res.json(resultado);
  } catch (e) {
    responder(res, e, "Error al fusionar los carritos. El carrito de invitado se conservó");
  }
});

module.exports = router;
