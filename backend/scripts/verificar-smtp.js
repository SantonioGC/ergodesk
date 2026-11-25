const { crearTransportadorSMTP } = require("../services/smtp");

async function main() {
  let transporter;

  try {
    transporter = crearTransportadorSMTP();
    await transporter.verify();
    console.log("Conexión con Gmail SMTP correcta. Las credenciales fueron aceptadas.");
  } catch (error) {
    if (error.code === "EAUTH") {
      console.error("Gmail rechazó la autenticación. Revisa SMTP_USER y utiliza una contraseña de aplicación de Google en SMTP_PASS.");
    } else {
      console.error("No se pudo verificar Gmail SMTP:", error.message || error.code || "error desconocido");
    }
    process.exitCode = 1;
  } finally {
    transporter?.close();
  }
}

main();
