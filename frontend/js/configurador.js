//logica del configurador
//estado actual de la configuracion
const configuracion = {
  tamano: null,
  patas: null,
  accesorios: []
};

document.addEventListener("DOMContentLoaded", () => {
  Store.actualizarContadorCarrito();
  renderizarTamanos();
  renderizarPatas();
  renderizarAccesorios();
  actualizarPreview();
  actualizarPrecio();

  document.getElementById("btn-agregar-carrito").addEventListener("click", agregarAlCarrito);
});

//renderizado de opciones
function renderizarTamanos() {
  const contenedor = document.getElementById("opciones-tamano");

  OPCIONES_CONFIGURADOR.tamanos.forEach(opcion => {
    const btn = document.createElement("button");
    btn.textContent = opcion.label;
    btn.dataset.valor = opcion.valor;
    btn.classList.add("btn-opcion");

    btn.addEventListener("click", () => {
      configuracion.tamano = opcion;
      document.querySelectorAll("#opciones-tamano .btn-opcion").forEach(b => b.classList.remove("activo"));
      btn.classList.add("activo");
      actualizarPreview();
      actualizarPrecio();
    });

    contenedor.appendChild(btn);
  });
}

function renderizarPatas() {
  const contenedor = document.getElementById("opciones-patas");

  OPCIONES_CONFIGURADOR.patas.forEach(opcion => {
    const btn = document.createElement("button");
    btn.textContent = opcion.label;
    btn.dataset.valor = opcion.valor;
    btn.classList.add("btn-opcion");

    btn.addEventListener("click", () => {
      configuracion.patas = opcion;
      document.querySelectorAll("#opciones-patas .btn-opcion").forEach(b => b.classList.remove("activo"));
      btn.classList.add("activo");
      actualizarPreview();
      actualizarPrecio();
    });

    contenedor.appendChild(btn);
  });
}

function renderizarAccesorios() {
  const contenedor = document.getElementById("opciones-accesorios");

  OPCIONES_CONFIGURADOR.accesorios.forEach(opcion => {
    const label = document.createElement("label");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = opcion.valor;

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        configuracion.accesorios.push(opcion);
      } else {
        configuracion.accesorios = configuracion.accesorios.filter(a => a.valor !== opcion.valor);
      }
      actualizarPreview();
      actualizarPrecio();
    });

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${opcion.label} (+${Store.formatearPrecio(opcion.precioExtra)})`));
    contenedor.appendChild(label);
    contenedor.appendChild(document.createElement("br"));
  });
}

//para ver como se va viendo el escritorio personalizado
function actualizarPreview() {
  const elTamano = document.getElementById("preview-tamano");
  const elPatas = document.getElementById("preview-patas");
  const elAccesorios = document.getElementById("preview-accesorios");

  elTamano.textContent = configuracion.tamano
    ? `Tamaño: ${configuracion.tamano.label}`
    : "Tamaño: por elegir";

  elPatas.textContent = configuracion.patas
    ? `Patas: ${configuracion.patas.label}`
    : "Patas: por elegir";

  elAccesorios.innerHTML = "";
  if (configuracion.accesorios.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Sin accesorios agregados";
    elAccesorios.appendChild(li);
  } else {
    configuracion.accesorios.forEach(acc => {
      const li = document.createElement("li");
      li.textContent = acc.label;
      elAccesorios.appendChild(li);
    });
  }
}

//actualiza el precio del escritorio personalizado
function actualizarPrecio() {
  let total = PRECIO_BASE;

  if (configuracion.tamano) total += configuracion.tamano.precioExtra;
  if (configuracion.patas) total += configuracion.patas.precioExtra;
  configuracion.accesorios.forEach(acc => { total += acc.precioExtra; });

  document.getElementById("precio-total").textContent = Store.formatearPrecio(total);
}

function calcularPrecioActual() {
  let total = PRECIO_BASE;
  if (configuracion.tamano) total += configuracion.tamano.precioExtra;
  if (configuracion.patas) total += configuracion.patas.precioExtra;
  configuracion.accesorios.forEach(acc => { total += acc.precioExtra; });
  return total;
}

//para agregar al carrito y que no falte opciones
function agregarAlCarrito() {
  if (!configuracion.tamano || !configuracion.patas) {
    alert("por favor elige el tamaño y tipo de patas antes de continuar");
    return;
  }

  const item = {
    id: `config_${Date.now()}`,
    tipo: "configurado",
    nombre: `Escritorio ErgoDesk ${configuracion.tamano.label}`,
    precio: calcularPrecioActual(),
    cantidad: 1,
    configuracion: {
      tamano: configuracion.tamano.label,
      patas: configuracion.patas.label,
      accesorios: configuracion.accesorios.map(a => a.label)
    }
  };

  Store.agregarAlCarrito(item);
  alert("Escritorio agregado al carrito");
}
