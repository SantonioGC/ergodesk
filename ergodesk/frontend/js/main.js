// Lógica del catálogo y búsqueda.
const API = "/api";

document.addEventListener("DOMContentLoaded", () => {
  Store.actualizarContadorCarrito();
  cargarDestacados();
  iniciarCategorias();
  iniciarBusqueda();
});

async function cargarDestacados() {
  try {
    const res = await fetch(`${API}/productos/destacados`);
    if (!res.ok) throw new Error("No se pudo cargar el catálogo.");
    mostrarProductos(await res.json());
  } catch { mostrarProductos([]); }
}

function crearCard(producto) {
  const card = document.createElement("article");
  card.className = "card-producto";
  const fotos = Array.isArray(producto.imagenes) ? producto.imagenes : [producto.imagen].filter(Boolean);
  if (fotos[0] && /^https:\/\//i.test(fotos[0])) {
    const img = document.createElement("img"); img.src = fotos[0]; img.alt = producto.nombre; img.loading = "lazy"; card.appendChild(img);
  }
  const titulo = document.createElement("h3"); titulo.textContent = producto.nombre;
  const descripcion = document.createElement("p"); descripcion.className = "descripcion-card"; descripcion.textContent = producto.descripcion || "";
  const precio = document.createElement("p"); precio.textContent = Store.formatearPrecio(producto.precio);
  const enlace = document.createElement("a"); enlace.href = `producto.html?id=${encodeURIComponent(producto.id)}`;
  const ver = document.createElement("button"); ver.type = "button"; ver.textContent = "Ver producto"; enlace.appendChild(ver);
  const agregar = document.createElement("button"); agregar.type = "button"; agregar.className = "btn-card-carrito"; agregar.textContent = "Agregar al carrito";
  agregar.disabled = Number(producto.disponible) <= 0;
  agregar.addEventListener("click", async () => {
    agregar.disabled = true;
    const r = await Store.agregarAlCarrito({ id: producto.id, tipo: "producto" });
    agregar.disabled = false;
    alert(r.ok ? `${producto.nombre} agregado al carrito.` : r.error);
  });
  card.append(titulo, descripcion, precio, enlace, agregar);
  return card;
}

function mostrarProductos(productos) {
  const grid = document.getElementById("grid-productos");
  grid.replaceChildren();
  if (!Array.isArray(productos) || productos.length === 0) {
    const p = document.createElement("p"); p.textContent = "No se encontraron productos."; grid.appendChild(p); return;
  }
  productos.forEach(producto => grid.appendChild(crearCard(producto)));
}

function iniciarCategorias() {
  const botones = document.querySelectorAll(".btn-categoria");
  botones.forEach(btn => btn.addEventListener("click", async () => {
    botones.forEach(b => b.classList.toggle("activo", b === btn));
    ocultarResultadosBusqueda();
    const categoria = btn.dataset.categoria;
    try {
      const url = categoria === "todos" ? `${API}/productos` : `${API}/productos?categoria=${encodeURIComponent(categoria)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("No se pudo cargar la categoría.");
      mostrarProductos(await res.json());
    } catch { mostrarProductos([]); }
  }));
}

function iniciarBusqueda() {
  document.getElementById("btn-busqueda").addEventListener("click", ejecutarBusqueda);
  document.getElementById("input-busqueda").addEventListener("keydown", e => { if (e.key === "Enter") ejecutarBusqueda(); });
}

async function ejecutarBusqueda() {
  const termino = document.getElementById("input-busqueda").value.trim().slice(0, 100);
  if (!termino) { ocultarResultadosBusqueda(); return; }
  try {
    const res = await fetch(`${API}/productos/buscar/${encodeURIComponent(termino)}`);
    if (!res.ok) throw new Error("No se pudo realizar la búsqueda.");
    mostrarResultadosBusqueda(await res.json(), termino);
  } catch { mostrarResultadosBusqueda([], termino); }
}

function mostrarResultadosBusqueda(productos, termino) {
  const seccion = document.getElementById("resultados-busqueda");
  const grid = document.getElementById("grid-resultados");
  document.getElementById("productos-destacados").style.display = "none";
  seccion.style.display = "block";
  grid.replaceChildren();
  if (!productos.length) {
    const p = document.createElement("p"); p.textContent = `No se encontraron resultados para "${termino}".`; grid.appendChild(p); return;
  }
  productos.forEach(producto => grid.appendChild(crearCard(producto)));
}

function ocultarResultadosBusqueda() {
  document.getElementById("resultados-busqueda").style.display = "none";
  document.getElementById("productos-destacados").style.display = "block";
}
