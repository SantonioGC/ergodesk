// El precio final lo calcula backend/configurador.js; el cliente solo envía opciones.
const configuracion = { tamano: null, patas: null, acabado: null, accesorios: [] };

document.addEventListener("DOMContentLoaded", () => {
  Store.actualizarContadorCarrito();
  renderizarOpciones("opciones-tamano", OPCIONES_CONFIGURADOR.tamanos, "tamano");
  renderizarOpciones("opciones-patas", OPCIONES_CONFIGURADOR.patas, "patas");
  renderizarOpciones("opciones-acabado", OPCIONES_CONFIGURADOR.acabados, "acabado");
  renderizarAccesorios();
  actualizarPreview();
  actualizarPrecioEstimado();
  document.getElementById("btn-agregar-carrito").addEventListener("click", agregarAlCarrito);
});

function renderizarOpciones(contenedorId, opciones, propiedad) {
  const contenedor = document.getElementById(contenedorId);
  contenedor.replaceChildren();
  opciones.forEach(opcion => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = opcion.label;
    btn.dataset.valor = opcion.valor;
    btn.className = "btn-opcion";
    btn.addEventListener("click", () => {
      configuracion[propiedad] = opcion;
      contenedor.querySelectorAll(".btn-opcion").forEach(b => b.classList.toggle("activo", b === btn));
      actualizarPreview();
      actualizarPrecioEstimado();
    });
    contenedor.appendChild(btn);
  });
}

function renderizarAccesorios() {
  const contenedor = document.getElementById("opciones-accesorios");
  contenedor.replaceChildren();
  OPCIONES_CONFIGURADOR.accesorios.forEach(opcion => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = opcion.valor;
    checkbox.addEventListener("change", () => {
      configuracion.accesorios = checkbox.checked
        ? [...configuracion.accesorios, opcion]
        : configuracion.accesorios.filter(a => a.valor !== opcion.valor);
      actualizarPreview();
      actualizarPrecioEstimado();
    });
    label.append(checkbox, document.createTextNode(` ${opcion.label} (+${Store.formatearPrecio(opcion.precioExtra)})`));
    contenedor.append(label, document.createElement("br"));
  });
}

function actualizarPreview() {
  document.getElementById("preview-tamano").textContent = `Tamaño: ${configuracion.tamano?.label || "por elegir"}`;
  document.getElementById("preview-patas").textContent = `Patas: ${configuracion.patas?.label || "por elegir"}`;
  document.getElementById("preview-acabado").textContent = `Acabado: ${configuracion.acabado?.label || "por elegir"}`;
  const lista = document.getElementById("preview-accesorios");
  lista.replaceChildren();
  if (!configuracion.accesorios.length) {
    const li = document.createElement("li");
    li.textContent = "Sin accesorios agregados";
    lista.appendChild(li);
  } else {
    configuracion.accesorios.forEach(acc => {
      const li = document.createElement("li");
      li.textContent = acc.label;
      lista.appendChild(li);
    });
  }
}

// Estimado visual; el valor autorizado para el carrito se vuelve a calcular en el servidor.
function actualizarPrecioEstimado() {
  const total = PRECIO_BASE
    + (configuracion.tamano?.precioExtra || 0)
    + (configuracion.patas?.precioExtra || 0)
    + (configuracion.acabado?.precioExtra || 0)
    + configuracion.accesorios.reduce((suma, acc) => suma + acc.precioExtra, 0);
  document.getElementById("precio-total").textContent = Store.formatearPrecio(total);
  return total;
}

async function agregarAlCarrito() {
  if (!configuracion.tamano || !configuracion.patas || !configuracion.acabado) {
    alert("Selecciona el tamaño, las patas y el acabado antes de continuar.");
    return;
  }
  const boton = document.getElementById("btn-agregar-carrito");
  boton.disabled = true;
  const r = await Store.agregarAlCarrito({
    tipo: "configurado",
    cantidad: 1,
    configuracion: {
      tamano_valor: configuracion.tamano.valor,
      patas_valor: configuracion.patas.valor,
      acabado_valor: configuracion.acabado.valor,
      accesorios_valores: configuracion.accesorios.map(a => a.valor)
    }
  });
  boton.disabled = false;
  alert(r.ok ? "Escritorio agregado al carrito." : (r.error || "No se pudo agregar el escritorio."));
}
