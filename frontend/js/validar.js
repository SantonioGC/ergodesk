//filtros y limites compartidos por los formularios (se carga antes que los demas scripts)
const Validar = (() => {
  const FILTROS = {
    digitos: v => v.replace(/\D/g, ""),
    letras: v => v.replace(/[^\p{L}\s.'’-]/gu, ""),
    numero: v => v.replace(/[^A-Za-z0-9/-]/g, ""),
    sinEspacios: v => v.replace(/\s/g, ""),
    decimal: v => {
      const [entero, ...resto] = v.replace(/[^\d.]/g, "").split(".");
      return resto.length ? `${entero}.${resto.join("").slice(0, 2)}` : entero;
    },
    texto: v => v
  };

  const ESTADOS = [
    "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua",
    "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero",
    "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro",
    "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz",
    "Yucatán", "Zacatecas"
  ];

  //limpia lo escrito o pegado y corta al maximo (sin maxlength para que pegar "667 543 2321" funcione)
  function aplicar(input, tipo, max) {
    const filtro = FILTROS[tipo] || FILTROS.texto;
    if (tipo === "texto") input.maxLength = max;
    if (tipo === "digitos") input.inputMode = "numeric";
    if (tipo === "decimal") input.inputMode = "decimal";
    input.addEventListener("input", () => {
      const limpio = filtro(input.value).slice(0, max);
      if (limpio !== input.value) input.value = limpio;
    });
  }

  const normalizar = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const formatearTelefono = (t) => /^\d{10}$/.test(t) ? `${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6)}` : t;

  const escapar = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  //boton para ver u ocultar la contraseña
  function ojo(input) {
    const caja = document.createElement("div");
    caja.className = "campo-password";
    input.parentNode.insertBefore(caja, input);
    caja.appendChild(input);
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "btn-ojo";
    boton.textContent = "Ver";
    boton.setAttribute("aria-label", "Mostrar u ocultar contraseña");
    boton.addEventListener("click", () => {
      const ver = input.type === "password";
      input.type = ver ? "text" : "password";
      boton.textContent = ver ? "Ocultar" : "Ver";
    });
    caja.appendChild(boton);
  }

  //ejecuta una funcion al presionar Enter en los inputs
  function alEnter(ids, fn) {
    ids.forEach(id => document.getElementById(id).addEventListener("keydown", e => { if (e.key === "Enter") fn(); }));
  }

  return { aplicar, ESTADOS, normalizar, formatearTelefono, escapar, ojo, alEnter };
})();
