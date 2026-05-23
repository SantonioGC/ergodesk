// store.js — Estado compartido de ErgoDesk
// Maneja el carrito y funciones que se reutilizan en todas las páginas

const Store = (() => {

  // ─── CARRITO ───────────────────────────────────────────────

  function obtenerCarrito() {
    const data = localStorage.getItem("ergodesk_carrito");
    return data ? JSON.parse(data) : [];
  }

  function guardarCarrito(carrito) {
    localStorage.setItem("ergodesk_carrito", JSON.stringify(carrito));
    actualizarContadorCarrito();
  }

  function agregarAlCarrito(item) {
    // item puede ser un producto directo o una configuración personalizada
    // Estructura esperada: { id, nombre, precio, cantidad, tipo, configuracion? }
    const carrito = obtenerCarrito();

    // Si es un producto simple (no configurado), revisar si ya existe
    if (item.tipo === "producto") {
      const existente = carrito.find(p => p.id === item.id && p.tipo === "producto");
      if (existente) {
        existente.cantidad += 1;
        guardarCarrito(carrito);
        return;
      }
    }

    carrito.push({ ...item, cantidad: item.cantidad || 1 });
    guardarCarrito(carrito);
  }

  function quitarDelCarrito(indice) {
    const carrito = obtenerCarrito();
    carrito.splice(indice, 1);
    guardarCarrito(carrito);
  }

  function cambiarCantidad(indice, nuevaCantidad) {
    const carrito = obtenerCarrito();
    if (nuevaCantidad <= 0) {
      quitarDelCarrito(indice);
      return;
    }
    carrito[indice].cantidad = nuevaCantidad;
    guardarCarrito(carrito);
  }

  function vaciarCarrito() {
    guardarCarrito([]);
  }

  function totalCarrito() {
    const carrito = obtenerCarrito();
    return carrito.reduce((total, item) => total + item.precio * item.cantidad, 0);
  }

  function cantidadItemsCarrito() {
    const carrito = obtenerCarrito();
    return carrito.reduce((total, item) => total + item.cantidad, 0);
  }

  // ─── UI ───────────────────────────────────────────────────

  function actualizarContadorCarrito() {
    const contador = document.getElementById("carrito-contador");
    if (!contador) return;
    const cantidad = cantidadItemsCarrito();
    contador.textContent = cantidad;
    contador.style.display = cantidad > 0 ? "inline" : "none";
  }

  // ─── FORMATO ─────────────────────────────────────────────

  function formatearPrecio(precio) {
    return precio.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }

  // ─── BÚSQUEDA ────────────────────────────────────────────

  function buscarProductos(termino) {
    if (!termino || termino.trim() === "") return PRODUCTOS;
    const t = termino.toLowerCase();
    return PRODUCTOS.filter(p =>
      p.nombre.toLowerCase().includes(t) ||
      p.descripcion.toLowerCase().includes(t) ||
      p.categoria.toLowerCase().includes(t)
    );
  }

  function filtrarPorCategoria(categoria) {
    if (!categoria || categoria === "todos") return PRODUCTOS;
    return PRODUCTOS.filter(p => p.categoria === categoria);
  }

  function obtenerProductoPorId(id) {
    return PRODUCTOS.find(p => p.id === parseInt(id)) || null;
  }

  function obtenerDestacados() {
    return PRODUCTOS.filter(p => p.destacado);
  }

  // ─── EXPOSICIÓN PÚBLICA ───────────────────────────────────

  return {
    obtenerCarrito,
    agregarAlCarrito,
    quitarDelCarrito,
    cambiarCantidad,
    vaciarCarrito,
    totalCarrito,
    cantidadItemsCarrito,
    actualizarContadorCarrito,
    formatearPrecio,
    buscarProductos,
    filtrarPorCategoria,
    obtenerProductoPorId,
    obtenerDestacados
  };

})();
