//servidor principal de ErgoDesk
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

//rutas
app.use("/api/productos", require("./routes/productos"));
app.use("/api/auth",      require("./routes/auth"));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`servidor de ergodesk corriendo en http://localhost:${PORT}`);
});
