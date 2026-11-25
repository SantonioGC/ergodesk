//servidor principal de ergode
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const app = express();

//detras de nginx toma la IP real del cliente (para el limite de intentos)
app.set("trust proxy", 1);
app.use(helmet());
//el frontend y la api comparten origen via nginx, asi que CORS queda cerrado salvo que se configure CORS_ORIGIN
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : false }));
// Stripe necesita recibir el cuerpo original del webhook para verificar su firma.
app.use((req, res, next) => {
  if (req.method === "POST" && req.originalUrl === "/api/stripe/webhook") return next();
  express.json({ limit: "100kb" })(req, res, next);
});

//limite de peticiones por IP (se desactiva en pruebas)
const limite = (limit, mensaje) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { error: mensaje }
});
app.use("/api/auth/login",    limite(10,  "demasiados intentos de inicio de sesion, espera 15 minutos"));
app.use("/api/auth/registro", limite(20,  "demasiados registros desde esta red, intenta mas tarde"));
app.use("/api/",              limite(600, "demasiadas peticiones, intenta mas tarde"));

//rutas
app.use("/api/productos", require("./routes/productos"));
app.use("/api/auth",      require("./routes/auth"));
app.use("/api/carrito",     require("./routes/carrito"));
app.use("/api/direcciones", require("./routes/direcciones"));
app.use("/api/checkout",    require("./routes/checkout"));
app.use("/api/stripe",      require("./routes/stripe"));
app.use("/api/pedidos",     require("./routes/pedidos"));
app.use("/api/admin",       require("./routes/admin"));

const PORT = 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`servidor de ergodesk corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
