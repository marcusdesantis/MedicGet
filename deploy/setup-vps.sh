#!/usr/bin/env bash
# =============================================================================
# Bootstrap del VPS para correr MedicGet + Jenkins.
#
# Probado en Ubuntu 22.04 LTS.
# Correr una sola vez con:  sudo bash setup-vps.sh
#
# Qué hace:
#   1. Instala Docker + Docker Compose
#   2. Instala Nginx (host) + Certbot (SSL gratis de Let's Encrypt)
#   3. Levanta Jenkins en :8081 (con acceso al docker socket)
#   4. Crea usuario `deploy` para Jenkins jobs
#   5. Configura firewall ufw (abre 22/80/443)
#   6. Crea /proyectos/opt/medicget para el código de producción
#
# Después de correr esto:
#   - Editar tu DNS: A medicget.io 89.117.58.101
#                    A www.medicget.io 89.117.58.101
#                    A ci.medicget.io 89.117.58.101
#   - Subir el .env de producción a /proyectos/opt/medicget/.env
#   - git clone tu repo en /proyectos/opt/medicget
#   - sudo certbot --nginx -d medicget.io -d www.medicget.io -d ci.medicget.io
#   - Crear primer job de Jenkins (ver DEPLOY.md)
# =============================================================================

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Correr con sudo: sudo bash setup-vps.sh"
  exit 1
fi

echo "════════════════════════════════════════════════════════════════"
echo " MedicGet — Bootstrap VPS"
echo "════════════════════════════════════════════════════════════════"

# ─── 1. Update + dependencias básicas ────────────────────────────────────────
echo ""
echo "[1/7] Actualizando paquetes del sistema..."
apt-get update -y
apt-get upgrade -y
apt-get install -y \
  ca-certificates curl gnupg lsb-release \
  ufw nginx rsync git vim htop \
  software-properties-common

# ─── 2. Docker ───────────────────────────────────────────────────────────────
echo ""
echo "[2/7] Instalando Docker..."
if ! command -v docker &>/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi
docker --version
docker compose version

# ─── 3. Usuario deploy ───────────────────────────────────────────────────────
echo ""
echo "[3/7] Creando usuario deploy..."
if ! id deploy &>/dev/null; then
  adduser --disabled-password --gecos "" deploy
fi
usermod -aG docker deploy
# Para que pueda escribir en /proyectos/opt/medicget sin sudo
mkdir -p /proyectos/opt/medicget
chown -R deploy:deploy /proyectos/opt/medicget

# ─── 4. Certbot ──────────────────────────────────────────────────────────────
echo ""
echo "[4/7] Instalando Certbot..."
apt-get install -y certbot python3-certbot-nginx

# ─── 5. Firewall ─────────────────────────────────────────────────────────────
echo ""
echo "[5/7] Configurando firewall ufw..."
ufw allow OpenSSH
ufw allow 'Nginx Full'   # 80 + 443
# NO abrimos 8080/8081 — esos puertos solo escuchan en 127.0.0.1 y el
# tráfico externo entra via Nginx host. Mantenerlos cerrados al WAN.
ufw --force enable
ufw status

# ─── 6. Jenkins en docker ────────────────────────────────────────────────────
echo ""
echo "[6/7] Levantando Jenkins en :9090..."
mkdir -p /proyectos/opt/jenkins
chown 1000:1000 /proyectos/opt/jenkins

# El container `jenkins-medicget` corre como UID 1000 con acceso al
# socket de docker del host. Eso permite que las jobs hagan
# `docker compose build` sin docker-in-docker.
# Puerto 9090 en host (debe coincidir con deploy/nginx-host.conf que
# proxiea ci.medicget.io → 127.0.0.1:9090). Bind a 127.0.0.1 porque el
# tráfico externo entra por el nginx HOST con TLS.
docker rm -f jenkins-medicget 2>/dev/null || true

docker run -d \
  --name jenkins-medicget \
  --restart unless-stopped \
  -p 127.0.0.1:9090:8080 \
  -p 127.0.0.1:50000:50000 \
  -v /proyectos/opt/jenkins:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /usr/bin/docker:/usr/bin/docker \
  -v /proyectos/opt/medicget:/proyectos/opt/medicget \
  -e JENKINS_OPTS="--prefix=/" \
  -e JAVA_OPTS="-Dhudson.footerURL=https://ci.medicget.io" \
  jenkins/jenkins:lts-jdk17

