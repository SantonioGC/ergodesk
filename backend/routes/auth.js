//modulo de autenticacion
const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//sin valor por defecto si falta JWT_SECRET, util.js detiene el servidor al arrancar
const JWT_SECRET = process.env.JWT_SECRET;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOMBRE = /^\p{L}[\p{L}\s.'’-]*$/u;

//registro
router.post("/registro", async (req, res) => {
  try {
    const nombre = String(req.body.nombre ?? "").trim().replace(/\s+/g, " ");
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "");

    if (!nombre || !email || !password)
      return res.status(400).json({ error: "Todos los campos son obligatorios" });

    if (nombre.length < 2 || nombre.length > 100 || !NOMBRE.test(nombre))
      return res.status(400).json({ error: "El nombre debe tener de 2 a 100 letras, sin números ni símbolos" });

    if (email.length > 150 || !EMAIL.test(email))
      return res.status(400).json({ error: "Ingresa un correo electrónico válido" });

    //bcrypt solo lee los primeros 72 bytes, por eso ese es el maximo
    if (password.length < 8 || Buffer.byteLength(password) > 72 || !/[A-Z]/.test(password) || !/[0-9]/.test(password))
      return res.status(400).json({ error: "La contraseña debe tener de 8 a 72 caracteres, una mayúscula y un número" });

    const [existente] = await db.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (existente.length > 0)
      return res.status(400).json({ error: "Ese correo ya está registrado" });

    const hash = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)", [nombre, email, hash]);

    res.json({ mensaje: "Cuenta creada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al crear la cuenta" });
  }
});

//inicio de sesion
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "");

    if (!email || !password)
      return res.status(400).json({ error: "El correo y la contraseña son obligatorios" });

    const [usuarios] = await db.query("SELECT * FROM usuarios WHERE email = ?", [email]);
    if (usuarios.length === 0)
      return res.status(401).json({ error: "Correo o contraseña incorrectos" });

    const usuario = usuarios[0];
    const passwordCorrecta = await bcrypt.compare(password, usuario.password);
    if (!passwordCorrecta)
      return res.status(401).json({ error: "Correo o contraseña incorrectos" });

    const token = jwt.sign({ id: usuario.id, nombre: usuario.nombre }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, nombre: usuario.nombre, rol: usuario.rol });
  } catch (error) {
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

module.exports = router;
