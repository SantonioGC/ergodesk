//maneja el carrito y funciones
const Store = (() => {

  //para ver el estado del carrito
  function obtenerCarrito() {
    const data = localStorage.getItem("ergodesk_carrito");
    return data ? JSON.parse(data) : [];
  }

  function guardarCarrito(carrito) {
    localStorage.setItem("ergodesk_carrito", JSON.stringify(carrito));
    actualizarContadorCarrito();
  }

  function agregarAlCarrito(item) {
    //item puede ser un producto directo o una configuracion personalizada
    const carrito = obtenerCarrito();

    //si es un producto simple revisar si ya existe
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

  //actualizar el contador de el carrito
  function actualizarContadorCarrito() {
    const contador = document.getElementById("carrito-contador");
    if (!contador) return;
    const cantidad = cantidadItemsCarrito();
    contador.textContent = cantidad;
    contador.style.display = cantidad > 0 ? "inline" : "none";
  }

  //formato del precio de las cosas
  function formatearPrecio(precio) {
    return precio.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }

  //para buscar los prodcutos
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

  //para exponer todas las funciones e utilizarlas
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