echo ""
echo "Esperando a que Jenkins arranque (puede tardar ~60s)..."
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:9090/login &>/dev/null; then
    echo "✓ Jenkins UP"
    break
  fi
  sleep 4
done

# ─── 7. Nginx site config ────────────────────────────────────────────────────
echo ""
echo "[7/7] Configurando Nginx..."
if [ -f /proyectos/opt/medicget/deploy/nginx-host.conf ]; then
  cp /proyectos/opt/medicget/deploy/nginx-host.conf /etc/nginx/sites-available/medicget.conf
else
  echo "⚠ /proyectos/opt/medicget/deploy/nginx-host.conf no existe todavía."
  echo "  Después de clonar el repo, copiá el archivo manualmente:"
  echo "    sudo cp /proyectos/opt/medicget/deploy/nginx-host.conf /etc/nginx/sites-available/medicget.conf"
fi
[ -f /etc/nginx/sites-available/medicget.conf ] && \
  ln -sf /etc/nginx/sites-available/medicget.conf /etc/nginx/sites-enabled/medicget.conf
# Sacar el default para que no choque
rm -f /etc/nginx/sites-enabled/default
mkdir -p /var/www/certbot

# Antes de probar la config, hacemos un nginx-config dummy sin SSL para
# que el certbot pueda hacer el primer ACME challenge. El user después
# corre `certbot --nginx` y eso le agrega los listen 443 + paths a los
# certs definitivos. Por ahora solo escuchamos en 80 para el challenge.
if [ ! -f /etc/letsencrypt/live/medicget.io/fullchain.pem ]; then
  cat > /etc/nginx/sites-available/medicget-bootstrap.conf <<'BOOT'
server {
  listen 80;
  server_name medicget.io www.medicget.io ci.medicget.io;
  location /.well-known/acme-challenge/ { root /var/www/certbot; }
  location / { return 200 "Bootstrap OK — corré certbot ahora"; add_header Content-Type text/plain; }
}
BOOT
  ln -sf /etc/nginx/sites-available/medicget-bootstrap.conf /etc/nginx/sites-enabled/medicget-bootstrap.conf
  rm -f /etc/nginx/sites-enabled/medicget.conf
fi

nginx -t
systemctl reload nginx

# ─── Done ────────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════"
echo " ✓ Bootstrap completo."
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Siguientes pasos manuales (ver DEPLOY.md para detalle):"
echo ""
echo " 1. Verificá que tus DNS apuntan al VPS:"
echo "      dig +short medicget.io"
echo "      dig +short www.medicget.io"
echo "      dig +short ci.medicget.io"
echo "    Deberían devolver $(curl -s ifconfig.me)"
echo ""
echo " 2. Clonar el repo en /proyectos/opt/medicget:"
echo "      sudo -u deploy git clone <tu-repo-url> /proyectos/opt/medicget"
echo ""
echo " 3. Subir el .env de producción a /proyectos/opt/medicget/.env"
echo ""
echo " 4. Generar certificados SSL:"
echo "      sudo certbot --nginx -d medicget.io -d www.medicget.io"
echo "      sudo certbot --nginx -d ci.medicget.io"
echo "    Después aplicar la config final:"
echo "      sudo rm /etc/nginx/sites-enabled/medicget-bootstrap.conf"
echo "      sudo cp /proyectos/opt/medicget/deploy/nginx-host.conf /etc/nginx/sites-available/medicget.conf"
echo "      sudo ln -sf /etc/nginx/sites-available/medicget.conf /etc/nginx/sites-enabled/"
echo "      sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo " 5. Setup Jenkins (primer login):"
echo "      Contraseña inicial:"
echo "      docker exec jenkins-medicget cat /var/jenkins_home/secrets/initialAdminPassword"
echo "      (o desde el host: sudo cat /proyectos/opt/jenkins/secrets/initialAdminPassword)"
echo "      Ingresar a https://ci.medicget.io y completar el wizard."
echo ""
