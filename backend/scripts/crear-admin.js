//crea un admin, o convierte en admin a un usuario existente con ese correo
const bcrypt = require("bcryptjs");
const db = require("../db");

(async () => {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const nombre = process.env.ADMIN_NOMBRE || "Administrador";
  if (!email || password.length < 8) {
    console.error("define ADMIN_EMAIL y ADMIN_PASSWORD (minimo 8 caracteres)");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  await db.query(
    "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, 'admin') ON DUPLICATE KEY UPDATE rol = 'admin', password = VALUES(password)",
    [nombre, email, hash]
  );
  console.log(`admin listo: ${email}`);
  await db.end();
})().catch(e => { console.error(e.message); process.exit(1); });
