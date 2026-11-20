//logica del checkout: el progreso y las reservas se guardan en el servidor
const NOMBRES = { estafeta: "Estafeta", dhl: "DHL", stripe: "Tarjeta con Stripe (Sandbox)", oxxo: "OXXO (referencia simulada)" };
const METODOS_PAGO = ["stripe", "oxxo"];

let checkout = null;
let temporizador = null;

document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("ergodesk_token")) {
    location.href = "perfil.html?volver=checkout.html";
    return;
  }

  Store.actualizarContadorCarrito();
  document.getElementById("btn-reintentar").addEventListener("click", () => {
    document.getElementById("resultado").style.display = "none";
    iniciarCheckout();
  });
  const parametros = new URLSearchParams(location.search);
  if (parametros.has("stripe")) {
    manejarRetornoStripe(parametros);
    return;
  }
  iniciarCheckout();

  document.getElementById("btn-paso-1").addEventListener("click", () => {
    if (!checkout.direccion_id) return mostrarError("elige o agrega una direccion de envio");
    irAPaso(2);
  });
  document.getElementById("btn-atras-2").addEventListener("click", () => irAPaso(1));
  document.getElementById("btn-paso-2").addEventListener("click", () => {
    if (!checkout.envio_metodo) return mostrarError("elige un metodo de envio");
    irAPaso(3);
  });
  document.getElementById("btn-atras-3").addEventListener("click", () => irAPaso(2));
  document.getElementById("btn-paso-3").addEventListener("click", () => {
    if (!checkout.pago_metodo) return mostrarError("elige un metodo de pago");
    irAPaso(4);
  });
  document.getElementById("btn-atras-4").addEventListener("click", () => irAPaso(3));

  document.getElementById("btn-pagar-ok").addEventListener("click", pagar);
});

//crea o retoma el checkout y reserva el stock
async function iniciarCheckout() {
  ocultarError();
  const r = await Store.api("/checkout/iniciar", "POST");

  if (!r.ok) return mostrarProblemas(r.error, r.problemas || []);

  checkout = r;
  Direcciones.iniciar(document.getElementById("lista-direcciones"), {
    seleccionada: checkout.direccion_id,
    alElegir: elegirDireccion
  });
  renderizarOpciones();
  iniciarTemporizador();
  mostrarPaso(checkout.paso);
}

//guarda en el servidor lo que el cliente va eligiendo
async function guardar(cambios) {
  const r = await Store.api("/checkout", "PUT", cambios);
  if (!r.ok) return mostrarError(r.error);
  checkout = r;
}

async function elegirDireccion(id) {
  checkout.direccion_id = id;
  if (id) await guardar({ direccion_id: id });
}

async function irAPaso(n) {
  ocultarError();
  await guardar({ paso: n });
  mostrarPaso(n);
}

function mostrarPaso(n) {
  [1, 2, 3, 4].forEach(i => {
    document.getElementById(`paso-${i}`).style.display = i === n ? "block" : "none";
  });
  if (n === 4) renderizarResumen();
}

//opciones de envio y pago
function renderizarOpciones() {
  renderizarRadios("opciones-envio", "envio",
    Object.entries(checkout.envios).map(([valor, costo]) => ({
      valor,
      etiqueta: `${NOMBRES[valor]} — ${Store.formatearPrecio(costo)} (entrega de 1 a 2 semanas)`
    })),
    checkout.envio_metodo,
    (valor) => guardar({ envio_metodo: valor })
  );

  renderizarRadios("opciones-pago", "pago",
    METODOS_PAGO.map(valor => ({ valor, etiqueta: NOMBRES[valor] })),
    checkout.pago_metodo,
    (valor) => guardar({ pago_metodo: valor })
  );
}

