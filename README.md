# ErgoDesk MX

**Tienda web de escritorios ergonómicos personalizables**

## Equipo 

- Daniel Bracamontes Zamudio
- Jesus Arturo Carrillo Avilez
- Sergio Antonio Gomez Cazares
- Carlos Alberto Romero Corral
- Santiago Jassiel Tapia Valdez

## 1. Tecnologías

- Frontend: HTML5, CSS3 y JavaScript.
- Backend: Node.js 22 y Express.
- Base de datos: MySQL 8.
- Servidor web y proxy inverso: Nginx.
- Contenedores: Docker y Docker Compose v2.
- Pagos con tarjeta: Stripe Checkout en modo de prueba.
- Correos de confirmación: Resend, cuando se configuran sus credenciales.

## 2. Requisitos

En Windows:

- Windows 10/11 con WSL 2 habilitado.
- Docker Desktop instalado y abierto, utilizando el motor basado en Linux.
- Git for Windows (incluye Git Bash).
- Navegador web moderno.

En Linux o macOS:

- Git.
- Docker Engine y Docker Compose v2.
- OpenSSL.
- Navegador web moderno.

No es necesario instalar Node.js, pnpm ni MySQL directamente en el equipo: estos servicios se ejecutan dentro de Docker.

## 3. Clonar el repositorio

Abre PowerShell, Git Bash o una terminal y ejecuta:

```bash
git clone https://github.com/SantonioGC/ergodesk.git
cd ergodesk
```

Si el repositorio solicita autenticación, utiliza una cuenta que tenga acceso al proyecto.

Antes de continuar, comprueba que en la raíz estén `docker-compose.yml`, la carpeta `backend`, la carpeta `frontend`, `nginx` y `scripts`. En la versión actual del repositorio no se incluye un archivo `.env.example`; por eso no ejecutes `Copy-Item .env.example .env`. Crearás `.env` manualmente siguiendo el apartado siguiente.

## 4. Crear y configurar el archivo `.env`

El repositorio actual no incluye `.env.example`. Cada persona debe crear su propio archivo `.env` localmente. Este archivo contiene contraseñas y secretos privados; no debe subirse a Git ni compartirse.

### Windows (PowerShell)

Desde la carpeta raíz del proyecto, crea el archivo vacío:

```powershell
New-Item -ItemType File -Path .env -Force
```

Ábrelo con el Bloc de notas:

```powershell
notepad .env
```

Genera tres valores aleatorios diferentes en PowerShell. Ejecuta este bloque para la contraseña de `DB_PASSWORD`:

```powershell
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 24
$rng.GetBytes($bytes)
[BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
$rng.Dispose()
```

Ejecuta el mismo bloque una segunda vez para `MYSQL_ROOT_PASSWORD`. Después ejecútalo una tercera vez cambiando `24` por `32`; ese resultado será `JWT_SECRET`.

Copia los resultados directamente en el archivo `.env` que abriste. No pegues las contraseñas en Git ni las envíes por chat.

### Linux o macOS

Crea y abre el archivo:

```bash
nano .env
```

Genera los tres valores con OpenSSL en una terminal aparte:

```bash
openssl rand -hex 24
openssl rand -hex 24
openssl rand -hex 32
```

Los dos primeros son las contraseñas distintas de MySQL y el tercero es el `JWT_SECRET`.

### Variables de entorno

Deja las variables con esta estructura y reemplaza los valores de ejemplo por los secretos que generaste:

```dotenv
DB_HOST=db
DB_USER=ergodesk_app
DB_PASSWORD=REEMPLAZAR_POR_CONTRASENA_ALEATORIA_DE_LA_APP
DB_NAME=ergodesk
MYSQL_ROOT_PASSWORD=REEMPLAZAR_POR_OTRA_CONTRASENA_ALEATORIA

JWT_SECRET=REEMPLAZAR_POR_SECRETO_ALEATORIO_DE_64_CARACTERES_HEXADECIMALES

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

FRONTEND_URL=https://localhost

RESEND_API_KEY=
RESEND_FROM=onboarding@resend.dev
```

Consideraciones:

- `DB_HOST` debe ser `db`, que es el nombre del servicio MySQL dentro de Docker Compose.
- `DB_USER` debe ser `ergodesk_app`. No se utiliza `root` desde el backend.
- `DB_PASSWORD` es la contraseña de `ergodesk_app`.
- `MYSQL_ROOT_PASSWORD` es una contraseña diferente, reservada para administrar MySQL.
- `DB_NAME` debe ser `ergodesk`.
- `JWT_SECRET` debe ser un valor aleatorio privado de 64 caracteres hexadecimales.
- Las contraseñas y el secreto JWT no deben llevar comillas ni espacios alrededor del signo `=`.
- Stripe y Resend pueden quedar vacíos para iniciar y navegar la tienda. Las funciones que dependen de esos servicios no estarán disponibles hasta configurar sus credenciales.

