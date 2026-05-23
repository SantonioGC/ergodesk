// carrito.js — Lógica del Carrito

document.addEventListener("DOMContentLoaded", () => {
  Store.actualizarContadorCarrito();
  renderizarCarrito();
  iniciarOpcionesPago();
});

// ─── RENDERIZADO ─────────────────────────────────────────────

function renderizarCarrito() {
  const carrito = Store.obtenerCarrito();
  const lista = document.getElementById("lista-carrito");
  lista.innerHTML = "";

  if (carrito.length === 0) {
    lista.innerHTML = "<p>Tu carrito está vacío.</p>";
    document.getElementById("resumen-carrito").style.display = "none";
    return;
  }

  document.getElementById("resumen-carrito").style.display = "block";

  carrito.forEach((item, indice) => {
    const div = document.createElement("div");
    div.classList.add("item-carrito");

    let detalleConfiguracion = "";
    if (item.tipo === "configurado" && item.configuracion) {
      const c = item.configuracion;
      const accesorios = c.accesorios.length > 0 ? c.accesorios.join(", ") : "Ninguno";
      detalleConfiguracion = `
        <ul>
          <li>Tamaño: ${c.tamano}</li>
          <li>Patas: ${c.patas}</li>
          <li>Accesorios: ${accesorios}</li>
        </ul>
      `;
    }

    div.innerHTML = `
      ${item.imagen ? `<img src="${item.imagen}" alt="${item.nombre}" />` : ""}
      <h3>${item.nombre}</h3>
      ${detalleConfiguracion}
      <p>${Store.formatearPrecio(item.precio)}</p>
      <div class="controles-cantidad">
        <button data-indice="${indice}" class="btn-restar">-</button>
        <span>${item.cantidad}</span>
        <button data-indice="${indice}" class="btn-sumar">+</button>
      </div>
      <button data-indice="${indice}" class="btn-eliminar">Eliminar</button>
    `;

    lista.appendChild(div);
  });

  actualizarTotal();
  asignarEventosItems();
}

// ─── EVENTOS DE ITEMS ────────────────────────────────────────

function asignarEventosItems() {
  document.querySelectorAll(".btn-sumar").forEach(btn => {
    btn.addEventListener("click", () => {
      const indice = parseInt(btn.dataset.indice);
      const carrito = Store.obtenerCarrito();
      Store.cambiarCantidad(indice, carrito[indice].cantidad + 1);
      renderizarCarrito();
    });
  });

  document.querySelectorAll(".btn-restar").forEach(btn => {
    btn.addEventListener("click", () => {
      const indice = parseInt(btn.dataset.indice);
      const carrito = Store.obtenerCarrito();
      Store.cambiarCantidad(indice, carrito[indice].cantidad - 1);
      renderizarCarrito();
    });
  });

  document.querySelectorAll(".btn-eliminar").forEach(btn => {
    btn.addEventListener("click", () => {
      const indice = parseInt(btn.dataset.indice);
      Store.quitarDelCarrito(indice);
      renderizarCarrito();
    });
  });
}

// ─── TOTAL ───────────────────────────────────────────────────

function actualizarTotal() {
  const total = Store.totalCarrito();
  document.getElementById("total-carrito").textContent = Store.formatearPrecio(total);
  actualizarPagoMensual();
}

// ─── PAGO A MESES ────────────────────────────────────────────

function iniciarOpcionesPago() {
  const radios = document.querySelectorAll("input[name='pago']");
  const selectorMeses = document.getElementById("selector-meses");
  const selectMeses = document.getElementById("num-meses");

  radios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "meses") {
        selectorMeses.style.display = "block";
        actualizarPagoMensual();
      } else {
        selectorMeses.style.display = "none";
      }
    });
  });

  selectMeses.addEventListener("change", actualizarPagoMensual);

  document.getElementById("btn-comprar").addEventListener("click", procederAlPago);
}

function actualizarPagoMensual() {
  const selectorMeses = document.getElementById("selector-meses");
  if (selectorMeses.style.display === "none") return;

  const meses = parseInt(document.getElementById("num-meses").value);
  const total = Store.totalCarrito();
  const pagoMensual = total / meses;

  document.getElementById("pago-mensual").textContent =
    `${Store.formatearPrecio(pagoMensual)} / mes`;
}

// ─── PAGO ────────────────────────────────────────────────────

function procederAlPago() {
  if (Store.obtenerCarrito().length === 0) return;
  // Por ahora solo confirma — aquí se conectaría el flujo de pago
  alert("Gracias por tu compra. Pronto nos pondremos en contacto contigo.");
  Store.vaciarCarrito();
  renderizarCarrito();
}
