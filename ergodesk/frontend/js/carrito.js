// Lógica del carrito, con renderizado seguro de datos variables.
let carrito = [];

document.addEventListener("DOMContentLoaded", () => {
  Store.actualizarContadorCarrito();
  renderizarCarrito();
  document.getElementById("btn-comprar").addEventListener("click", procederAlPago);
});

async function renderizarCarrito() {
  carrito = await Store.obtenerCarrito();
  const lista = document.getElementById("lista-carrito");
  lista.replaceChildren();
  if (!carrito.length) {
    const p = document.createElement("p"); p.textContent = "Tu carrito está vacío."; lista.appendChild(p);
    document.getElementById("resumen-carrito").style.display = "none";
    return;
  }
  document.getElementById("resumen-carrito").style.display = "block";
  carrito.forEach(item => {
    const div = document.createElement("article"); div.className = "item-carrito";
    if (item.imagen && /^https:\/\//i.test(item.imagen)) {
      const img = document.createElement("img"); img.src = item.imagen; img.alt = item.nombre; img.loading = "lazy"; div.appendChild(img);
    }
    const titulo = document.createElement("h3"); titulo.textContent = item.nombre; div.appendChild(titulo);
    if (item.configuracion) {
      const listaConfig = document.createElement("ul");
      [["Tamaño", item.configuracion.tamano], ["Patas", item.configuracion.patas], ["Acabado", item.configuracion.acabado], ["Accesorios", (item.configuracion.accesorios || []).join(", ") || "Ninguno"]]
        .filter(([, valor]) => valor)
        .forEach(([label, valor]) => { const li = document.createElement("li"); li.textContent = `${label}: ${valor}`; listaConfig.appendChild(li); });
      div.appendChild(listaConfig);
    }
    const precio = document.createElement("p"); precio.textContent = Store.formatearPrecio(item.precio); div.appendChild(precio);
    if (item.stock !== null && item.stock !== undefined && item.cantidad > item.stock) {
      const stock = document.createElement("p"); stock.className = "aviso-stock"; stock.textContent = `Solo quedan ${item.stock} unidades; ajusta la cantidad.`; div.appendChild(stock);
    }
    const controles = document.createElement("div"); controles.className = "controles-cantidad";
    const restar = crearBoton("−", "btn-restar", item.id);
    const cantidad = document.createElement("span"); cantidad.textContent = item.cantidad;
    const maximo = item.stock !== null && item.stock !== undefined ? Math.min(item.stock, 99) : 99;
    const sumar = crearBoton("+", "btn-sumar", item.id); sumar.disabled = item.cantidad >= maximo;
    controles.append(restar, cantidad, sumar); div.appendChild(controles);
    div.appendChild(crearBoton("Eliminar", "btn-eliminar", item.id));
    lista.appendChild(div);
  });
  actualizarTotal();
  asignarEventosItems();
}

function crearBoton(texto, clase, id) {
  const b = document.createElement("button"); b.type = "button"; b.textContent = texto; b.className = clase; b.dataset.id = id; return b;
}
function asignarEventosItems() {
  const buscar = btn => carrito.find(i => i.id === Number(btn.dataset.id));
  document.querySelectorAll(".btn-sumar").forEach(btn => btn.addEventListener("click", async () => {
    const item = buscar(btn); if (!item) return;
    const r = await Store.cambiarCantidad(item.id, Number(item.cantidad) + 1);
    if (!r.ok) alert(r.error); await renderizarCarrito();
  }));
  document.querySelectorAll(".btn-restar").forEach(btn => btn.addEventListener("click", async () => {
    const item = buscar(btn); if (!item) return;
    const r = await Store.cambiarCantidad(item.id, Number(item.cantidad) - 1);
    if (!r.ok) alert(r.error); await renderizarCarrito();
  }));
  document.querySelectorAll(".btn-eliminar").forEach(btn => btn.addEventListener("click", async () => {
    const item = buscar(btn); if (!item) return;
    const r = await Store.quitarDelCarrito(item.id);
    if (!r.ok) alert(r.error); await renderizarCarrito();
  }));
}
function actualizarTotal() {
  document.getElementById("total-carrito").textContent = Store.formatearPrecio(Store.totalCarrito(carrito));
}
function procederAlPago() {
  if (!carrito.length) return;
  location.href = localStorage.getItem("ergodesk_token") ? "checkout.html" : "perfil.html?volver=checkout.html";
}
