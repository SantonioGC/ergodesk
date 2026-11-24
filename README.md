# ErgoDesk MX

**Tienda web de escritorios ergonómicos personalizables**

## Equipo 

- Daniel Bracamontes Zamudio
- Jesus Arturo Carrillo Avilez
- Sergio Antonio Gomez Cazares
- Carlos Alberto Romero Corral
- Santiago Jassiel Tapia Valdez

## 1. Tecnologías

- Frontend: HTML5, CSS3 y JavaScript
- Backend: Node.js 22 y Express
- Base de datos: MySQL 8
- Servidor web y proxy inverso: Nginx
- Contenedores: Docker y Docker Compose v2
- Pagos con tarjeta: Stripe Checkout en modo de prueba
- Correos de confirmación: Resend, cuando se configuran sus credenciales

## 2. Requisitos

### Windows 10/11

1. Git for Windows
2. Docker Desktop
3. Habilitar y utilizar el backend de WSL 2 en Docker Desktop
4. Iniciar Docker Desktop antes de ejecutar los comandos de Docker
5. Utilizar PowerShell para los comandos de Git y Docker

### Linux

1. Git.
2. Docker Engine.
3. Docker Compose v2
4. OpenSSL

## 3. Instalación en Windows (PowerShell)

### 3.1. Clonar el repositorio

```powershell
git clone https://github.com/SantonioGC/ergodesk.git
cd ergodesk
```

Comprueba que estás en la raíz del proyecto y que existen `docker-compose.yml`, `backend`, `frontend`, `nginx` y `scripts`:

```powershell
Get-ChildItem
```

### 3.2. Crear el archivo `.env`
Crea tu propio archivo `.env` local. El siguiente bloque genera dos contraseñas MySQL diferentes y un secreto JWT aleatorio, y escribe la configuración inicial. No sobrescribe un `.env` que ya exista.

```powershell
if (Test-Path .env) {
    Write-Error "Ya existe .env. No se modificó para evitar sobrescribir tus credenciales."
} else {
    function New-RandomHex([int]$ByteCount) {
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        try {
            $bytes = New-Object byte[] $ByteCount
            $rng.GetBytes($bytes)
            return [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
        } finally {
            $rng.Dispose()
        }
    }

    $dbPassword = New-RandomHex 24
    $rootPassword = New-RandomHex 24
    $jwtSecret = New-RandomHex 32

    $envContent = @"
DB_HOST=db
DB_USER=ergodesk_app
DB_PASSWORD=$dbPassword
DB_NAME=ergodesk
MYSQL_ROOT_PASSWORD=$rootPassword

JWT_SECRET=$jwtSecret

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

FRONTEND_URL=https://localhost

RESEND_API_KEY=
RESEND_FROM=onboarding@resend.dev
"@
    Set-Content -Path .env -Value $envContent -Encoding ascii

    Write-Host "Se creó .env con contraseñas y JWT aleatorios."
}
```

Para revisar o editar el archivo:

```powershell
notepad .env
```

### 3.3. Generar el certificado HTTPS local

El script de certificados utiliza OpenSSL y se ejecuta desde Git Bash.

1. Abre el Explorador de archivos y entra en la carpeta `ergodesk` que acabas de clonar.
2. Haz clic derecho dentro de la carpeta y abre **Git Bash Here**
3. Comprueba que OpenSSL esté disponible:

   ```bash
   openssl version
   ```

4. Ejecuta el script:

   ```bash
   sh scripts/generar-certificado-local.sh
   ```

5. Cierra Git Bash y regresa a PowerShell.

El script genera los certificados locales que Nginx espera dentro de `certs/`. Son autofirmados y el navegador mostrará una advertencia la primera vez que abras la tienda.

### 3.4. Validar Docker Compose

Asegúrate de que Docker Desktop esté abierto y que indique que el motor está en ejecución. En PowerShell, desde la raíz de `ergodesk`, ejecuta:

```powershell
docker compose config --quiet
```

### 3.5. Construir e iniciar ErgoDesk

```powershell
docker compose up --build -d
```

