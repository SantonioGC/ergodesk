const { Resend } = require("resend");
const db = require("../db");

const escapar = (valor) => String(valor ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[c]));

const moneda = (valor) => Number(valor || 0).toLocaleString("es-MX", {
  style: "currency",
  currency: "MXN"
});

const numeroOrden = (id) => `ORD-${String(id).padStart(4, "0")}`;

const metodosPago = {
  stripe: "Tarjeta bancaria",
  oxxo: "OXXO"
};

const paqueterias = {
  estafeta: "Estafeta",
  dhl: "DHL"
};

const estadosEnvio = {
  pendiente: "Pendiente",
  en_preparacion: "En preparación",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado"
};

function obtenerDireccion(valor) {
  try {
    const d = typeof valor === "string" ? JSON.parse(valor) : valor;

    if (!d) return "Dirección no disponible";

    return [
      d.destinatario,
      `${d.calle || ""} ${d.num_ext || ""}${d.num_int ? `, Int. ${d.num_int}` : ""}`,
      d.colonia,
      `${d.ciudad || ""}, ${d.estado || ""}`,
      `C.P. ${d.cp || ""}`,
      d.telefono ? `Teléfono: ${d.telefono}` : ""
    ].filter(Boolean).join(", ");
  } catch {
    return "Dirección no disponible";
  }
}

