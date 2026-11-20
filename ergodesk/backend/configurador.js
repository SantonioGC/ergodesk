//precios y opciones oficiales del configurador
const TAMANOS = {
  "100": { label: "100 cm", extra: 0 },
  "120": { label: "120 cm", extra: 800 },
  "140": { label: "140 cm", extra: 2000 },
  "160": { label: "160 cm", extra: 3500 }
};

const PATAS = {
  fijas: { label: "Fijas", extra: 0 },
  ajustables_manual: { label: "Ajustables manual", extra: 700 },
  ajustables_electricas: { label: "Ajustables eléctricas", extra: 2500 }
};

const ACABADOS = {
  blanco: { label: "Blanco", extra: 0 },
  negro: { label: "Negro", extra: 0 },
  roble: { label: "Roble", extra: 300 },
  carbono: { label: "Carbono", extra: 500 }
};

const ACCESORIOS = {
  bandeja_cables: { label: "Bandeja organizadora de cables", extra: 349 },
  soporte_monitor_doble: { label: "Soporte para 2 monitores", extra: 999 },
  soporte_monitor_simple: { label: "Soporte para 1 monitor", extra: 599 },
  enchufe_integrado: { label: "Enchufe con USB integrado", extra: 449 }
};

const PRECIO_BASE = 3800;
const porEtiqueta = (tabla, valor) => {
  const entrada = Object.entries(tabla).find(([clave, dato]) => clave === String(valor) || dato.label === String(valor));
  return entrada ? { valor: entrada[0], ...entrada[1] } : null;
};

function calcularConfiguracion(entrada) {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    throw Object.assign(new Error("La configuración del escritorio no es válida."), { status: 400 });
  }

  const tamano = porEtiqueta(TAMANOS, entrada.tamano_valor ?? entrada.tamano);
  const patas = porEtiqueta(PATAS, entrada.patas_valor ?? entrada.patas);
  // Las configuraciones antiguas no tenían acabado; se conservan como negro.
  const acabado = porEtiqueta(ACABADOS, entrada.acabado_valor ?? entrada.acabado ?? "negro");
  const listaAccesorios = entrada.accesorios_valores ?? entrada.accesorios ?? [];

  if (!tamano || !patas || !acabado || !Array.isArray(listaAccesorios) || listaAccesorios.length > 4) {
    throw Object.assign(new Error("Selecciona un tamaño, patas, acabado y accesorios válidos."), { status: 400 });
  }

  const accesorios = listaAccesorios.map(valor => porEtiqueta(ACCESORIOS, valor));
  if (accesorios.some(a => !a) || new Set(accesorios.map(a => a.valor)).size !== accesorios.length) {
    throw Object.assign(new Error("Hay accesorios no válidos o repetidos."), { status: 400 });
  }

  const precio = PRECIO_BASE + tamano.extra + patas.extra + acabado.extra + accesorios.reduce((suma, a) => suma + a.extra, 0);
  return {
    nombre: `Escritorio ErgoDesk ${tamano.label}`,
    precio: Math.round(precio * 100) / 100,
    configuracion: {
      tamano: tamano.label,
      tamano_valor: Number(tamano.valor),
      patas: patas.label,
      patas_valor: patas.valor,
      acabado: acabado.label,
      acabado_valor: acabado.valor,
      accesorios: accesorios.map(a => a.label),
      accesorios_valores: accesorios.map(a => a.valor)
    }
  };
}

module.exports = { calcularConfiguracion, PRECIO_BASE };