function renderizarRadios(contenedorId, nombre, opciones, actual, alElegir) {
  const contenedor = document.getElementById(contenedorId);
  contenedor.innerHTML = "";

  opciones.forEach(({ valor, etiqueta }) => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="radio" name="${nombre}" value="${valor}" ${valor === actual ? "checked" : ""} /> ${etiqueta}`;
    label.querySelector("input").addEventListener("change", () => alElegir(valor));
    contenedor.appendChild(label);
    contenedor.appendChild(document.createElement("br"));
  });
}

function renderizarResumen() {
  document.getElementById("lista-resumen").innerHTML = checkout.items
    .map(i => `<p>${i.nombre} x${i.cantidad} — ${Store.formatearPrecio(i.precio * i.cantidad)}</p>`)
    .join("");
  document.getElementById("resumen-subtotal").textContent = Store.formatearPrecio(checkout.subtotal);
  document.getElementById("resumen-envio").textContent = Store.formatearPrecio(checkout.envio);
  document.getElementById("resumen-total").textContent = Store.formatearPrecio(checkout.total);
  document.getElementById("resumen-pago").textContent = NOMBRES[checkout.pago_metodo];

  const oxxo = checkout.pago_metodo === "oxxo";
  document.getElementById("btn-pagar-ok").textContent = oxxo
    ? "Generar referencia OXXO (simulación)"
    : "Pagar con Stripe (modo de prueba)";
}

//cuenta regresiva de la reserva, al llegar a 0 se intenta reservar de nuevo
function iniciarTemporizador() {
  clearInterval(temporizador);
  const aviso = document.getElementById("aviso-reserva");

  if (checkout.segundos_restantes === null) {
    aviso.textContent = "";
    return;
  }

  let segundos = checkout.segundos_restantes;
  const pintar = () => {
    const mm = String(Math.floor(segundos / 60)).padStart(2, "0");
    const ss = String(segundos % 60).padStart(2, "0");
    aviso.textContent = `Reservamos tus productos por ${mm}:${ss}`;
  };

  pintar();
  temporizador = setInterval(() => {
    segundos--;
    if (segundos <= 0) {
      clearInterval(temporizador);
      aviso.textContent = "tu reserva expiro, reservando de nuevo...";
      iniciarCheckout();
      return;
    }
    pintar();
  }, 1000);
}

// Stripe Checkout redirige a una página segura alojada por Stripe.
async function pagar() {
  const boton = document.getElementById("btn-pagar-ok");
  boton.disabled = true;

  if (checkout.pago_metodo === "stripe") {
    const r = await Store.api("/stripe/crear-sesion", "POST");
    if (!r.ok) {
      boton.disabled = false;
      if (r.problemas) return mostrarProblemas(r.error, r.problemas);
      return mostrarError(r.error || "no se pudo iniciar el pago con Stripe");
    }
    location.href = r.url;
    return;
  }

  if (checkout.pago_metodo === "oxxo") {
    const r = await Store.api("/checkout/pagar", "POST", {});
    boton.disabled = false;
    if (!r.ok) return mostrarError(r.error);
    return mostrarResultado(r);
  }

  boton.disabled = false;
  mostrarError("elige un método de pago válido");
}

async function manejarRetornoStripe(parametros) {
  clearInterval(temporizador);
  [1, 2, 3, 4].forEach(i => { document.getElementById(`paso-${i}`).style.display = "none"; });
  document.getElementById("resultado").style.display = "block";
  document.getElementById("titulo-resultado").textContent = "Verificando tu pago";
  document.getElementById("mensaje-resultado").textContent = "Estamos consultando el estado de tu pago con Stripe.";
  document.getElementById("btn-reintentar").style.display = "none";

  const sessionId = parametros.get("session_id");
  if (!sessionId) {
    document.getElementById("titulo-resultado").textContent = "No encontramos la sesión de pago";
    document.getElementById("mensaje-resultado").textContent = "Vuelve a tu perfil para consultar tus pedidos.";
    return;
  }

  if (parametros.get("stripe") === "cancel") {
    const r = await Store.api("/stripe/cancelar", "POST", { session_id: sessionId });
    if (!r.ok) {
      document.getElementById("titulo-resultado").textContent = "Pago no completado";
      document.getElementById("mensaje-resultado").textContent = r.error || "No se pudo cancelar la sesión.";
      return;
    }
    mostrarResultado({ ...r, estatus: "rechazado" });
    return;
  }

  const r = await Store.api(`/stripe/estado?session_id=${encodeURIComponent(sessionId)}`);
  if (!r.ok) {
    document.getElementById("titulo-resultado").textContent = "No pudimos verificar el pago";
    document.getElementById("mensaje-resultado").textContent = r.error || "Consulta tus pedidos desde tu perfil.";
    return;
  }
  if (r.estatus === "pagado" || r.estatus === "rechazado") {
    mostrarResultado(r);
  } else {
    document.getElementById("titulo-resultado").textContent = "Pago pendiente de confirmación";
    document.getElementById("mensaje-resultado").textContent = `Pedido #${r.orden_id}. Stripe todavía no confirma el pago. Consulta tus pedidos en unos momentos.`;
  }
}

function mostrarResultado(r) {
  clearInterval(temporizador);
  document.getElementById("aviso-reserva").textContent = "";
  [1, 2, 3, 4].forEach(i => { document.getElementById(`paso-${i}`).style.display = "none"; });

  const textos = {
    pagado: ["Pago aprobado", `Tu pedido #${r.orden_id} se esta preparando.`],
    pendiente: ["Pedido pendiente de pago", `Pedido #${r.orden_id}. Paga en OXXO con la referencia ${r.referencia}.`],
    rechazado: ["Pago cancelado", `Pedido #${r.orden_id}. Tus productos están de nuevo en el carrito; puedes intentarlo otra vez.`]
  };

  document.getElementById("titulo-resultado").textContent = textos[r.estatus][0];
  document.getElementById("mensaje-resultado").textContent = textos[r.estatus][1];
  document.getElementById("btn-reintentar").style.display = r.estatus === "rechazado" ? "inline-block" : "none";
  if (r.estatus === "pagado" && r.correo_enviado) {
    document.getElementById("mensaje-resultado").textContent += " Te enviamos la confirmación a tu correo registrado.";
  }
  document.getElementById("resultado").style.display = "block";
  Store.actualizarContadorCarrito();
}

function mostrarProblemas(mensaje, problemas) {
  clearInterval(temporizador);
  document.getElementById("aviso-reserva").textContent = "";
  [1, 2, 3, 4].forEach(i => { document.getElementById(`paso-${i}`).style.display = "none"; });

  document.getElementById("mensaje-problemas").textContent = mensaje;
  document.getElementById("lista-problemas").innerHTML = problemas
    .map(p => `<li>${p.nombre}: ${p.disponible > 0 ? `solo hay ${p.disponible} disponibles` : "agotado por ahora"}</li>`)
    .join("");
  document.getElementById("problemas").style.display = "block";
}

function mostrarError(mensaje) {
  const el = document.getElementById("error-checkout");
  el.textContent = mensaje;
  el.style.display = "block";
}

function ocultarError() {
  document.getElementById("error-checkout").style.display = "none";
}
