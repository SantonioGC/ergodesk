# ErgoDesk MX

**Tienda web de escritorios ergonómicos personalizables**  

## 1. Descripción del proyecto

ErgoDesk MX es una tienda web para consultar y adquirir escritorios ergonómicos, accesorios y combos. El sitio permite explorar el catálogo, buscar y filtrar productos, configurar un escritorio a partir de sus características y accesorios, administrar un carrito de compras y realizar un pedido.

Los usuarios pueden crear una cuenta, iniciar sesión, registrar direcciones de envío y consultar sus pedidos desde su perfil. El sistema también incluye un panel administrativo para gestionar el catálogo, revisar pedidos, consultar métricas y actualizar información de envío cuando corresponde.

El proyecto integra un flujo de pago con Stripe en **modo de prueba** y el envío de correos de confirmación mediante Resend.

### Objetivos

- Ofrecer un catálogo organizado de escritorios, accesorios y combos.
- Permitir la personalización de escritorios mediante un configurador.
- Gestionar usuarios, direcciones, carrito, inventario y pedidos.
- Separar los permisos de clientes y administradores.
- Proporcionar un panel para administrar productos y consultar pedidos y métricas.
- Integrar un flujo de pago de prueba y notificaciones por correo electrónico.

## 2. Equipo de desarrollo

- Daniel Zamudio Bracamontes
- Jesus Arturo Carrillo Avilez
- Sergio Antonio Gomez Cazares
- Carlos Alberto Romero Corral
- Santiago Jassiel Tapia Valdez

## 3. Tecnologías utilizadas

| Área | Tecnología |
|---|---|
| Frontend | HTML5, CSS3 y JavaScript |
| Backend | Node.js 22 y Express |
| Base de datos | MySQL 8 |
| Servidor web y proxy inverso | Nginx |
| Contenedores | Docker y Docker Compose v2 |
| Procesamiento de pagos | Stripe Checkout, exclusivamente en modo de prueba |
| Correos electrónicos | Resend |
| Seguridad | JWT, bcryptjs, Helmet y limitación de solicitudes |

La aplicación se ejecuta en contenedores. Nginx sirve el frontend y redirige las solicitudes `/api` al backend. MySQL almacena usuarios, catálogo, inventario, carritos, pedidos, pagos , etc.

## 4. Funcionalidades principales

### Tienda y clientes

- Catálogo de escritorios, accesorios y combos.
- Búsqueda de productos y filtros por categoría.
- Configurador de escritorios con tamaños, tipos de patas, acabados y accesorios.
- Cálculo del precio de la configuración en el servidor.
- Registro e inicio de sesión de usuarios.
- Carrito de compras con control de cantidades y disponibilidad de inventario.
- Registro y selección de direcciones de envío.
- Checkout con selección de paquetería y método de pago.
- Consulta de pedidos y su estado desde el perfil del usuario.

### Panel administrativo

- Acceso restringido a cuentas con rol de administrador.
- Alta, edición y eliminación de productos.
- Administración de precios, existencias, imágenes y galería de productos.
- Consulta de pedidos y datos de envío.
- Actualización de estado de envío y guía cuando el pedido corresponde a producción.
- Métricas de ventas, pedidos y ticket promedio, con importes de prueba separados de las ventas de producción.

### Pagos y correos

- **Stripe:** utiliza Stripe Checkout con una clave secreta de prueba (`sk_test_`). Esta versión no está habilitada para cobrar tarjetas reales.
- **Resend:** envía el correo de confirmación cuando el pedido queda pagado, siempre que se hayan configurado las credenciales y el remitente correspondiente.

Los pedidos creados en modo de prueba se identifican como `sandbox` y se separan de las ventas de producción. No deben utilizarse como órdenes de venta o envío reales.

## 5. Requisitos para ejecutar el proyecto

- Git.
- Docker Engine y Docker Compose v2, o Docker Desktop actualizado.
- OpenSSL para generar el certificado HTTPS local.
- Navegador web moderno.
- Conexión a internet para descargar las imágenes de Docker y, cuando se configuren, utilizar Stripe y Resend.

No es necesario instalar Node.js, PNPM ni MySQL directamente en el equipo anfitrión: se ejecutan dentro de Docker.

## 6. Clonar el repositorio

El repositorio del equipo está alojado en SoftwareLab. Desde una terminal, ejecuta:

```bash
git clone https://code.softwarelab.com.mx/fic-3-4-2026/equipo-4/ergodesk-mx.git
cd ergodesk-mx
```

Si la plataforma solicita autenticación, utiliza una cuenta que tenga acceso al repositorio.

> Si el equipo cambia el alojamiento del proyecto, sustituye la URL anterior por la dirección HTTPS de clonación que proporcione el nuevo repositorio.

## 7. Configuración del entorno

