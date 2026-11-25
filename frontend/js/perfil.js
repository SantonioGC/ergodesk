//logica de login, registro y perfil
const API = "/api";

document.addEventListener("DOMContentLoaded", () => {
  Store.actualizarContadorCarrito();
  verificarSesion();
  iniciarTabs();
  iniciarValidacionEnVivo();
  iniciarCamposAuth();

  document.getElementById("btn-login").addEventListener("click", login);
  document.getElementById("btn-registro").addEventListener("click", registro);
  document.getElementById("btn-cerrar-sesion").addEventListener("click", cerrarSesion);
});

//ver en que sesion estas
function verificarSesion() {
  const usuario = obtenerUsuario();
  if (usuario) mostrarPerfil(usuario);
  else mostrarAuth();
}

function obtenerUsuario() {
  const data = localStorage.getItem("ergodesk_usuario");
  return data ? JSON.parse(data) : null;
}

function guardarUsuario(usuario) {
  localStorage.setItem("ergodesk_usuario", JSON.stringify(usuario));
}

function cerrarSesion() {
  localStorage.removeItem("ergodesk_usuario");
  localStorage.removeItem("ergodesk_token");
  mostrarAuth();
  Store.actualizarContadorCarrito();
}

//mostrar el perfil y demas
function mostrarPerfil(usuario) {
  document.getElementById("vista-auth").style.display = "none";
  document.getElementById("vista-perfil").style.display = "block";
  document.getElementById("nombre-usuario").textContent = usuario.nombre;
  document.getElementById("email-usuario").textContent = usuario.email;
  Direcciones.iniciar(document.getElementById("lista-direcciones"));
  cargarPedidos();
  if (usuario.rol === "admin" && !document.getElementById("link-admin")) {
    const a = document.createElement("a");
    a.id = "link-admin"; a.href = "admin.html"; a.textContent = "Panel administrativo";
    document.getElementById("nombre-usuario").parentElement.after(a);
  }
}

function mostrarAuth() {
  document.getElementById("vista-auth").style.display = "block";
  document.getElementById("vista-perfil").style.display = "none";
}

//para mostrar los taps de login , registro etc
function iniciarTabs() {
  document.getElementById("tab-login").addEventListener("click", () => {
    document.getElementById("form-login").style.display = "block";
    document.getElementById("form-registro").style.display = "none";
    document.getElementById("tab-login").classList.add("activo");
    document.getElementById("tab-registro").classList.remove("activo");
  });

  document.getElementById("tab-registro").addEventListener("click", () => {
    document.getElementById("form-registro").style.display = "block";
    document.getElementById("form-login").style.display = "none";
    document.getElementById("tab-registro").classList.add("activo");
    document.getElementById("tab-login").classList.remove("activo");
  });
}

//limites de los campos, ver/ocultar contraseña y Enter para enviar
function iniciarCamposAuth() {
  const $ = (id) => document.getElementById(id);
  Validar.aplicar($("registro-nombre"), "letras", 100);
  ["login-email", "registro-email"].forEach(id => Validar.aplicar($(id), "sinEspacios", 150));
  ["login-password", "registro-password"].forEach(id => {
    Validar.aplicar($(id), "texto", 72);
    Validar.ojo($(id));
  });
  Validar.alEnter(["login-email", "login-password"], login);
  Validar.alEnter(["registro-nombre", "registro-email", "registro-password"], registro);
}

//para validar informazion para el registro
function iniciarValidacionEnVivo() {
  const inputPassword = document.getElementById("registro-password");
  const inputEmail = document.getElementById("registro-email");
  const inputNombre = document.getElementById("registro-nombre");

  inputPassword.addEventListener("input", () => validarPasswordEnVivo(inputPassword.value));
  inputEmail.addEventListener("input", () => validarEmailEnVivo(inputEmail.value));
  inputNombre.addEventListener("input", () => validarNombreEnVivo(inputNombre.value));
}

function validarPasswordEnVivo(password) {
  const cumpleLongitud = password.length >= 8;
  const cumpleMayuscula = /[A-Z]/.test(password);
  const cumpleNumero = /[0-9]/.test(password);

  document.getElementById("req-longitud").style.textDecoration = cumpleLongitud ? "line-through" : "none";
  document.getElementById("req-longitud").style.opacity = cumpleLongitud ? "0.4" : "1";

  document.getElementById("req-mayuscula").style.textDecoration = cumpleMayuscula ? "line-through" : "none";
  document.getElementById("req-mayuscula").style.opacity = cumpleMayuscula ? "0.4" : "1";

  document.getElementById("req-numero").style.textDecoration = cumpleNumero ? "line-through" : "none";
  document.getElementById("req-numero").style.opacity = cumpleNumero ? "0.4" : "1";
}