En la primera ejecución Docker descarga las imágenes, construye el backend, crea el volumen de MySQL e inicializa la base de datos con `backend/db/schema.sql`. El Compose debe incluir `MYSQL_USER: ${DB_USER}` y `MYSQL_PASSWORD: ${DB_PASSWORD}` en el servicio `db`; así MySQL crea el usuario `ergodesk_app` durante la inicialización del volumen vacío.

### 3.6. Comprobar los servicios

```powershell
docker compose ps
```

Para revisar los registros:

```powershell
docker compose logs --tail=100 db backend nginx
```

Para probar la API de categorías:

```powershell
curl.exe -i http://localhost:3000/api/productos/categorias
```

La respuesta esperada es `HTTP/1.1 200 OK` y un JSON con las categorías iniciales. Si devuelve `500`, consulta primero los registros del backend y comprueba que sus variables `DB_USER` y `DB_PASSWORD` coincidan con las variables que se utilizaron para crear el usuario MySQL.

### 3.7. Abrir la tienda

Abre en el navegador:

**https://localhost**

Acepta la advertencia del certificado autofirmado para esta instalación local. No utilices `http://localhost:3000` como dirección de la tienda: ese puerto corresponde al backend/API. Nginx sirve el frontend por HTTPS y redirige las solicitudes `/api` al backend.

### 3.8. Crear la primera cuenta administradora

El proyecto no incluye una cuenta de administrador con contraseña predeterminada. Después de iniciar los servicios, ejecuta en PowerShell:

```powershell
$adminEmail = Read-Host "Correo del administrador"
$adminPasswordSecure = Read-Host "Contraseña (mínimo 8 caracteres)" -AsSecureString
$adminPassword = [System.Net.NetworkCredential]::new('', $adminPasswordSecure).Password

docker compose exec -e "ADMIN_EMAIL=$adminEmail" -e "ADMIN_PASSWORD=$adminPassword" -e "ADMIN_NOMBRE=Administrador" backend node scripts/crear-admin.js

$adminPassword = $null
$adminPasswordSecure = $null
```

El script crea el administrador o asigna el rol de administrador a una cuenta que ya exista con ese correo. Después inicia sesión y abre:

**https://localhost/admin.html**

## 4. Instalación en Linux (terminal)

### 4.1. Clonar el repositorio

```bash
git clone https://github.com/SantonioGC/ergodesk.git
cd ergodesk
```

Comprueba que estás en la raíz del proyecto:

```bash
ls -la
```

Deben existir `docker-compose.yml` y las carpetas `backend`, `frontend`, `nginx` y `scripts`.

### 4.2. Crear el archivo `.env`
Crea tu propio `.env` local. Este bloque genera dos contraseñas MySQL diferentes y un secreto JWT aleatorio. No sobrescribe un `.env` que ya exista.

```bash
if [ -e .env ]; then
  echo "Ya existe .env. No se modificó para evitar sobrescribir tus credenciales."
else
  DB_PASSWORD="$(openssl rand -hex 24)"
  MYSQL_ROOT_PASSWORD="$(openssl rand -hex 24)"
  JWT_SECRET="$(openssl rand -hex 32)"

  cat > .env <<ENV_FILE
DB_HOST=db
DB_USER=ergodesk_app
DB_PASSWORD=$DB_PASSWORD
DB_NAME=ergodesk
MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD

JWT_SECRET=$JWT_SECRET

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

FRONTEND_URL=https://localhost

RESEND_API_KEY=
RESEND_FROM=onboarding@resend.dev
ENV_FILE

  chmod 600 .env
  unset DB_PASSWORD MYSQL_ROOT_PASSWORD JWT_SECRET
  echo ".env creado con secretos aleatorios. No lo subas a Git."
fi
```

Para revisar o editar el archivo:

```bash
nano .env
```

### 4.3. Generar el certificado HTTPS local

Desde la raíz del proyecto, ejecuta:

```bash
openssl version
sh scripts/generar-certificado-local.sh
```

El script genera los certificados locales que Nginx espera dentro de `certs/`. Son autofirmados y el navegador mostrará una advertencia la primera vez que abras la tienda.

