set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
mkdir -p "$ROOT/certs"

if [ ! -f "$ROOT/certs/localhost.pem" ] || [ ! -f "$ROOT/certs/localhost-key.pem" ]; then
  command -v openssl >/dev/null 2>&1 || {
    echo "Error: instala OpenSSL para generar el certificado local." >&2
    exit 1
  }
  openssl req -x509 -nodes -newkey rsa:2048 -sha256 -days 365 \
    -keyout "$ROOT/certs/localhost-key.pem" \
    -out "$ROOT/certs/localhost.pem" \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
  chmod 600 "$ROOT/certs/localhost-key.pem"
  echo "Certificado local creado en certs/. El navegador mostrará una advertencia porque es autofirmado."
else
  echo "Ya existe el certificado local; no se modificó."
fi
