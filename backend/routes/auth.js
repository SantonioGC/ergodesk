const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "ergodesk_secret";

//registro
router.post("/registro", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password)
      return res.status(400).json({ error: "todos los campos son obligatorios" });

    const [existente] = await db.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (existente.length > 0)
      return res.status(400).json({ error: "el email ya esta registrado" });

    const hash = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)", [nombre, email, hash]);

    res.json({ mensaje: "cuenta creada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "error al crear la cuenta" });
  }
});

//inicio de sesion
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "email y contraseña son obligatorios" });

    const [usuarios] = await db.query("SELECT * FROM usuarios WHERE email = ?", [email]);
    if (usuarios.length === 0)
      return res.status(401).json({ error: "email o contraseña incorrectos" });

    const usuario = usuarios[0];
    const passwordCorrecta = await bcrypt.compare(password, usuario.password);
    if (!passwordCorrecta)
      return res.status(401).json({ error: "email o contraseña incorrectos." });

    const token = jwt.sign({ id: usuario.id, nombre: usuario.nombre }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, nombre: usuario.nombre });
  } catch (error) {
    res.status(500).json({ error: "error al iniciar sesion" });
  }
});

module.exports = router;
