//panel admin: metricas, catalogo y pedidos
const TOKEN = localStorage.getItem("ergodesk_token");
const $ = (id) => document.getElementById(id);
const dinero = (n) => Number(n).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

//crea un elemento con texto seguro
const el = (tag, texto, attrs = {}) => {
  const e = document.createElement(tag);
  if (texto !== undefined) e.textContent = texto;
  Object.assign(e, attrs);
  return e;
};

async function api(ruta, metodo = "GET", cuerpo) {
  const res = await fetch(`/api/admin${ruta}`, {
    method: metodo,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: cuerpo && JSON.stringify(cuerpo)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "error"), { status: res.status });
  return data;
}

function aviso(msg, enlace) {
  const a = $("admin-aviso");
  a.textContent = msg + " ";
  if (enlace) a.appendChild(el("a", "Ir a iniciar sesión", { href: "perfil.html" }));
  a.style.display = "block";
}

//metricas
async function cargarMetricas() {
  const m = await api("/metricas");
  $("m-ventas").textContent = dinero(m.ventas_totales);
  $("m-ticket").textContent = dinero(m.ticket_promedio);
  $("m-pedidos").textContent = m.pedidos_pagados;
  const ul = $("m-top");
  ul.replaceChildren();
  if (!m.mas_vendidos.length) ul.appendChild(el("li", "Aún no hay ventas"));
  m.mas_vendidos.forEach(p => ul.appendChild(el("li", `${p.nombre} — ${p.unidades} uds.`)));
}

//productos
let categorias = [];

function validarProducto({ nombre, precio, stock }) {
  if (!nombre.trim()) return "Escribe el nombre del producto.";
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(String(precio))) return "El precio admite hasta 8 dígitos enteros y 2 decimales.";
  if (Number(precio) > 99999999) return "El precio es demasiado alto.";
  if (!/^\d+$/.test(stock)) return "El stock debe ser un número entero.";
  if (Number(stock) > 999999) return "El stock es demasiado alto.";
  return null;
}

async function cargarProductos() {
  const productos = await api("/productos");
  const tbody = $("tabla-productos");
  tbody.replaceChildren();
  productos.forEach(p => {
    const tr = el("tr");
    const nombre = el("input", undefined, { value: p.nombre, maxLength: 150 });
    const precio = el("input", undefined, { type: "text", value: p.precio });
    Validar.aplicar(precio, "decimal", 11);
    const stock = el("input", undefined, { type: "text", value: p.stock });
    Validar.aplicar(stock, "digitos", 6);
    const dest = el("input", undefined, { type: "checkbox", checked: !!p.destacado });
    let galeriaGuardada = p.galeria;
    if (typeof galeriaGuardada === "string") {
      try { galeriaGuardada = JSON.parse(galeriaGuardada); } catch { galeriaGuardada = []; }
    }
    if (!Array.isArray(galeriaGuardada)) galeriaGuardada = [];
    const galeria = el("textarea", undefined, { value: galeriaGuardada.join("\n"), rows: 3, maxLength: 3100, placeholder: "Una URL HTTPS por línea" });
    Validar.aplicar(galeria, "texto", 3100);
    galeria.style.minWidth = "240px";
    const guardar = el("button", "Guardar");
    const borrar = el("button", "Eliminar");

    guardar.onclick = async () => {
      const urlsGaleria = galeria.value.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
      const problema = validarProducto({ nombre: nombre.value, precio: precio.value, stock: stock.value })
        || (urlsGaleria.length > 6 ? "La galería acepta máximo 6 fotografías." : null)
        || (urlsGaleria.some(url => !/^https:\/\/\S+$/i.test(url) || url.length > 500) ? "Cada fotografía debe ser una URL HTTPS de máximo 500 caracteres." : null);
      if (problema) return alert(problema);
      try {
        await api(`/productos/${p.id}`, "PUT", {
          nombre: nombre.value, precio: precio.value, stock: stock.value, destacado: dest.checked, galeria: urlsGaleria
        });
        guardar.textContent = "✓ Guardado";
        setTimeout(() => (guardar.textContent = "Guardar"), 1500);
      } catch (e) { alert(e.message); }
    };
    borrar.onclick = async () => {
      if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
      try { await api(`/productos/${p.id}`, "DELETE"); cargarProductos(); } catch (e) { alert(e.message); }
    };

    [el("td", p.id), (() => { const t = el("td"); t.appendChild(nombre); return t; })(),
     (() => { const t = el("td"); t.appendChild(precio); return t; })(),
     (() => { const t = el("td"); t.appendChild(stock); return t; })(),
     (() => { const t = el("td"); t.appendChild(galeria); return t; })(),
     (() => { const t = el("td"); t.appendChild(dest); return t; })(),
     (() => { const t = el("td"); t.append(guardar, borrar); return t; })()
    ].forEach(td => tr.appendChild(td));
    tbody.appendChild(tr);
  });
}