En la raíz del proyecto, crea el archivo `.env` a partir de la plantilla:

```bash
cp .env.example .env
```

Abre `.env` y configura las variables. Como mínimo, cambia las contraseñas de MySQL y el secreto JWT. Los valores de `DB_PASSWORD` y `MYSQL_ROOT_PASSWORD` deben ser iguales para esta configuración.

| Variable | Uso |
|---|---|
| `DB_HOST` | Servicio de base de datos dentro de Docker. Debe ser `db`. |
| `DB_USER` | Usuario de MySQL. La configuración inicial utiliza `root`. |
| `DB_PASSWORD` | Contraseña de MySQL para el backend. |
| `DB_NAME` | Nombre de la base de datos. |
| `MYSQL_ROOT_PASSWORD` | Contraseña de root que utiliza el contenedor MySQL. Debe coincidir con `DB_PASSWORD`. |
| `JWT_SECRET` | Secreto utilizado para firmar los tokens de sesión. Debe ser privado y aleatorio. |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe en modo de prueba. Debe comenzar por `sk_test_`. |
| `STRIPE_WEBHOOK_SECRET` | Secreto opcional del webhook de Stripe. Se configura al utilizar Stripe CLI o un endpoint de webhook. |
| `FRONTEND_URL` | Dirección del frontend. Para la ejecución local es `https://localhost`. |
| `RESEND_API_KEY` | API Key de Resend para enviar correos. |
| `RESEND_FROM` | Dirección remitente autorizada en Resend. |

Para generar un secreto JWT aleatorio en Linux o macOS puedes ejecutar:

```bash
openssl rand -hex 32
```

Copia el resultado como valor de `JWT_SECRET` dentro de `.env`.

### Configuración de Stripe

Para habilitar los pagos de prueba, crea u obtén una clave secreta desde el entorno de pruebas de Stripe y colócala en `STRIPE_SECRET_KEY`. Debe ser una clave `sk_test_`; el backend rechaza claves de producción.

Si `STRIPE_SECRET_KEY` conserva el texto de ejemplo o está vacía, la tienda podrá abrirse, pero no será posible completar un pago con tarjeta.

### Configuración de Resend

Para que se envíen correos de confirmación, agrega tu API Key en `RESEND_API_KEY`. Configura `RESEND_FROM` con un remitente permitido por tu cuenta de Resend. Para enviar correos a destinatarios externos en un uso real, utiliza un dominio verificado en Resend y su dirección remitente correspondiente.

Si no se configuran las credenciales de Resend, el sitio puede ejecutarse, pero no se enviarán los correos de confirmación.

**Importante:** el archivo `.env` contiene credenciales privadas. No lo subas al repositorio ni lo compartas. El archivo que sí se versiona es `.env.example`, que debe contener únicamente valores de ejemplo.

## 8. Generar el certificado HTTPS local

Nginx está configurado para servir la aplicación mediante HTTPS. Antes de iniciar los contenedores, genera el certificado local:

```bash
sh scripts/generar-certificado-local.sh
```

El script crea los archivos dentro de `certs/` si todavía no existen. Son certificados autofirmados para desarrollo local; el navegador mostrará una advertencia de seguridad al entrar por primera vez a `https://localhost`.

En Windows, ejecuta este paso desde Git Bash o WSL con OpenSSL instalado.

Los archivos privados del certificado no deben subirse al repositorio. Cada persona debe generar sus propios certificados locales.

## 9. Construir e iniciar ErgoDesk

Desde la carpeta raíz del proyecto, ejecuta:

```bash
docker compose up --build -d
```

Docker descargará las imágenes necesarias, construirá el backend e iniciará los servicios:

- `db`: base de datos MySQL 8.
- `backend`: API REST de Node.js y Express.
- `nginx`: frontend y proxy inverso HTTPS.

Comprueba que los servicios estén activos:

```bash
docker compose ps
```

Consulta los registros si algún servicio no inicia correctamente:

```bash
docker compose logs --tail=100 db backend nginx
```

Abre la aplicación en el navegador:

**https://localhost**

El puerto HTTP 80 redirige al puerto HTTPS 443. El backend también se publica únicamente en `127.0.0.1:3000` para tareas locales de desarrollo; el frontend utiliza la API a través de Nginx.

## 10. Base de datos

En una instalación nueva, MySQL crea la base de datos y carga automáticamente `backend/db/schema.sql` cuando se inicializa por primera vez el volumen de datos. El esquema incluye las tablas de usuarios, direcciones, categorías, productos, carritos, checkout, reservas de inventario, pedidos, detalles, pagos, envíos y facturas, además de los campos utilizados por Stripe y el estado de los correos.

El esquema también inserta el catálogo inicial de productos.

### Importante al actualizar una instalación existente

