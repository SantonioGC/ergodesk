// server.js — Servidor principal de ErgoDesk

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use("/api/productos", require("./routes/productos"));
app.use("/api/auth",      require("./routes/auth"));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor ErgoDesk corriendo en http://localhost:${PORT}`);
});
