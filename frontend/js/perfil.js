//logica de login, registro y perfil
const API = "http://127.0.0.1:3000/api";

document.addEventListener("DOMContentLoaded", () => {
  Store.actualizarContadorCarrito();
  verificarSesion();
  iniciarTabs();
  iniciarValidacionEnVivo();

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
}

//mostrar el perfil y demas
function mostrarPerfil(usuario) {
  document.getElementById("vista-auth").style.display = "none";
  document.getElementById("vista-perfil").style.display = "block";
  document.getElementById("nombre-usuario").textContent = usuario.nombre;
  document.getElementById("email-usuario").textContent = usuario.email;
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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
  const email = document.getElementById("login-email").value.trim();
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

    localStorage.setItem("ergodesk_token", data.token);
    guardarUsuario({ nombre: data.nombre, email });
    mostrarPerfil({ nombre: data.nombre, email });

  } catch {
    mostrarError(errorEl, "no se pudo conectar con el servidor.");
  }
}

//para la funcion de regitro y sus requerimientos
async function registro() {
  const nombre = document.getElementById("registro-nombre").value.trim();
  const email = document.getElementById("registro-email").value.trim();
  const password = document.getElementById("registro-password").value;
  const errorEl = document.getElementById("error-registro");

  errorEl.style.display = "none";

  if (!nombre || !email || !password) {
    mostrarError(errorEl, "por favor llena todos los campos.");
    return;
  }

  if (nombre.length < 2) {
    mostrarError(errorEl, "el nombre debe tener al menos 2 caracteres.");
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
