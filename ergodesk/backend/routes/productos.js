//Rutas de productos e inventario
const express = require("express");
const router = express.Router();
const db = require("../db");

//disponible = stock menos lo que otros clientes tienen reservado en checkout
const SELECT_PRODUCTOS = `
  SELECT p.*, c.slug AS categoria, c.nombre AS categoria_nombre,
    CAST(p.stock - COALESCE((SELECT SUM(r.cantidad) FROM reservas_stock r
      WHERE r.producto_id = p.id AND r.expira_en > NOW()), 0) AS SIGNED) AS disponible
  FROM productos p
  JOIN categorias c ON c.id = p.categoria_id`;

const normalizarProducto = producto => {
  let galeria = producto.galeria;
  if (typeof galeria === "string") {
    try { galeria = JSON.parse(galeria); } catch { galeria = []; }
  }
  if (!Array.isArray(galeria)) galeria = [];
  const imagenes = [...new Set([producto.imagen, ...galeria].filter(url => typeof url === "string" && /^https:\/\/\S+$/i.test(url)))];
  return { ...producto, galeria, imagenes };
};

// obtener las categorías
router.get("/categorias", async (req, res) => {
  try {
    const [categorias] = await db.query("SELECT id, slug, nombre FROM categorias ORDER BY id");
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: "error al obtener categorias" });
  }
});

//obtener todos los productos
router.get("/", async (req, res) => {
  try {
    const { categoria } = req.query;
    let query = SELECT_PRODUCTOS;
    const params = [];

    if (categoria && categoria !== "todos") {
      query += " WHERE c.slug = ?";
      params.push(categoria);
    }

    const [productos] = await db.query(query, params);
    res.json(productos.map(normalizarProducto));
  } catch (error) {
    res.status(500).json({ error: "error al obtener productos" });
  }
});

//obtener productos destacados
router.get("/destacados", async (req, res) => {
  try {
    const [productos] = await db.query(`${SELECT_PRODUCTOS} WHERE p.destacado = 1`);
    res.json(productos.map(normalizarProducto));
  } catch (error) {
    res.status(500).json({ error: "error al obtener destacados" });
  }
});

//buscar productos
router.get("/buscar/:termino", async (req, res) => {
  try {
    const texto = String(req.params.termino);
    if (!texto.trim() || texto.length > 100) return res.status(400).json({ error: "La búsqueda debe tener entre 1 y 100 caracteres" });
    const termino = `%${texto}%`;
    const [productos] = await db.query(
      `${SELECT_PRODUCTOS} WHERE p.nombre LIKE ? OR p.descripcion LIKE ? OR c.nombre LIKE ?`,
      [termino, termino, termino]
    );
    res.json(productos.map(normalizarProducto));
  } catch (error) {
    res.status(500).json({ error: "error al buscar productos" });
  }
});

//obtener un producto por ID
router.get("/:id", async (req, res) => {
  try {
    if (!/^[1-9]\d*$/.test(String(req.params.id))) return res.status(400).json({ error: "Identificador de producto inválido" });
    const [productos] = await db.query(`${SELECT_PRODUCTOS} WHERE p.id = ?`, [req.params.id]);
    if (productos.length === 0) return res.status(404).json({ error: "producto no encontrado" });
    res.json(normalizarProducto(productos[0]));
  } catch (error) {
    res.status(500).json({ error: "error al obtener el producto" });
  }
});

module.exports = router;
