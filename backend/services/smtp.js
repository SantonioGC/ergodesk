const nodemailer = require("nodemailer");

function obtenerConfiguracionSMTP(env = process.env) {
  const host = String(env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = Number(env.SMTP_PORT || 465);
  const user = String(env.SMTP_USER || "").trim();
  const pass = String(env.SMTP_PASS || "").replace(/\s+/g, "");

  if (!user || !pass) {
    throw new Error("Configura SMTP_USER y SMTP_PASS en el archivo .env");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) {
    throw new Error("SMTP_USER debe contener una dirección Gmail válida");
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT no contiene un puerto válido");
  }

  const secureValue = String(env.SMTP_SECURE || "").trim().toLowerCase();
  if (secureValue && !["true", "false"].includes(secureValue)) {
    throw new Error("SMTP_SECURE debe ser true o false");
  }

  return {
    host,
    port,
    secure: secureValue ? secureValue === "true" : port === 465,
    user,
    pass
  };
}

function crearTransportadorSMTP(env = process.env) {
  const config = obtenerConfiguracionSMTP(env);

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    tls: {
      minVersion: "TLSv1.2"
    }
  });
}

function obtenerRemitente(env = process.env) {
  const remitente = String(env.SMTP_FROM || "").trim();
  if (remitente) return remitente;

  const usuario = String(env.SMTP_USER || "").trim();
  return `ErgoDesk <${usuario}>`;
}

module.exports = {
  crearTransportadorSMTP,
  obtenerConfiguracionSMTP,
  obtenerRemitente
};