function validarEmailEnVivo(email) {
  const contenedor = document.getElementById("requisitos-email");
  if (email.length === 0) {
    contenedor.textContent = "";
    return;
  }
  if (!validarEmail(email)) {
    contenedor.textContent = "formato invalido ejemplo@correo.com";
  } else {
    contenedor.textContent = "";
  }
}

function validarNombreEnVivo(nombre) {
  const contenedor = document.getElementById("requisitos-nombre");
  if (nombre.length === 0) {
    contenedor.textContent = "";
    return;
  }
  if (nombre.length < 2) {
    contenedor.textContent = "minimo 2 caracteres";
  } else {
    contenedor.textContent = "";
  }
}

//validacion del email
function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

//para validar informacion de el login
async function login() {
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("error-login");

  errorEl.style.display = "none";

  if (!email || !password) {
    mostrarError(errorEl, "llena todos los campos");
    return;
  }

  if (!validarEmail(email)) {
    mostrarError(errorEl, "ingresa un correo electronico valido.");
    return;
  }

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarError(errorEl, data.error);
      return;
    }

    await Store.iniciarSesion(data.token);
    guardarUsuario({ nombre: data.nombre, email, rol: data.rol });

    if (new URLSearchParams(location.search).get("volver") === "checkout.html") {
      location.href = "checkout.html";
      return;
    }
    mostrarPerfil({ nombre: data.nombre, email });
    Store.actualizarContadorCarrito();

  } catch {
    mostrarError(errorEl, "no se pudo conectar con el servidor.");
  }
}

//para la funcion de regitro y sus requerimientos
async function registro() {
  const nombre = document.getElementById("registro-nombre").value.trim().replace(/\s+/g, " ");
  const email = document.getElementById("registro-email").value.trim().toLowerCase();
  const password = document.getElementById("registro-password").value;
  const errorEl = document.getElementById("error-registro");

  errorEl.style.display = "none";

  if (!nombre || !email || !password) {
    mostrarError(errorEl, "por favor llena todos los campos.");
    return;
  }

  if (nombre.length < 2) {
    mostrarError(errorEl, "El nombre debe tener al menos 2 letras.");
    return;
  }

  if (!validarEmail(email)) {
    mostrarError(errorEl, "ingresa un correo electronico valido.");
    return;
  }

  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    mostrarError(errorEl, "la contraseña no cumple los requisitos.");
    return;
  }

  try {
    const res = await fetch(`${API}/auth/registro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarError(errorEl, data.error);
      return;
    }

    document.getElementById("login-email").value = email;
    document.getElementById("login-password").value = password;
    await login();

  } catch {
    mostrarError(errorEl, "no se pudo conectar con el servidor.");
  }
}

//para mostrar errores si hay de por medio al login o registro
function mostrarError(el, mensaje) {
  el.textContent = mensaje;
  el.style.display = "block";
}

//pedidos del usuario
async function cargarPedidos() {
  const contenedor = document.getElementById("lista-pedidos");
  const r = await Store.api("/pedidos");

  if (!r.ok || r.pedidos.length === 0) {
    contenedor.innerHTML = "<p>Aún no tienes pedidos.</p>";
    return;
  }

  contenedor.innerHTML = r.pedidos.map(p => `
    <div class="pedido">
      <h3>Pedido #${p.id} — ${p.estatus}</h3>
      <p>${new Date(p.fecha).toLocaleString("es-MX")} · ${Store.formatearPrecio(p.total)}</p>
      <ul>${p.items.map(i => `<li>${i.nombre} x${i.cantidad}</li>`).join("")}</ul>
      <p>Pago: ${p.metodo === "stripe" ? "Stripe Checkout (Sandbox)" : "Método anterior"} (${p.pago_estatus})</p>
      <p>Envío: ${p.paqueteria} (${p.envio_estatus})</p>
      ${p.estatus === "pendiente" && p.metodo === "stripe" ? `<p>Esperando confirmación de Stripe.</p>` : ""}
    </div>
  `).join("");
}
