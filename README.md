# ErgoDesk

Web para visualizar y comprar escritorios ergonomicos hechos en mexico dirigida a profesionales de tecnologia, gamers, creadores de contenido y trabajadores remotos

---

## Equipo

- Jesus Arturo Carrillo Avilez
- Sergio Antonio Gomez Cazares
- Grosso Velarde Miguel Guillermo
- Carlos Alberto Romero Corral
- Santiago Jassiel Tapia Valdez

facultad de informatica culiacan — licenciatura en informatica  
DevSecOps | Grupo 3-4

---

## Requisitos

Antes de correr el proyecto necesitas instalar lo siguiente

### Docker

**Fedora**
```bash
sudo dnf install docker docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```
cierra sesion y vuelve a entrar para aplicar el grupo y luego revisas
```bash
docker -v
```

**Ubuntu / Debian:**
```bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

**Windows / Mac:**
descarga e instala [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

### Git

**Fedora**
```bash
sudo dnf install git -y
```

**Ubuntu / Debian:**
```bash
sudo apt install git -y
```

**Windows / Mac:**
descarga e instala [Git](https://git-scm.com/downloads)

---

### vs code y live server (para el frontend)

1. descarga [vs code](https://code.visualstudio.com/)
2. abre vs code ve a extensiones (`Ctrl+Shift+X`)
3. busca **live server** de Ritwick Dey e instálala

---

## Instalacion y uso

### 1. clonar el repositorio

```bash
git clone <url-del-repo>
cd ergodesk
```

### 2. levantar el backend y la base de datos

```bash
docker compose up --build
```

esto levanta dos contenedores:
- **ergodesk_backend** — API REST en `http://localhost:3000`
- **ergodesk_db** — MySQL con los datos cargados automaticamente

El `--build` solo es necesario la primera vez o cuando se modifiquen archivos del backend.

### 3. levantar el frontend

abre vs code click derecho sobre `frontend/index.html` y selecciona **open with live server**.

el frontend estará disponible en `http://127.0.0.1:5500/frontend/index.html`

---

## Comandos extra

`docker compose up` levantar el proyecto
`docker compose up --build` levantar y reconstruir imágenes
`docker compose down` apagar los contenedores
`docker compose down -v` apagar y eliminar la base de datos

---

## API

Base URL: `http://localhost:3000/api`

GET `/productos` todos los productos
GET `/productos/destacados` productos destacados
GET `/productos/:id` producto por ID
GET `/productos/buscar/:termino` busqueda de productos
POST `/auth/registro` crear cuenta
POST `/auth/login` iniciar sesion

---

## Tecnologias

- **Frontend** — HTML, CSS, JavaScript
- **Backend** — Node.js, Express
- **Base de datos** — MySQL 8
- **Imágenes** — Cloudinary
- **Contenedores** — Docker