### 4.4. Validar Docker Compose

Comprueba que Docker Engine esté en ejecución. Desde la raíz de `ergodesk`, ejecuta:

```bash
docker compose config --quiet
```

### 4.5. Construir e iniciar ErgoDesk

```bash
docker compose up --build -d
```

En la primera ejecución Docker descarga las imágenes, construye el backend, crea el volumen de MySQL e inicializa la base de datos con `backend/db/schema.sql`. El Compose debe incluir `MYSQL_USER: ${DB_USER}` y `MYSQL_PASSWORD: ${DB_PASSWORD}` en el servicio `db`; así MySQL crea el usuario `ergodesk_app` durante la inicialización del volumen vacío.

### 4.6. Comprobar los servicios

```bash
docker compose ps
```

En una instalación correcta, `db` y `backend` deben aparecer como `healthy`, y `nginx` como `Up`.

Para revisar los registros:

```bash
docker compose logs --tail=100 db backend nginx
```

Para probar la API de categorías:

```bash
curl -i http://localhost:3000/api/productos/categorias
```

La respuesta esperada es `HTTP/1.1 200 OK` y un JSON con las categorías iniciales.

### 4.7. Abrir la tienda

Abre en el navegador:

**https://localhost**

Acepta la advertencia del certificado autofirmado para esta instalación local. No utilices `http://localhost:3000` como dirección de la tienda: ese puerto corresponde al backend/API. Nginx sirve el frontend por HTTPS y redirige las solicitudes `/api` al backend.

### 4.8. Crear la primera cuenta administradora

El proyecto no incluye una cuenta de administrador con contraseña predeterminada. Desde la terminal Linux, ejecuta:

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

El script crea el administrador o asigna el rol de administrador a una cuenta que ya exista con ese correo. Después inicia sesión y abre:

**https://localhost/admin.html**

## 5. Pagos y correos

Esta configuración es igual para Windows y Linux; lo que cambia es el editor utilizado para modificar `.env`.

- **Windows:** abre el archivo con `notepad .env` desde PowerShell.
- **Linux:** abre el archivo con `nano .env` desde la terminal.

### Stripe Checkout

Para probar pagos con tarjeta, configura una clave secreta de Stripe de pruebas (`sk_test_`) en `STRIPE_SECRET_KEY`. No utilices claves `sk_live_` ni tarjetas bancarias reales.

La tarjeta de prueba aprobada de Stripe es:

| Dato | Valor |
|---|---|
| Número | `4242 4242 4242 4242` |
| Vencimiento | Cualquier fecha futura |
| CVC | Cualquier código de tres dígitos, por ejemplo `123` |

Si `STRIPE_SECRET_KEY` está vacía, la tienda puede abrirse, pero no se podrán completar pagos con tarjeta.

### Correos de confirmación

Para enviar correos de confirmación configura `RESEND_API_KEY` y un remitente permitido en `RESEND_FROM`. Para envíos a destinatarios externos en un uso real, utiliza un dominio verificado en Resend.

Después de cambiar variables de Stripe o Resend, recrea el backend.

**Windows (PowerShell):**

```powershell
docker compose up -d --force-recreate backend
```

**Linux (terminal):**

```bash
docker compose up -d --force-recreate backend
```

## 6. Base de datos y persistencia

Los datos de MySQL se guardan en el volumen Docker `ergodesk_data`. Detener o recrear los contenedores no elimina ese volumen.

**Windows (PowerShell) — detener y volver a iniciar:**

```powershell
docker compose down
docker compose up -d
```

**Linux (terminal) — detener y volver a iniciar:**

```bash
docker compose down
docker compose up -d
```

## 7. Ejecutar las pruebas automatizadas

Con Docker y MySQL iniciados:

**Windows (PowerShell):**

```powershell
docker compose --profile test run --rm backend-test
```

**Linux (terminal):**

```bash
docker compose --profile test run --rm backend-test
```
El servicio `backend-test` construye la imagen con las dependencias de desarrollo y ejecuta las pruebas automatizadas.

## 9. Estructura del repositorio

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
├── certs/                 
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