El servicio `db` de `docker-compose.yml` debe recibir `MYSQL_USER: ${DB_USER}` y `MYSQL_PASSWORD: ${DB_PASSWORD}`. Estas variables hacen que MySQL cree el usuario de aplicación durante la primera inicialización de un volumen vacío. Comprueba que el archivo `docker-compose.yml` del repositorio tenga ambas líneas antes de iniciar los servicios. El backend debe recibir `DB_USER` y `DB_PASSWORD` con los mismos valores que `MYSQL_USER` y `MYSQL_PASSWORD`.

## 5. Generar el certificado HTTPS local

Nginx está configurado para utilizar estos archivos locales:

```text
certs/localhost.pem
certs/localhost-key.pem
```

Los certificados son autofirmados y se generan en cada equipo. No se deben subir los archivos `.pem`, `.key` o `.crt` al repositorio.

### Windows

1. Abre **Git Bash** desde la carpeta raíz del proyecto.
2. Comprueba que OpenSSL esté disponible:

   ```bash
   openssl version
   ```

3. Ejecuta el script incluido:

   ```bash
   sh scripts/generar-certificado-local.sh
   ```

4. Cuando termine, vuelve a PowerShell.

Si Git Bash indica que no encuentra `openssl`, instala OpenSSL y asegúrate de que esté disponible en el PATH de Git Bash antes de ejecutar el script.

### Linux o macOS

Desde la raíz del proyecto:

```bash
sh scripts/generar-certificado-local.sh
```

El navegador mostrará una advertencia al entrar por primera vez porque el certificado es autofirmado. Es normal en este entorno local.

## 6. Validar la configuración e iniciar ErgoDesk

Desde PowerShell, Git Bash o una terminal situada en la raíz del repositorio, valida primero el archivo Compose:

```bash
docker compose config --quiet
```

Si no muestra errores, construye e inicia los servicios:

```bash
docker compose up --build -d
```

En la primera ejecución Docker descarga las imágenes, construye el backend, crea el volumen de MySQL e inicializa automáticamente la base de datos con `backend/db/schema.sql`. En esa inicialización se crean la base `ergodesk`, el usuario `ergodesk_app`, las tablas y el catálogo inicial.

Los servicios son:

- `db`: MySQL 8 y almacenamiento persistente.
- `backend`: API REST de Node.js/Express.
- `nginx`: frontend y proxy inverso HTTPS hacia el backend.

El backend espera a que MySQL esté saludable. Nginx espera a que el healthcheck del backend responda correctamente.

## 7. Comprobar que los servicios estén funcionando

Consulta el estado:

```bash
docker compose ps
```

En una instalación correcta, `db` y `backend` deben aparecer como `healthy`; `nginx` debe aparecer como `Up`.

Si algún servicio no inicia, consulta sus registros:

```bash
docker compose logs --tail=100 db backend nginx
```

En Windows PowerShell también puedes probar la API de categorías con:

```powershell
curl.exe -i http://localhost:3000/api/productos/categorias
```

La respuesta esperada es `HTTP/1.1 200 OK` y un JSON con las categorías iniciales. Si devuelve `500`, revisa primero `docker compose logs --tail=100 backend` y la conexión del backend con MySQL.

## 8. Abrir la tienda

Abre en el navegador:

**https://localhost**

El puerto HTTP 80 redirige a HTTPS. Acepta la advertencia del certificado autofirmado para esta instalación local.

No utilices `http://localhost:3000` como dirección de la tienda: ese puerto corresponde al backend/API. Nginx sirve las páginas del frontend en `https://localhost` y reenvía las solicitudes `/api` al backend.

## 9. Crear la primera cuenta administradora

El proyecto no incluye una cuenta de administrador con contraseña predeterminada. Después de iniciar los servicios, abre PowerShell y ejecuta el siguiente bloque. Se solicitarán el correo y la contraseña; la contraseña se captura de forma oculta.

```powershell
$adminEmail = Read-Host "Correo del administrador"
$adminPasswordSecure = Read-Host "Contraseña (mínimo 8 caracteres)" -AsSecureString
$adminPassword = [System.Net.NetworkCredential]::new('', $adminPasswordSecure).Password

docker compose exec -e "ADMIN_EMAIL=$adminEmail" -e "ADMIN_PASSWORD=$adminPassword" -e "ADMIN_NOMBRE=Administrador" backend node scripts/crear-admin.js

$adminPassword = $null
$adminPasswordSecure = $null
```