async function cargarCategorias() {
  categorias = await (await fetch("/api/productos/categorias")).json();
  const sel = $("n-categoria");
  sel.replaceChildren();
  categorias.forEach(c => sel.appendChild(el("option", c.nombre, { value: c.id })));
}

Validar.aplicar($("n-nombre"), "texto", 150);
Validar.aplicar($("n-precio"), "decimal", 11);
Validar.aplicar($("n-stock"), "digitos", 6);
Validar.aplicar($("n-imagen"), "sinEspacios", 500);
Validar.aplicar($("n-galeria"), "texto", 3100);

$("btn-crear").onclick = async () => {
  const error = $("n-error");
  const datos = { nombre: $("n-nombre").value.trim(), precio: $("n-precio").value, stock: $("n-stock").value, imagen: $("n-imagen").value };
  const galeria = $("n-galeria").value.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
  const mostrar = (msg) => { error.textContent = msg; error.style.display = "block"; };

  const urls = [datos.imagen, ...galeria].filter(Boolean);
  const problema = validarProducto(datos)
    || (urls.some(url => !/^https:\/\/\S+$/i.test(url) || url.length > 500) ? "Todas las fotografías deben ser URLs HTTPS de máximo 500 caracteres." : null)
    || (galeria.length > 6 ? "La galería acepta máximo 6 fotografías." : null);
  if (problema) return mostrar(problema);

  error.style.display = "none";
  $("btn-crear").disabled = true;
  try {
    await api("/productos", "POST", { ...datos, galeria, categoria_id: $("n-categoria").value, imagen: datos.imagen || null });
    ["n-nombre", "n-precio", "n-stock", "n-imagen", "n-galeria"].forEach(i => ($(i).value = ""));
    cargarProductos();
  } catch (e) { mostrar(e.message); }
  $("btn-crear").disabled = false;
};

//pedidos
const ESTADOS = [["en_preparacion", "En preparación"], ["enviado", "Enviado"], ["entregado", "Entregado"]];

async function cargarPedidos() {
  const pedidos = await api("/pedidos");
  const tbody = $("tabla-pedidos");
  tbody.replaceChildren();
  if (!pedidos.length) {
    const tr = el("tr"); const td = el("td", "Sin pedidos todavía", { colSpan: 8 });
    tr.appendChild(td); tbody.appendChild(tr); return;
  }
  pedidos.forEach(p => {
    const tr = el("tr");
    const pagado = p.estatus === "pagado" && p.pago_estatus === "aprobado";
    const sel = el("select");
    ESTADOS.forEach(([v, t]) => sel.appendChild(el("option", t, { value: v, selected: p.envio_estatus === v })));
    if (!pagado) { sel.appendChild(el("option", p.envio_estatus || "—", { value: "", selected: true })); sel.disabled = true; }
    const guia = el("input", undefined, { value: p.guia || "", maxLength: 40, placeholder: "Guía", disabled: !pagado });
    const btn = el("button", "Actualizar", { disabled: !pagado });
    btn.onclick = async () => {
      try {
        await api(`/pedidos/${p.id}/envio`, "PUT", { estatus: sel.value, guia: guia.value || undefined });
        btn.textContent = "✓";
        setTimeout(() => (btn.textContent = "Actualizar"), 1500);
      } catch (e) { alert(e.message); }
    };
    const celda = (...hijos) => { const t = el("td"); t.append(...hijos); return t; };
    el("td", p.pago_estatus || p.estatus || "—"),
    tr.append(
      el("td", p.id),
      el("td", new Date(p.fecha).toLocaleDateString("es-MX")),
      celda(el("div", p.cliente), el("small", p.email)),
      el("td", dinero(p.total)),
      el("td", p.pago_estatus || p.estatus || "—"),
      celda(sel), celda(guia), celda(btn)
    );
    tbody.appendChild(tr);
  });
}

//tabs y arranque
document.querySelectorAll(".tabs button").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll(".tabs button").forEach(x => x.classList.toggle("activa", x === b));
    ["metricas", "productos", "pedidos"].forEach(t => ($(`tab-${t}`).style.display = t === b.dataset.tab ? "block" : "none"));
    ({ metricas: cargarMetricas, productos: cargarProductos, pedidos: cargarPedidos })[b.dataset.tab]().catch(e => alert(e.message));
  };
});

(async () => {
  if (!TOKEN) return aviso("Inicia sesión como administrador para entrar.", true);
  try {
    await cargarMetricas();
    $("admin-contenido").style.display = "block";
    await cargarCategorias();
  } catch (e) {
    if (e.status === 403) aviso("Tu cuenta no tiene permisos de administrador.");
    else if (e.status === 401) aviso("Tu sesión expiró o no has iniciado sesión.", true);
    else aviso("No se pudo cargar el panel.");
  }
})();
