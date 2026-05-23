const PRODUCTOS = [
  {
    id: 1,
    nombre: "ErgoDesk Pro 120",
    categoria: "escritorios",
    precio: 5999,
    descripcion: "escritorio ergonomico de 120cm,para trabajo o gaming.",
    materiales: "MDF de alta densidad, estructura de acero",
    especificaciones: {
      largo: 120,
      ancho: 60,
      alto: 75,
      pesoMaximo: 80
    },
    patasDisponibles: ["fijas", "ajustables_manual", "ajustables_electricas"],
    accesorios: ["bandeja_cables", "soporte_monitor_simple", "soporte_monitor_doble", "enchufe_integrado"],
    acabados: ["blanco", "negro", "roble"],
    fotos: ["pro120_1.jpg", "pro120_2.jpg", "pro120_3.jpg"],
    destacado: true
  },
  {
    id: 2,
    nombre: "ErgoDesk Pro 140",
    categoria: "escritorios",
    precio: 7299,
    descripcion: "superficie de 140cm para dual monitor o streaming.",
    materiales: "MDF de alta densidad, estructura de acero",
    especificaciones: {
      largo: 140,
      ancho: 65,
      alto: 75,
      pesoMaximo: 100
    },
    patasDisponibles: ["fijas", "ajustables_manual", "ajustables_electricas"],
    accesorios: ["bandeja_cables", "soporte_monitor_simple", "soporte_monitor_doble", "enchufe_integrado"],
    acabados: ["blanco", "negro", "roble", "carbono"],
    fotos: ["pro140_1.jpg", "pro140_2.jpg"],
    destacado: true
  },
  {
    id: 3,
    nombre: "ErgoDesk Compact 100",
    categoria: "escritorios",
    precio: 4299,
    descripcion: "la opcion mas accesible para espacios pequeños.",
    materiales: "MDF de alta densidad, estructura de acero",
    especificaciones: {
      largo: 100,
      ancho: 55,
      alto: 75,
      pesoMaximo: 60
    },
    patasDisponibles: ["fijas", "ajustables_manual"],
    accesorios: ["bandeja_cables", "soporte_monitor_simple", "enchufe_integrado"],
    acabados: ["blanco", "negro"],
    fotos: ["compact100_1.jpg"],
    destacado: false
  },
  {
    id: 4,
    nombre: "ErgoDesk Max 160",
    categoria: "escritorios",
    precio: 8999,
    descripcion: "el escritorio mas grande para streamers que necesitan espacio.",
    materiales: "MDF premium, estructura de acero reforzado",
    especificaciones: {
      largo: 160,
      ancho: 70,
      alto: 75,
      pesoMaximo: 120
    },
    patasDisponibles: ["ajustables_manual", "ajustables_electricas"],
    accesorios: ["bandeja_cables", "soporte_monitor_simple", "soporte_monitor_doble", "enchufe_integrado"],
    acabados: ["negro", "carbono"],
    fotos: ["max160_1.jpg", "max160_2.jpg"],
    destacado: true
  },

  // Accesorios
  {
    id: 5,
    nombre: "Bandeja organizadora de cables",
    categoria: "accesorios",
    precio: 349,
    descripcion: "Se instala bajo el escritorio para esconder cables.",
    fotos: ["bandeja_1.jpg"],
    destacado: false
  },
  {
    id: 6,
    nombre: "Soporte de monitor simple",
    categoria: "accesorios",
    precio: 599,
    descripcion: "brazo para un monitor de hasta 27 pulgadas.",
    fotos: ["soporte_simple_1.jpg"],
    destacado: false
  },
  {
    id: 7,
    nombre: "Soporte de monitor doble",
    categoria: "accesorios",
    precio: 999,
    descripcion: "brazo para dos monitores de hasta 27 pulgadas.",
    fotos: ["soporte_doble_1.jpg"],
    destacado: true
  },
  {
    id: 8,
    nombre: "Enchufe integrado con USB",
    categoria: "accesorios",
    precio: 449,
    descripcion: "se instala en la superficie y tiene 2 contactos y 2 puertos USB-A.",
    fotos: ["enchufe_1.jpg"],
    destacado: false
  },

  // Combos
  {
    id: 9,
    nombre: "Combo Gamer",
    categoria: "combos",
    precio: 8499,
    descripcion: "ergoDesk pro 140cm negro + soporte doble + bandeja + enchufe USB.",
    incluye: [2, 7, 5, 8],
    fotos: ["combo_gamer_1.jpg"],
    destacado: true
  },
  {
    id: 10,
    nombre: "Combo Home Office",
    categoria: "combos",
    precio: 6799,
    descripcion: "ergoDesk pro 120cm + patas ajustables + soporte simple + bandeja.",
    incluye: [1, 6, 5],
    fotos: ["combo_homeoffice_1.jpg"],
    destacado: true
  }
];

//opciones del configurador
const OPCIONES_CONFIGURADOR = {
  tamanos: [
    { valor: 100, label: "100 cm", precioExtra: 0 },
    { valor: 120, label: "120 cm", precioExtra: 800 },
    { valor: 140, label: "140 cm", precioExtra: 2000 },
    { valor: 160, label: "160 cm", precioExtra: 3500 }
  ],
  patas: [
    { valor: "fijas", label: "Fijas", precioExtra: 0 },
    { valor: "ajustables_manual", label: "Ajustables manual", precioExtra: 700 },
    { valor: "ajustables_electricas", label: "Ajustables eléctricas", precioExtra: 2500 }
  ],
  accesorios: [
    { valor: "bandeja_cables", label: "Bandeja organizadora de cables", precioExtra: 349 },
    { valor: "soporte_monitor_doble", label: "Soporte para 2 monitores", precioExtra: 999 },
    { valor: "soporte_monitor_simple", label: "Soporte para 1 monitor", precioExtra: 599 },
    { valor: "enchufe_integrado", label: "Enchufe con USB integrado", precioExtra: 449 }
  ],
  acabados: [
    { valor: "blanco", label: "Blanco", precioExtra: 0 },
    { valor: "negro", label: "Negro", precioExtra: 0 },
    { valor: "roble", label: "Roble", precioExtra: 300 },
    { valor: "carbono", label: "Carbono", precioExtra: 500 }
  ]
};

const PRECIO_BASE = 3800; //precio base del escritorio antes de configuracion
