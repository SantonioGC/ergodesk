// producto.js — Lógica del Detalle de Producto

const API = "http://127.0.0.1:3000/api";

let productoActual = null;

document.addEventListener("DOMContentLoaded", () => {
  Store.actualizarContadorCarrito();

  const id = obtenerIdDeLaUrl();
  if (!id) {
    mostrarError("No se especificó ningún producto.");
    return;
  }

  cargarProducto(id);

  document.getElementById("btn-agregar-carrito").addEventListener("click", agregarAlCarrito);
});

// ─── URL ─────────────────────────────────────────────────────

function obtenerIdDeLaUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// ─── CARGA DESDE API ─────────────────────────────────────────

async function cargarProducto(id) {
  try {
    const res = await fetch(`${API}/productos/${id}`);
    if (!res.ok) {
      mostrarError("Producto no encontrado.");
      return;
    }
    productoActual = await res.json();
    renderizarProducto(productoActual);
  } catch {
    mostrarError("No se pudo cargar el producto.");
  }
}

// ─── RENDERIZADO ─────────────────────────────────────────────

function renderizarProducto(producto) {
  document.title = `${producto.nombre} — ErgoDesk MX`;

  // Foto principal
  const fotoPrincipal = document.getElementById("foto-principal");
  if (producto.imagen) {
    fotoPrincipal.src = producto.imagen;
    fotoPrincipal.alt = producto.nombre;
  } else {
    fotoPrincipal.style.display = "none";
  }

  document.getElementById("nombre-producto").textContent = producto.nombre;
  document.getElementById("precio-producto").textContent = Store.formatearPrecio(producto.precio);
  document.getElementById("descripcion-producto").textContent = producto.descripcion;

  const listaEspecificaciones = document.getElementById("lista-especificaciones");

  if (producto.materiales) {
    const li = document.createElement("li");
    li.textContent = `Materiales: ${producto.materiales}`;
    listaEspecificaciones.appendChild(li);
  }

  const liStock = document.createElement("li");
  liStock.textContent = `Stock disponible: ${producto.stock} unidades`;
  listaEspecificaciones.appendChild(liStock);

  // Botón configurar — solo para escritorios
  const linkConfigurador = document.getElementById("link-configurador");
  if (producto.categoria !== "escritorios") {
    linkConfigurador.style.display = "none";
  }
}

// ─── CARRITO ─────────────────────────────────────────────────

function agregarAlCarrito() {
  if (!productoActual) return;

  Store.agregarAlCarrito({
    id: productoActual.id,
    tipo: "producto",
    nombre: productoActual.nombre,
    precio: parseFloat(productoActual.precio),
    imagen: productoActual.imagen || "",
    cantidad: 1
  });

  alert(`${productoActual.nombre} agregado al carrito.`);
}

// ─── ERROR ───────────────────────────────────────────────────

function mostrarError(mensaje) {
  document.getElementById("detalle-producto").innerHTML = `<p>${mensaje}</p>`;
}