El script crea el administrador o asigna el rol de administrador a una cuenta existente con ese correo. Después inicia sesión en la tienda y abre:

**https://localhost/admin.html**

## 10. Pagos y correos

### Stripe Checkout

Para probar pagos con tarjeta, configura una clave secreta de Stripe de pruebas (`sk_test_`) en `STRIPE_SECRET_KEY`. No utilices claves `sk_live_` ni tarjetas bancarias reales.

La tarjeta de prueba aprobada de Stripe es:

| Dato | Valor |
|---|---|
| Número | `4242 4242 4242 4242` |
| Vencimiento | Cualquier fecha futura |
| CVC | Cualquier código de tres dígitos, por ejemplo `123` |

Si `STRIPE_SECRET_KEY` está vacía, la tienda puede abrirse, pero no se podrán completar pagos con tarjeta.

### OXXO

La opción OXXO de esta versión genera una referencia simulada. No es una referencia cobrable en una tienda OXXO ni registra un depósito real.

### Correos de confirmación

Para enviar correos de confirmación configura `RESEND_API_KEY` y un remitente permitido en `RESEND_FROM`. Para envíos a destinatarios externos en un uso real, utiliza un dominio verificado en Resend.

Después de cambiar variables de Stripe o Resend, recrea el backend:

```bash
docker compose up -d --force-recreate backend
```

## 11. Base de datos y persistencia

Los datos de MySQL se guardan en el volumen Docker `ergodesk_data`. Detener o recrear los contenedores no elimina ese volumen.

Para detener los servicios sin borrar la base de datos:

```bash
docker compose down
```

Para volver a iniciarlos:

```bash
docker compose up -d
```

**No ejecutes `docker compose down -v` para una actualización normal.** La opción `-v` elimina el volumen y, con él, usuarios, productos, carritos, pedidos y demás datos de MySQL.

MySQL ejecuta `backend/db/schema.sql` automáticamente solamente cuando el volumen se inicializa por primera vez. Cambiar `MYSQL_ROOT_PASSWORD`, `MYSQL_USER` o `MYSQL_PASSWORD` en `.env` después de esa inicialización no cambia las cuentas ya creadas dentro de MySQL. Para cambiar credenciales de una base existente se debe modificar también el usuario dentro de MySQL; no basta con editar `.env`.

Las migraciones de `backend/db/migrations/` son para bases anteriores. Antes de ejecutar una migración en una base existente, realiza un respaldo y comprueba qué columnas tiene. No ejecutes migraciones sobre una base nueva que ya contiene las columnas del esquema actualizado.

## 12. Ejecutar las pruebas automatizadas

Con Docker y MySQL iniciados, ejecuta:

```bash
docker compose --profile test run --rm backend-test
```

El servicio `backend-test` construye la imagen con las dependencias de desarrollo y ejecuta las pruebas automatizadas.

## 13. Comandos útiles

Ver el estado de los servicios:

```bash
docker compose ps
```

Ver registros:

```bash
docker compose logs --tail=100 db backend nginx
```

Seguir los registros en tiempo real:

```bash
docker compose logs -f db backend nginx
```

Reconstruir después de modificar el código:

```bash
docker compose up --build -d
```

Detener los servicios sin eliminar datos:

```bash
docker compose down
```

## 14. Estructura del repositorio

```text
ergodesk/
├── backend/
│   ├── db/
│   │   ├── migrations/
│   │   └── schema.sql
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   ├── tests/
│   ├── Dockerfile
│   ├── db.js
│   └── server.js
├── certs/                 # .gitkeep; certificados generados localmente
├── frontend/
│   ├── css/
│   ├── data/
│   ├── js/
│   └── *.html
├── nginx/
│   └── nginx.conf
├── scripts/
│   └── generar-certificado-local.sh
├── .gitignore
├── docker-compose.yml
└── README.md
```

## 15. Seguridad antes de publicar cambios

- En el estado actual del repositorio no se incluye `.env.example`; crea `.env` manualmente siguiendo el apartado 4.
- No subas `.env`, claves privadas, contraseñas, tokens ni API Keys.
- En `certs/` conserva solamente `.gitkeep`; genera `localhost.pem` y `localhost-key.pem` localmente en cada equipo.
- Si algún secreto o certificado privado ya fue subido a Git, eliminarlo del último commit no basta: rota el secreto y limpia el historial del repositorio cuando corresponda.
- No compartas las credenciales de la cuenta administradora.
- HTTPS con certificado autofirmado es para desarrollo local. Una instalación pública requiere dominio, certificado TLS válido y configuración de producción.

---