function obtenerImagen(url) {
  if (!url || !/^https?:\/\//i.test(String(url))) return null;
  return escapar(url);
}

async function enviarConfirmacionPedido(ordenId) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { enviado: false, error: "RESEND_API_KEY no está configurada" };
  }

  const [[orden]] = await db.query(
    `SELECT
       o.id, o.total, o.fecha, o.estatus, o.direccion_envio,
       u.nombre, u.email,
       p.metodo, p.correo_estado,
       e.paqueteria, e.guia, e.estatus AS envio_estatus, e.costo_envio
     FROM ordenes o
     JOIN usuarios u ON u.id = o.usuario_id
     JOIN pagos p ON p.orden_id = o.id
     LEFT JOIN envios e ON e.orden_id = o.id
     WHERE o.id = ?`,
    [ordenId]
  );

  if (!orden || orden.estatus !== "pagado") {
    return { enviado: false, error: "El pedido todavía no está pagado" };
  }

  //pa no enviar el mismo correo dos veces
  const [reclamo] = await db.query(
    `UPDATE pagos
     SET correo_estado = 'procesando',
         correo_intento_en = NOW(),
         correo_error = NULL
     WHERE orden_id = ?
       AND (
         correo_estado IN ('pendiente', 'error')
         OR (
           correo_estado = 'procesando'
           AND correo_intento_en < DATE_SUB(NOW(), INTERVAL 10 MINUTE)
         )
       )`,
    [ordenId]
  );

  if (reclamo.affectedRows === 0) {
    const [[estado]] = await db.query(
      "SELECT correo_estado FROM pagos WHERE orden_id = ?",
      [ordenId]
    );

    return {
      enviado: estado?.correo_estado === "enviado",
      en_proceso: estado?.correo_estado === "procesando"
    };
  }

  try {
    const [items] = await db.query(
      `SELECT
         d.nombre, d.cantidad, d.precio_unitario,
         pr.imagen
       FROM detalle_orden d
       LEFT JOIN productos pr ON pr.id = d.producto_id
       WHERE d.orden_id = ?
       ORDER BY d.id`,
      [ordenId]
    );

    const subtotal = items.reduce(
      (total, item) =>
        total + Number(item.precio_unitario) * Number(item.cantidad),
      0
    );

    const envio = Number(orden.costo_envio || 0);
    const total = Number(orden.total);
    const direccion = obtenerDireccion(orden.direccion_envio);
    const folio = numeroOrden(orden.id);

    const metodoPago =
      metodosPago[orden.metodo] || escapar(orden.metodo);

    const paqueteria =
      paqueterias[orden.paqueteria] || escapar(orden.paqueteria);

    const estadoEnvio =
      estadosEnvio[orden.envio_estatus] || "Pendiente";

    const base = (process.env.FRONTEND_URL || "https://localhost")
      .replace(/\/$/, "");

    const urlPedido = `${base}/perfil.html`;

    const filas = items.map((item) => {
      const imagen = obtenerImagen(item.imagen);
      const importe =
        Number(item.precio_unitario) * Number(item.cantidad);

      return `
        <tr>
          <td style="padding:12px 6px;border-bottom:1px solid #e8e8e8;width:65px">
            ${
              imagen
                ? `<img src="${imagen}" alt="${escapar(item.nombre)}"
                     width="58" height="58"
                     style="width:58px;height:58px;object-fit:contain;border-radius:7px">`
                : `<div style="width:58px;height:58px;background:#f1f3f5;border-radius:7px"></div>`
            }
          </td>
          <td style="padding:12px 6px;border-bottom:1px solid #e8e8e8">
            <strong>${escapar(item.nombre)}</strong>
          </td>
          <td style="padding:12px 6px;text-align:center;border-bottom:1px solid #e8e8e8">
            ${Number(item.cantidad)}
          </td>
          <td style="padding:12px 6px;text-align:right;border-bottom:1px solid #e8e8e8;white-space:nowrap">
            ${moneda(importe)}
          </td>
        </tr>
      `;
    }).join("");

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Confirmación de tu orden ${folio}</title>
</head>
<body style="margin:0;padding:25px 10px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#202124">

  <div style="max-width:620px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden">

    <div style="padding:28px 25px 15px;text-align:center">
      <div style="font-size:27px;font-weight:800;letter-spacing:-1px;color:#171717">
        ErgoDesk<span style="color:#64748b"></span>
      </div>
      <div style="font-size:12px;color:#777;margin-top:5px;letter-spacing:2px">
        HECHO EN MEXICO
      </div>
    </div>

    <div style="padding:20px 25px">
      <div style="font-size:12px;color:#777;margin-bottom:12px">
        CONFIRMACIÓN DE COMPRA
      </div>

      <h1 style="font-size:25px;margin:0 0 15px;color:#171717">
        ¡Gracias por tu compra, ${escapar(orden.nombre)}!
      </h1>

      <p style="font-size:15px;line-height:1.6;color:#555;margin:0">
        Recibimos tu orden y la estamos preparando.
        Tu pago ha sido confirmado correctamente.
      </p>

      <div style="margin-top:20px;padding:15px;background:#f5f6f7;border-radius:8px">
        <div style="font-size:12px;color:#777">NÚMERO DE ORDEN</div>
        <div style="font-size:19px;font-weight:bold;margin-top:5px">${folio}</div>
      </div>
    </div>

    <div style="padding:5px 25px 20px">
      <h2 style="font-size:16px;margin-bottom:12px;color:#202124">
        RESUMEN DEL PEDIDO
      </h2>

      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f5f6f7;text-align:left">
            <th style="padding:10px 5px">Foto</th>
            <th style="padding:10px 5px">Producto</th>
            <th style="padding:10px 5px;text-align:center">Cant.</th>
            <th style="padding:10px 5px;text-align:right">Precio</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>

      <div style="margin-top:18px;font-size:14px">
        <div style="display:flex;justify-content:space-between;padding:6px 0">
          <span style="color:#666">Subtotal:</span>
          <strong>${moneda(subtotal)}</strong>
        </div>

        <div style="display:flex;justify-content:space-between;padding:6px 0">
          <span style="color:#666">Envío:</span>
          <strong>${moneda(envio)}</strong>
        </div>

        <div style="display:flex;justify-content:space-between;padding:13px 0;border-top:1px solid #ddd;margin-top:7px;font-size:18px">
          <strong>Total:</strong>
          <strong>${moneda(total)}</strong>
        </div>
      </div>
    </div>

    <div style="padding:20px 25px;background:#f7f8fa">
      <h2 style="font-size:15px;margin:0 0 12px">INFORMACIÓN DE TU COMPRA</h2>

      <p style="font-size:13px;line-height:1.7;margin:5px 0">
        <strong>PAGO:</strong> ${metodoPago} · Aprobado
      </p>

      <p style="font-size:13px;line-height:1.7;margin:5px 0">
        <strong>ENVÍO:</strong> ${paqueteria}
      </p>

      <p style="font-size:13px;line-height:1.7;margin:5px 0">
        <strong>ESTADO:</strong> ${estadoEnvio}
      </p>

      ${
        orden.guia
          ? `<p style="font-size:13px;line-height:1.7;margin:5px 0">
              <strong>NÚMERO DE GUÍA:</strong> ${escapar(orden.guia)}
            </p>`
          : ""
      }

      <p style="font-size:13px;line-height:1.7;margin:15px 0 5px">
        <strong>DIRECCIÓN DE ENTREGA:</strong><br>
        ${escapar(direccion)}
      </p>
    </div>

    <div style="padding:25px;text-align:center">
      <a href="${escapar(urlPedido)}"
         style="display:inline-block;padding:14px 30px;background:#171717;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold">
        Ver mi pedido
      </a>

      <p style="font-size:13px;color:#777;line-height:1.6;margin:25px 0 5px">
        ¿Necesitas ayuda con tu compra?<br>
        Consulta tu pedido desde tu cuenta de ErgoDesk.
      </p>
    </div>

    <div style="padding:20px;text-align:center;background:#f5f6f7">
      <div style="font-size:16px;font-weight:bold;color:#333">ErgoDesk</div>
      <p style="font-size:11px;color:#888;line-height:1.6;margin:8px 0">
        Gracias por confiar en nosotros.<br>
        Este correo confirma la compra realizada en ErgoDesk.
      </p>
    </div>

  </div>
</body>
</html>`;

    const texto = [
      `¡Gracias por tu compra, ${orden.nombre}!`,
      `Orden: ${folio}`,
      "Tu pago fue confirmado y estamos preparando tu pedido.",
      "",
      "RESUMEN DEL PEDIDO",
      ...items.map(item =>
        `${item.nombre} x${item.cantidad}: ${
          moneda(Number(item.precio_unitario) * Number(item.cantidad))
        }`
      ),
      "",
      `Subtotal: ${moneda(subtotal)}`,
      `Envío: ${moneda(envio)}`,
      `Total: ${moneda(total)}`,
      "",
      `Pago: ${metodoPago} - Aprobado`,
      `Envío: ${paqueteria}`,
      `Estado: ${estadoEnvio}`,
      `Dirección: ${direccion}`,
      orden.guia ? `Guía: ${orden.guia}` : "",
      "",
      `Consulta tu pedido: ${urlPedido}`
    ].filter(Boolean).join("\n");

    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM || "onboarding@resend.dev",
      to: orden.email,
      subject: `Confirmación de tu orden #${folio}`,
      html,
      text: texto
    }, {
      idempotencyKey: `ergodesk-pedido-${ordenId}`
    });

    if (error) {
      throw new Error(error.message || "Resend no pudo enviar el correo");
    }

    await db.query(
      `UPDATE pagos
       SET correo_estado = 'enviado',
           correo_enviado_en = NOW(),
           correo_error = NULL
       WHERE orden_id = ?`,
      [ordenId]
    );

    console.log(`Correo de confirmación enviado para ${folio}`);

    return { enviado: true, id: data?.id };

  } catch (error) {
    await db.query(
      `UPDATE pagos
       SET correo_estado = 'error',
           correo_error = ?
       WHERE orden_id = ?`,
      [String(error.message || "Error al enviar correo").slice(0, 2000), ordenId]
    );

    console.error(
      `No se pudo enviar el correo del pedido #${ordenId}:`,
      error.message
    );

    return { enviado: false, error: error.message };
  }
}

module.exports = { enviarConfirmacionPedido };