MySQL ejecuta los archivos de inicialización solamente cuando el directorio de datos del volumen está vacío. Si ya existe una base de datos, reemplazar `schema.sql` no modifica automáticamente sus tablas ni elimina sus registros.

Para conservar una instalación existente, inicia o actualiza los servicios normalmente:

```bash
docker compose up --build -d
```

Las migraciones de `backend/db/migrations/` son para actualizar bases de datos anteriores. Antes de utilizar una, realiza un respaldo y comprueba qué columnas existen. No ejecutes una migración dos veces ni la ejecutes sobre una base nueva que ya fue creada con el esquema actualizado: algunas instrucciones no son idempotentes y pueden producir errores por columnas duplicadas.

**No utilices `docker compose down -v` para detener o actualizar el proyecto.** La opción `-v` elimina el volumen de MySQL y, con él, usuarios, productos, pedidos y demás datos almacenados.

Para detener los contenedores sin borrar la base de datos:

```bash
docker compose down
```

Para iniciarlos de nuevo:

```bash
docker compose up -d
```

## 11. Crear el primer administrador

El proyecto no incluye una cuenta de administrador con contraseña predeterminada. Primero inicia los contenedores y después crea una cuenta con el script incluido.

En Linux, macOS, Git Bash o WSL, ejecuta desde la raíz del proyecto:

```bash
read -r -p "Correo del administrador: " ADMIN_EMAIL
read -r -s -p "Contraseña (mínimo 8 caracteres): " ADMIN_PASSWORD
echo
docker compose exec \
  -e ADMIN_EMAIL="$ADMIN_EMAIL" \
  -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  -e ADMIN_NOMBRE="Administrador" \
  backend node scripts/crear-admin.js
unset ADMIN_EMAIL ADMIN_PASSWORD
```

El script crea el usuario administrador o asigna el rol de administrador a una cuenta que ya exista con ese correo.

Después inicia sesión con esa cuenta desde el perfil y entra al panel:

**https://localhost/admin.html**

El acceso al panel y a sus rutas de administración está protegido por el rol de administrador.

## 12. Probar el flujo de compra

1. Abre `https://localhost` y registra una cuenta de cliente desde el perfil.
2. Explora el catálogo o configura un escritorio y agrégalo al carrito.
3. Continúa al checkout, registra o selecciona una dirección y elige una paquetería.
4. Selecciona Stripe para probar el pago con tarjeta o OXXO para probar la referencia simulada.

### Tarjetas de prueba de Stripe

En el checkout de Stripe puedes utilizar la tarjeta de prueba aprobada:

| Dato | Valor |
|---|---|
| Número | `4242 4242 4242 4242` |
| Fecha de vencimiento | Cualquier fecha futura |
| CVC | Cualquier código de tres dígitos, por ejemplo `123` |

### Confirmación por correo

Cuando el pedido queda pagado, ErgoDesk intenta enviar un correo de confirmación al correo asociado a la cuenta. Para que el envío funcione deben estar configuradas `RESEND_API_KEY` y `RESEND_FROM` en `.env`, y el backend debe haberse recreado después de modificar esas variables:

```bash
docker compose up -d --force-recreate backend
```

## 13. Ejecutar las pruebas automatizadas

Con Docker y la base de datos iniciados, ejecuta:

```bash
docker compose --profile test run --rm backend-test
```

El servicio `backend-test` construye la imagen con las dependencias de desarrollo y ejecuta las pruebas automatizadas de Jest. Las pruebas de API necesitan que MySQL esté disponible y tenga el esquema correspondiente.

## 14. Comandos útiles

Ver el estado de los contenedores:

```bash
docker compose ps
```

Ver los últimos registros:

```bash
docker compose logs --tail=100 backend
```

Seguir los registros en tiempo real:

```bash
docker compose logs -f backend nginx db
```

Reconstruir y reiniciar después de modificar el código:

```bash
docker compose up --build -d
```

Recrear solamente el backend después de modificar variables de Stripe o Resend:

```bash
docker compose up -d --force-recreate backend
```

Detener el proyecto sin eliminar los datos:

```bash
docker compose down
```

## 15. Estructura general del proyecto

```text
ergodesk-mx/
├── backend/
│   ├── db/
│   │   ├── migrations/      
│   │   └── schema.sql       
│   ├── routes/             
│   │                      
│   ├── scripts/              
│   ├── services/             
│   ├── tests/             
│   ├── Dockerfile
│   ├── server.js
│   ├── db.js
│   ├── configurador.js
│   └── util.js
├── frontend/
│   ├── css/                 
│   ├── data/               
│   ├── js/                   
│   └── *.html               
├── nginx/
│   └── nginx.conf
├── scripts/
│   └── generar-certificado-local.sh
├── certs/                    
├── .env.example              
├── .gitignore
├── docker-compose.yml
└── README.md
```
