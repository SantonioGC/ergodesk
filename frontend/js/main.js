// main.js — Lógica del Home

const API = "http://127.0.0.1:3000/api";

document.addEventListener("DOMContentLoaded", () => {
  Store.actualizarContadorCarrito();
  cargarDestacados();
  iniciarCategorias();
  iniciarBusqueda();
});

// ─── PRODUCTOS ───────────────────────────────────────────────

async function cargarDestacados() {
  try {
    const res = await fetch(`${API}/productos/destacados`);
    const productos = await res.json();
    mostrarProductos(productos);
  } catch {
    mostrarProductos([]);
  }
}

function crearCard(producto) {
  const card = document.createElement("div");
  card.classList.add("card-producto");
  card.innerHTML = `
    ${producto.imagen ? `<img src="${producto.imagen}" alt="${producto.nombre}" />` : ""}
    <h3>${producto.nombre}</h3>
    <p class="descripcion-card">${producto.descripcion}</p>
    <p>${Store.formatearPrecio(producto.precio)}</p>
    <a href="producto.html?id=${producto.id}">
      <button>Ver producto</button>
    </a>
    <button class="btn-card-carrito">Agregar al carrito</button>
  `;

  card.querySelector(".btn-card-carrito").addEventListener("click", () => {
    Store.agregarAlCarrito({
      id: producto.id,
      tipo: "producto",
      nombre: producto.nombre,
      precio: parseFloat(producto.precio),
      imagen: producto.imagen || "",
      cantidad: 1
    });
    alert(`${producto.nombre} agregado al carrito.`);
  });

  return card;
}

function mostrarProductos(productos) {
  const grid = document.getElementById("grid-productos");
  grid.innerHTML = "";

  if (productos.length === 0) {
    grid.innerHTML = "<p>No se encontraron productos.</p>";
    return;
  }

  productos.forEach(producto => grid.appendChild(crearCard(producto)));
}

// ─── CATEGORÍAS ──────────────────────────────────────────────

function iniciarCategorias() {
  const botones = document.querySelectorAll(".btn-categoria");

  botones.forEach(btn => {
    btn.addEventListener("click", async () => {
      botones.forEach(b => b.classList.remove("activo"));
      btn.classList.add("activo");
      ocultarResultadosBusqueda();

      const categoria = btn.dataset.categoria;
      try {
        const url = categoria === "todos"
          ? `${API}/productos`
          : `${API}/productos?categoria=${categoria}`;
        const res = await fetch(url);
        const productos = await res.json();
        mostrarProductos(productos);
      } catch {
        mostrarProductos([]);
      }
    });
  });
}

// ─── BÚSQUEDA ────────────────────────────────────────────────

function iniciarBusqueda() {
  document.getElementById("btn-busqueda").addEventListener("click", ejecutarBusqueda);
  document.getElementById("input-busqueda").addEventListener("keydown", (e) => {
    if (e.key === "Enter") ejecutarBusqueda();
  });
}

async function ejecutarBusqueda() {
  const termino = document.getElementById("input-busqueda").value.trim();

  if (termino === "") {
    ocultarResultadosBusqueda();
    return;
  }

  try {
    const res = await fetch(`${API}/productos/buscar/${encodeURIComponent(termino)}`);
    const productos = await res.json();
    mostrarResultadosBusqueda(productos, termino);
  } catch {
    mostrarResultadosBusqueda([], termino);
  }
}

function mostrarResultadosBusqueda(productos, termino) {
  const seccionResultados = document.getElementById("resultados-busqueda");
  const gridResultados = document.getElementById("grid-resultados");

  document.getElementById("productos-destacados").style.display = "none";
  seccionResultados.style.display = "block";
  gridResultados.innerHTML = "";

  if (productos.length === 0) {
    gridResultados.innerHTML = `<p>No se encontraron resultados para "${termino}".</p>`;
    return;
  }

  productos.forEach(producto => gridResultados.appendChild(crearCard(producto)));
}

function ocultarResultadosBusqueda() {
  document.getElementById("resultados-busqueda").style.display = "none";
  document.getElementById("productos-destacados").style.display = "block";
}
