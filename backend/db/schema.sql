-- ─────────────────────────────────────────
-- ErgoDesk MX — Base de Datos
-- ─────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS ergodesk;
USE ergodesk;

-- ─── USUARIOS ────────────────────────────

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── PRODUCTOS (INVENTARIO) ──────────────

CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  categoria ENUM('escritorios', 'accesorios', 'combos') NOT NULL,
  precio DECIMAL(10, 2) NOT NULL,
  descripcion TEXT,
  materiales VARCHAR(255),
  stock INT NOT NULL DEFAULT 0,
  destacado TINYINT(1) DEFAULT 0,
  imagen VARCHAR(500),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── DATOS INICIALES (INVENTARIO) ────────

INSERT INTO productos (nombre, categoria, precio, descripcion, materiales, stock, destacado, imagen) VALUES
('ErgoDesk Pro 120',             'escritorios', 5999.00, 'Escritorio ergonómico de 120cm, ideal para trabajo o gaming.',          'MDF de alta densidad, estructura de acero',  20, 1, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409997/ergopro120_rbxp7x.jpg'),
('ErgoDesk Pro 140',             'escritorios', 7299.00, 'Superficie amplia de 140cm perfecta para dual monitor o streaming.',    'MDF de alta densidad, estructura de acero',  15, 1, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409997/ergopro140_hiuiry.webp'),
('ErgoDesk Compact 100',         'escritorios', 4299.00, 'La opción más accesible para espacios pequeños.',                       'MDF de alta densidad, estructura de acero',  25, 0, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409997/ergoprocompact_fe4b43.webp'),
('ErgoDesk Max 160',             'escritorios', 8999.00, 'El escritorio más grande. Para streamers que necesitan espacio total.',  'MDF premium, estructura de acero reforzado', 10, 1, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409996/ergodeskmax160_srty1a.webp'),
('Bandeja organizadora de cables','accesorios',  349.00, 'Se instala bajo el escritorio para esconder cables.',                   NULL,                                         50, 0, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409996/bandejacables_fr8xr3.webp'),
('Soporte de monitor simple',    'accesorios',   599.00, 'Brazo articulado para un monitor de hasta 27 pulgadas.',                NULL,                                         40, 0, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409997/soportemonitorsimple_rdfi2d.webp'),
('Soporte de monitor doble',     'accesorios',   999.00, 'Brazo articulado para dos monitores de hasta 27 pulgadas.',             NULL,                                         30, 1, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409997/sopormonitordoble_lk4c89.jpg'),
('Enchufe integrado con USB',    'accesorios',   449.00, 'Se instala en la superficie. 2 contactos y 2 puertos USB-A.',           NULL,                                         35, 0, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409996/enchufeescritorio_fyzkzf.webp'),
('Combo Gamer',                  'combos',      8499.00, 'ErgoDesk Pro 140 negro + soporte doble + bandeja + enchufe USB.',       NULL,                                         10, 1, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409996/combogamer_c3phe4.jpg'),
('Combo Home Office',            'combos',      6799.00, 'ErgoDesk Pro 120 + patas ajustables + soporte simple + bandeja.',       NULL,                                         10, 1, 'https://res.cloudinary.com/dvf6lrio6/image/upload/v1779409996/combohomeoffice_no039l.jpg');
