// Detalle de producto con galería de imágenes recibida desde la API.
const API = "/api";
let productoActual = null;

document.addEventListener("DOMContentLoaded", () => {
  Store.actualizarContadorCarrito();
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id || !/^[1-9]\d*$/.test(id)) return mostrarError("No se especificó un producto válido.");
  cargarProducto(id);
  document.getElementById("btn-agregar-carrito").addEventListener("click", agregarAlCarrito);
});

async function cargarProducto(id) {
  try {
    const res = await fetch(`${API}/productos/${encodeURIComponent(id)}`);
    if (!res.ok) return mostrarError(res.status === 404 ? "Producto no encontrado." : "No se pudo cargar el producto.");
    productoActual = await res.json();
    renderizarProducto(productoActual);
  } catch { mostrarError("No se pudo conectar con el servidor."); }
}

function renderizarProducto(producto) {
  document.title = `${producto.nombre} — ErgoDesk`;
  document.getElementById("nombre-producto").textContent = producto.nombre;
  document.getElementById("precio-producto").textContent = Store.formatearPrecio(producto.precio);
  document.getElementById("descripcion-producto").textContent = producto.descripcion || "";

  const fotos = Array.isArray(producto.imagenes) ? producto.imagenes : (producto.imagen ? [producto.imagen] : []);
  const principal = document.getElementById("foto-principal");
  const miniaturas = document.getElementById("miniaturas");
  miniaturas.replaceChildren();
  if (fotos.length) {
    principal.src = fotos[0];
    principal.alt = `Imagen 1 de ${producto.nombre}`;
    fotos.forEach((url, indice) => {
      const thumb = document.createElement("img");
      thumb.src = url;
      thumb.alt = `Ver imagen ${indice + 1} de ${producto.nombre}`;
      thumb.loading = "lazy";
      thumb.classList.toggle("activa", indice === 0);
      thumb.addEventListener("click", () => {
        principal.src = url;
        principal.alt = `Imagen ${indice + 1} de ${producto.nombre}`;
        miniaturas.querySelectorAll("img").forEach(img => img.classList.toggle("activa", img === thumb));
      });
      miniaturas.appendChild(thumb);
    });
  } else {
    principal.style.display = "none";
    miniaturas.textContent = "Este producto aún no tiene fotografías.";
  }

  const specs = document.getElementById("lista-especificaciones");
  specs.replaceChildren();
  if (producto.materiales) {
    const li = document.createElement("li"); li.textContent = `Materiales: ${producto.materiales}`; specs.appendChild(li);
  }
  const stock = document.createElement("li");
  stock.textContent = `Stock disponible: ${Math.max(0, Number(producto.disponible) || 0)} unidades`;
  specs.appendChild(stock);
  if (Number(producto.disponible) <= 0) document.getElementById("btn-agregar-carrito").disabled = true;
  if (producto.categoria !== "escritorios") document.getElementById("link-configurador").style.display = "none";
}

async function agregarAlCarrito() {
  if (!productoActual) return;
  const boton = document.getElementById("btn-agregar-carrito");
  boton.disabled = true;
  const r = await Store.agregarAlCarrito({ id: productoActual.id, tipo: "producto" });
  boton.disabled = false;
  alert(r.ok ? `${productoActual.nombre} agregado al carrito.` : r.error);
}

function mostrarError(mensaje) {
  const main = document.getElementById("detalle-producto");
  main.replaceChildren();
  const p = document.createElement("p"); p.textContent = mensaje; main.appendChild(p);
}
