//lista y formulario de direcciones (se usa en perfil y en checkout)
const Direcciones = (() => {
  //[campo, etiqueta, tipo de filtro, maximo, autocomplete]
  const CAMPOS = [
    ["alias", "Alias (Casa, Oficina)", "texto", 50, "off"],
    ["destinatario", "Nombre de quien recibe", "letras", 100, "name"],
    ["telefono", "Teléfono (10 dígitos)", "digitos", 10, "tel-national"],
    ["calle", "Calle", "texto", 150, "address-line1"],
    ["num_ext", "Núm. exterior", "numero", 10, "off"],
    ["num_int", "Núm. interior (opcional)", "numero", 10, "off"],
    ["colonia", "Colonia", "texto", 100, "off"],
    ["ciudad", "Ciudad", "letras", 60, "address-level2"],
    ["estado", "Estado", "estado", 60, "address-level1"],
    ["cp", "Código postal (5 dígitos)", "digitos", 5, "postal-code"],
    ["referencias", "Referencias (opcional)", "texto", 255, "off"]
  ];
  const OPCIONALES = ["num_int", "referencias"];
  const nombreCampo = (etiqueta) => etiqueta.replace(/\s*\(.*\)/, "").toLowerCase();

  let contenedor;
  let opciones;
  let lista = [];

  //opciones.alElegir(id) activa los radios para elegir direccion (checkout)
  async function iniciar(el, ops = {}) {
    contenedor = el;
    opciones = ops;
    await recargar();
  }

  async function recargar() {
    const r = await Store.api("/direcciones");
    lista = r.direcciones || [];

    if (opciones.alElegir && !lista.some(d => d.id === opciones.seleccionada)) {
      const defecto = lista.find(d => d.predeterminada) || lista[0];
      opciones.seleccionada = defecto ? defecto.id : null;
      opciones.alElegir(opciones.seleccionada);
    }
    mostrarLista();
  }

  function mostrarLista() {
    contenedor.innerHTML = "";
    if (lista.length === 0) contenedor.innerHTML = "<p>Aún no tienes direcciones guardadas.</p>";
    lista.forEach(d => contenedor.appendChild(crearTarjeta(d)));

    const btnAgregar = document.createElement("button");
    btnAgregar.textContent = "Agregar dirección";
    btnAgregar.addEventListener("click", () => mostrarFormulario(null));
    contenedor.appendChild(btnAgregar);
  }

  function crearTarjeta(d) {
    const e = Validar.escapar;
    const div = document.createElement("div");
    div.classList.add("direccion");
    div.innerHTML = `
      ${opciones.alElegir ? `<input type="radio" name="direccion" ${d.id === opciones.seleccionada ? "checked" : ""} />` : ""}
      <strong>${e(d.alias)}</strong>${d.predeterminada ? " (predeterminada)" : ""}
      <p>${e(d.destinatario)} · ${e(Validar.formatearTelefono(d.telefono))}</p>
      <p>${e(d.calle)} ${e(d.num_ext)}${d.num_int ? " int. " + e(d.num_int) : ""}, ${e(d.colonia)}, ${e(d.ciudad)}, ${e(d.estado)}, CP ${e(d.cp)}</p>
      ${d.referencias ? `<p>${e(d.referencias)}</p>` : ""}
      <button class="btn-dir-editar">Editar</button>
      <button class="btn-dir-eliminar">Eliminar</button>
      ${d.predeterminada ? "" : `<button class="btn-dir-defecto">Hacer predeterminada</button>`}
    `;

    const radio = div.querySelector("input[type=radio]");
    if (radio) radio.addEventListener("change", () => {
      opciones.seleccionada = d.id;
      opciones.alElegir(d.id);
    });

    div.querySelector(".btn-dir-editar").addEventListener("click", () => mostrarFormulario(d));

    div.querySelector(".btn-dir-eliminar").addEventListener("click", async () => {
      if (!confirm("¿Eliminar esta dirección?")) return;
      await Store.api(`/direcciones/${d.id}`, "DELETE");
      recargar();
    });

    const btnDefecto = div.querySelector(".btn-dir-defecto");
    if (btnDefecto) btnDefecto.addEventListener("click", async () => {
      await Store.api(`/direcciones/${d.id}/predeterminada`, "PUT");
      recargar();
    });

    return div;
  }

  const campoHtml = ([campo, etiqueta, tipo]) => tipo === "estado"
    ? `<label>${etiqueta}<select data-campo="${campo}"><option value="">Selecciona un estado</option>${Validar.ESTADOS.map(s => `<option value="${s}">${s}</option>`).join("")}</select></label>`
    : `<label>${etiqueta}<input data-campo="${campo}" />${campo === "referencias" ? '<small class="contador"></small>' : ""}</label>`;

  //devuelve el texto del primer error, o null si todo esta bien
  function validar(datos) {
    for (const [campo, etiqueta] of CAMPOS) {
      if (!OPCIONALES.includes(campo) && !datos[campo]) return `Falta el campo: ${nombreCampo(etiqueta)}.`;
    }
    if (!/^\d{10}$/.test(datos.telefono)) return "El teléfono debe tener 10 dígitos.";
    if (!/^\d{5}$/.test(datos.cp)) return "El código postal debe tener 5 dígitos.";
    return null;
  }

  function mostrarFormulario(d) {
    contenedor.innerHTML = `
      <div class="form-direccion">
        <p class="error-direccion" style="display:none;"></p>
        ${CAMPOS.map(campoHtml).join("")}
        <label><input type="checkbox" data-campo="predeterminada" /> Usar como predeterminada</label>
        <button class="btn-dir-guardar">Guardar</button>
        <button class="btn-dir-cancelar">Cancelar</button>
      </div>
    `;

    const campo = (nombre) => contenedor.querySelector(`[data-campo="${nombre}"]`);

    CAMPOS.forEach(([nombre, , tipo, max, auto]) => {
      const el = campo(nombre);
      el.autocomplete = auto;
      if (tipo !== "estado") Validar.aplicar(el, tipo, max);
    });

    const contador = contenedor.querySelector(".contador");
    const actualizarContador = () => { contador.textContent = `${campo("referencias").value.length}/255`; };
    campo("referencias").addEventListener("input", actualizarContador);

    if (d) {
      CAMPOS.forEach(([nombre, , tipo]) => {
        if (tipo !== "estado") campo(nombre).value = d[nombre] || "";
      });
      //el estado guardado puede venir con otra escritura (ej. "sinaloa"), se busca sin importar mayusculas ni acentos
      const select = campo("estado");
      const opcion = [...select.options].find(o => Validar.normalizar(o.value) === Validar.normalizar(d.estado));
      if (opcion) select.value = opcion.value;
      else if (d.estado) { select.add(new Option(d.estado, d.estado)); select.value = d.estado; }
      campo("predeterminada").checked = !!d.predeterminada;
    }
    actualizarContador();

    contenedor.querySelector(".btn-dir-cancelar").addEventListener("click", mostrarLista);

    const btnGuardar = contenedor.querySelector(".btn-dir-guardar");
    const error = contenedor.querySelector(".error-direccion");
    const mostrarError = (msg) => { error.textContent = msg; error.style.display = "block"; };

    btnGuardar.addEventListener("click", async () => {
      const datos = { predeterminada: campo("predeterminada").checked };
      CAMPOS.forEach(([nombre]) => { datos[nombre] = campo(nombre).value.trim().replace(/\s+/g, " "); });

      const problema = validar(datos);
      if (problema) return mostrarError(problema);

      //se bloquea el boton para que un doble clic no guarde la direccion dos veces
      btnGuardar.disabled = true;
      error.style.display = "none";

      const r = d
        ? await Store.api(`/direcciones/${d.id}`, "PUT", datos)
        : await Store.api("/direcciones", "POST", datos);

      if (!r.ok) {
        btnGuardar.disabled = false;
        return mostrarError(r.error);
      }

      //la direccion nueva queda elegida en el checkout
      if (!d && opciones.alElegir) {
        opciones.seleccionada = r.id;
        opciones.alElegir(r.id);
      }
      recargar();
    });
  }

  return { iniciar };
})();
