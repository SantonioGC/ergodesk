//maneja el carrito (guardado en el servidor) y funciones compartidas
const Store = (() => {
  const TOKEN = "ergodesk_token";
  const INVITADO = "ergodesk_cart_token";

  //llamada a la api, manda la sesion o el token de invitado automaticamente
  async function api(ruta, metodo = "GET", cuerpo) {
    const headers = { "Content-Type": "application/json" };
    const token = localStorage.getItem(TOKEN);
    const invitado = localStorage.getItem(INVITADO);
    if (token) headers.Authorization = `Bearer ${token}`;
    if (invitado) headers["X-Cart-Token"] = invitado;

    try {
      const res = await fetch(`/api${ruta}`, { method: metodo, headers, body: cuerpo && JSON.stringify(cuerpo) });
      const data = await res.json().catch(() => ({}));

      //sesion vencida: se limpia y se manda a iniciar sesion
      if (res.status === 401 && token) {
        localStorage.removeItem(TOKEN);
        localStorage.removeItem("ergodesk_usuario");
        location.href = "perfil.html";
      }
      return { ok: res.ok, status: res.status, ...data };
    } catch {
      return { ok: false, error: "no se pudo conectar con el servidor." };
    }
  }

  //al iniciar sesion el carrito de invitado se junta con el de la cuenta
  async function iniciarSesion(token) {
    localStorage.setItem(TOKEN, token);
    const invitado = localStorage.getItem(INVITADO);
    if (!invitado) return { ok: true, fusionado: false };

    const resultado = await api("/carrito/fusionar", "POST");
    // El token se elimina solo cuando el servidor confirma la fusión.
    if (resultado.ok && (resultado.fusionado || resultado.motivo === "carrito_no_encontrado")) {
      localStorage.removeItem(INVITADO);
    }
    return resultado;
  }

  async function obtenerCarrito() {
    const r = await api("/carrito");
    return r.items || [];
  }

  async function agregarAlCarrito(item) {
    //item puede ser un producto directo o una configuracion personalizada
    const cantidad = item.cantidad || 1;
    const cuerpo = item.tipo === "producto"
      ? { producto_id: item.id, cantidad }
      : { configuracion: item.configuracion, cantidad };

    const r = await api("/carrito/items", "POST", cuerpo);
    if (r.ok && r.token) localStorage.setItem(INVITADO, r.token);
    actualizarContadorCarrito();
    return r;
  }

  async function quitarDelCarrito(id) {
    const r = await api(`/carrito/items/${id}`, "DELETE");
    actualizarContadorCarrito();
    return r;
  }

  async function cambiarCantidad(id, nuevaCantidad) {
    if (nuevaCantidad <= 0) return quitarDelCarrito(id);
    const r = await api(`/carrito/items/${id}`, "PUT", { cantidad: nuevaCantidad });
    actualizarContadorCarrito();
    return r;
  }

  function totalCarrito(carrito) {
    return carrito.reduce((total, item) => total + item.precio * item.cantidad, 0);
  }

  //actualizar el contador de el carrito
  async function actualizarContadorCarrito() {
    const contador = document.getElementById("carrito-contador");
    if (!contador) return;
    const carrito = await obtenerCarrito();
    const cantidad = carrito.reduce((total, item) => total + item.cantidad, 0);
    contador.textContent = cantidad;
    contador.style.display = cantidad > 0 ? "inline" : "none";
  }

  //formato del precio de las cosas
  function formatearPrecio(precio) {
    return Number(precio).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }

  //para exponer todas las funciones e utilizarlas
  return {
    api,
    iniciarSesion,
    obtenerCarrito,
    agregarAlCarrito,
    quitarDelCarrito,
    cambiarCantidad,
    totalCarrito,
    actualizarContadorCarrito,
    formatearPrecio
  };

})();
