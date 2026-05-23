//Rutas de productos e inventario
const express = require("express");
const router = express.Router();
const db = require("../db");

//obtener todos los productos
router.get("/", async (req, res) => {
  try {
    const { categoria } = req.query;
    let query = "SELECT * FROM productos";
    const params = [];

    if (categoria && categoria !== "todos") {
      query += " WHERE categoria = ?";
      params.push(categoria);
    }

    const [productos] = await db.query(query, params);
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: "error al obtener productos" });
  }
});

//obtener productos destacados
router.get("/destacados", async (req, res) => {
  try {
    const [productos] = await db.query("SELECT * FROM productos WHERE destacado = 1");
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: "error al obtener destacados" });
  }
});

//obtener un producto por ID
router.get("/:id", async (req, res) => {
  try {
    const [productos] = await db.query("SELECT * FROM productos WHERE id = ?", [req.params.id]);
    if (productos.length === 0) return res.status(404).json({ error: "producto no encontrado" });
    res.json(productos[0]);
  } catch (error) {
    res.status(500).json({ error: "error al obtener el producto" });
  }
});

//buscar productos
router.get("/buscar/:termino", async (req, res) => {
  try {
    const termino = `%${req.params.termino}%`;
    const [productos] = await db.query(
      "SELECT * FROM productos WHERE nombre LIKE ? OR descripcion LIKE ? OR categoria LIKE ?",
      [termino, termino, termino]
    );
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: "error al buscar productos" });
  }
});

module.exports = router;
