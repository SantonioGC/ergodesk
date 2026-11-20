CREATE TABLE categorias
(
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(80) NOT NULL
);

INSERT INTO categorias (slug, nombre) VALUES
('escritorios', 'Escritorios'),
('accesorios', 'Accesorios'),
('combos', 'Combos');

CREATE TABLE usuarios
(
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('cliente', 'admin') NOT NULL DEFAULT 'cliente',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE direcciones
(
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  alias VARCHAR(50) NOT NULL,
  destinatario VARCHAR(100) NOT NULL,
  telefono VARCHAR(15) NOT NULL,
  calle VARCHAR(150) NOT NULL,
  num_ext VARCHAR(10) NOT NULL,
  num_int VARCHAR(10),
  colonia VARCHAR(100) NOT NULL,
  ciudad VARCHAR(60) NOT NULL,
  estado VARCHAR(60) NOT NULL,
  cp CHAR(5) NOT NULL,
  referencias VARCHAR(255),
  predeterminada TINYINT(1) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE productos
(
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  categoria_id INT NOT NULL,
  precio DECIMAL(10, 2) NOT NULL,
  descripcion TEXT,
  materiales VARCHAR(255),
  stock INT NOT NULL DEFAULT 0,
  destacado TINYINT(1) DEFAULT 0,
  imagen VARCHAR(500),
  galeria JSON NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  CONSTRAINT chk_stock CHECK (stock >= 0)
);

CREATE TABLE carritos
(
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL UNIQUE,
  token CHAR(36) NULL UNIQUE,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE carrito_items
(
  id INT AUTO_INCREMENT PRIMARY KEY,
  carrito_id INT NOT NULL,
  producto_id INT NULL,
  nombre VARCHAR(150),
  precio DECIMAL(10, 2),
  imagen VARCHAR(500),
  configuracion JSON,
  cantidad INT NOT NULL,
  UNIQUE KEY uq_carrito_producto (carrito_id, producto_id),
  FOREIGN KEY (carrito_id) REFERENCES carritos(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  CONSTRAINT chk_cantidad CHECK (cantidad > 0)
);

CREATE TABLE checkout_sesiones
(
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL UNIQUE,
  direccion_id INT NULL,
  envio_metodo VARCHAR(20),
  pago_metodo VARCHAR(20),
  paso TINYINT NOT NULL DEFAULT 1,
  stripe_orden_id INT NULL,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (direccion_id) REFERENCES direcciones(id) ON DELETE SET NULL
);

CREATE TABLE reservas_stock
(
  id INT AUTO_INCREMENT PRIMARY KEY,
  checkout_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  expira_en TIMESTAMP NOT NULL,
  UNIQUE KEY uq_reserva (checkout_id, producto_id),
  FOREIGN KEY (checkout_id) REFERENCES checkout_sesiones(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE TABLE ordenes
(
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  direccion_id INT NULL,
  direccion_envio JSON NOT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total DECIMAL(10, 2) NOT NULL,
  estatus VARCHAR(20) NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (direccion_id) REFERENCES direcciones(id) ON DELETE SET NULL
);

CREATE TABLE detalle_orden
(
  id INT AUTO_INCREMENT PRIMARY KEY,
  orden_id INT NOT NULL,
  producto_id INT NULL,
  nombre VARCHAR(150) NOT NULL,
  configuracion JSON,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
);

CREATE TABLE pagos
(
  id INT AUTO_INCREMENT PRIMARY KEY,
  orden_id INT NOT NULL,
  metodo VARCHAR(20) NOT NULL,
  monto DECIMAL(10, 2) NOT NULL,
  estatus VARCHAR(20) NOT NULL,
  modo ENUM('sandbox', 'produccion') NOT NULL DEFAULT 'sandbox',
  comision DECIMAL(10, 2) NOT NULL,
  referencia VARCHAR(40),
  stripe_session_id VARCHAR(255) NULL UNIQUE,
  stripe_payment_intent_id VARCHAR(255) NULL,
  correo_estado ENUM('pendiente', 'procesando', 'enviado', 'error') NOT NULL DEFAULT 'pendiente',
  correo_intento_en TIMESTAMP NULL,
  correo_enviado_en TIMESTAMP NULL,
  correo_error TEXT NULL,
  FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE
);

CREATE TABLE envios
(
  id INT AUTO_INCREMENT PRIMARY KEY,
  orden_id INT NOT NULL,
  paqueteria VARCHAR(20) NOT NULL,
  guia VARCHAR(40),
  estatus VARCHAR(20) NOT NULL,
  costo_envio DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE
);

CREATE TABLE facturas
(
  id INT AUTO_INCREMENT PRIMARY KEY,
  orden_id INT NOT NULL,
  rfc VARCHAR(13) NOT NULL,
  uuid CHAR(36),
  FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE
);

INSERT INTO productos (nombre, categoria_id, precio, descripcion, materiales, stock, destacado, imagen) VALUES
('ErgoDesk Pro 120',             1, 5999.00, 'escritorio ergonomico de 120cm,para trabajo o gaming.',          'MDF de alta densidad, estructura de acero',  20, 1, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409997/ergopro120_rbxp7x.jpg'),
('ErgoDesk Pro 140',             1, 7299.00, 'superficie de 140cm para dual monitor o streaming.',    'MDF de alta densidad, estructura de acero',  15, 1, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409997/ergopro140_hiuiry.webp'),
('ErgoDesk Compact 100',         1, 4299.00, 'la opcion mas accesible para espacios pequeños.',                       'MDF de alta densidad, estructura de acero',  25, 0, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409997/ergoprocompact_fe4b43.webp'),
('ErgoDesk Max 160',             1, 8999.00, 'el escritorio mas grande para streamers que necesitan espacio.',  'MDF premium, estructura de acero reforzado', 10, 1, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409996/ergodeskmax160_srty1a.webp'),
('Bandeja organizadora de cables',2,  349.00, 'Se instala bajo el escritorio para esconder cables.',                   NULL,                                         50, 0, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409996/bandejacables_fr8xr3.webp'),
('Soporte de monitor simple',    2,   599.00, 'brazo para un monitor de hasta 27 pulgadas.',                NULL,                                         40, 0, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409997/soportemonitorsimple_rdfi2d.webp'),
('Soporte de monitor doble',     2,   999.00, 'brazo para dos monitores de hasta 27 pulgadas.',             NULL,                                         30, 1, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409997/sopormonitordoble_lk4c89.jpg'),
('Enchufe integrado con USB',    2,   449.00, 'se instala en la superficie y tiene 2 contactos y 2 puertos USB-A.',           NULL,                                         35, 0, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409996/enchufeescritorio_fyzkzf.webp'),
('Combo Gamer',                  3,      8499.00, 'ergoDesk pro 140cm negro + soporte doble + bandeja + enchufe USB.',       NULL,                                         10, 1, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409996/combogamer_c3phe4.jpg'),
('Combo Home Office',            3,      6799.00, 'ergoDesk pro 120cm + patas ajustables + soporte simple + bandeja.',       NULL,                                         10, 1, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409996/combohomeoffice_no039l.jpg');
