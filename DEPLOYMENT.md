# Guía de despliegue — MedicGet en VPS con Jenkins

Esta guía documenta cómo levantar MedicGet (DB + 8 microservicios + frontend) en un VPS desde cero, con Jenkins haciendo CI/CD de deploy manual ("Build Now"). Toda la operación corre sobre HTTP + IP — sin dominio ni HTTPS, suficiente para una primera iteración. Los pasos para pasar a HTTPS están al final.

## Índice

1. [Arquitectura](#1-arquitectura)
2. [Pre-requisitos](#2-pre-requisitos)
3. [Subir el código a Git](#3-subir-el-código-a-git)
4. [Provisionar el VPS](#4-provisionar-el-vps)
5. [Clonar el repo en el VPS](#5-clonar-el-repo-en-el-vps)
6. [Configurar `.env` en el VPS](#6-configurar-env-en-el-vps)
7. [Ajustar CORS para el dominio público](#7-ajustar-cors-para-el-dominio-público)
8. [Primer arranque manual](#8-primer-arranque-manual)
9. [Configurar credenciales Git en el VPS](#9-configurar-credenciales-git-en-el-vps)
10. [Levantar Jenkins en Docker](#10-levantar-jenkins-en-docker)
11. [Configurar Jenkins por primera vez](#11-configurar-jenkins-por-primera-vez)
12. [Crear credenciales y el pipeline](#12-crear-credenciales-y-el-pipeline)
13. [Migraciones y seed de la DB](#13-migraciones-y-seed-de-la-db)
14. [Primer deploy](#14-primer-deploy)
15. [Workflow continuo](#15-workflow-continuo)
16. [Troubleshooting](#16-troubleshooting)
17. [Próximos pasos](#17-próximos-pasos)

---

## 1. Arquitectura

```
┌──────────────────────────────────────────────────────────────────┐
│                       VPS  (Ubuntu 22.04+)                        │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │  Stack MedicGet — orquestado por docker-compose.yml     │      │
│  │                                                          │      │
│  │  postgres ─┬─ svc-auth         (4001)                   │      │
│  │   :5433    ├─ svc-users        (4002)                   │      │
│  │            ├─ svc-clinic       (4003)                   │      │
│  │            ├─ svc-doctor       (4004)                   │      │
│  │            ├─ svc-patient      (4005)                   │      │
│  │            ├─ svc-appointment  (4006)                   │      │
│  │            ├─ svc-dashboard    (4007)                   │      │
│  │            └─ svc-admin        (4008)                   │      │
│  │                                                          │      │
│  │  nginx :8080 ─── reverse proxy → /api/v1/*              │      │
│  │  frontend :5173 ─── React + Vite (nginx static)         │      │
│  │  prisma (profile=tools) ─── migrate / seed one-shot      │      │
│  └─────────────────────────────────────────────────────────┘      │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │  Jenkins :9090 — pipeline declarativo                   │      │
│  │  Acceso al host docker.sock para correr docker compose   │      │
│  └─────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
                              ▲
                              │ git pull (Jenkins)
                              │
                       ┌──────┴──────┐
                       │   GitHub    │
                       └──────▲──────┘
                              │ git push
                              │
                       ┌──────┴──────┐
                       │ Máquina dev │
                       └─────────────┘
```

**Puertos expuestos al host:**

| Puerto | Servicio              | Descripción                                |
|--------|-----------------------|--------------------------------------------|
| 22     | SSH                   | Acceso administrativo                      |
| 5173   | frontend              | Web (React/Vite)                           |
| 5433   | postgres              | DB (mapeado 5433:5432 para no chocar)      |
| 8080   | nginx (API gateway)   | `/api/v1/*` → microservicios               |
| 9090   | Jenkins               | UI de CI/CD                                |
| 5555   | Prisma Studio         | Solo se abre on-demand para inspeccionar DB|

---

## 2. Pre-requisitos

- VPS con Ubuntu 22.04 / 24.04 y al menos **4 GB RAM** (con Jenkins building al mismo tiempo que docker compose, 2 GB se queda corto).
- Acceso SSH como root o como user con sudo.
- IP pública del VPS — la llamaremos `<VPS_IP>` en toda la guía.
- Proyecto subido a un repo Git (GitHub/GitLab/Bitbucket).

---

## 3. Subir el código a Git

Desde tu máquina local:

```bash
cd <ruta-del-proyecto>
git init
git add .
git commit -m "Initial: backend + frontend + mobile + docker setup"
git branch -M main           # o master, según convención
git remote add origin https://github.com/<usuario>/<repo>.git
git push -u origin main
```

**Importante:** asegurate de que `.gitignore` incluya `node_modules/`, `.next/`, `dist/`, `.env`, `.env.local`. El archivo `.env` con secretos **nunca** va a Git.

Si por error commiteás un `.env`, ver [Troubleshooting → .env en git](#env-commiteado-por-error).

---

## 4. Provisionar el VPS

### 4.1. Crear un usuario `deploy`

SSH al VPS como root:

```bash
ssh root@<VPS_IP>
```

Crear el usuario y darle sudo + acceso SSH:

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Volver a entrar como deploy:

```bash
exit
ssh deploy@<VPS_IP>
```

### 4.2. Instalar Docker

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

### 4.3. Abrir puertos del firewall

```bash
sudo ufw allow 22/tcp        # SSH
sudo ufw allow 8080/tcp      # nginx (API gateway)
sudo ufw allow 5173/tcp      # frontend
sudo ufw allow 9090/tcp      # Jenkins
sudo ufw enable
sudo ufw status
```

---

## 5. Clonar el repo en el VPS

```bash
sudo mkdir -p /proyectos/opt/medicget
sudo chown deploy:deploy /proyectos/opt/medicget
cd /proyectos/opt
git clone https://github.com/<usuario>/<repo>.git medicget
cd medicget
```

Si el repo es **privado**, usar un Personal Access Token de GitHub para clonar:

```bash
git clone https://<usuario>:<TOKEN>@github.com/<usuario>/<repo>.git medicget
```

Más adelante migramos a SSH keys (ver [paso 9](#9-configurar-credenciales-git-en-el-vps)).

---

## 6. Configurar `.env` en el VPS

```bash
cd /proyectos/opt/medicget
nano .env
```

Pegar (reemplazando `<VPS_IP>`):

```bash
VITE_API_BASE_URL=http://<VPS_IP>:8080/api/v1
FRONTEND_URL=http://<VPS_IP>:5173
JITSI_BASE_URL=https://meet.jit.si
PAYPHONE_TOKEN=
PAYPHONE_STORE_ID=
PAYPHONE_BASE_URL=https://pay.payphonetodoesposible.com/api
PLATFORM_FEE_PCT=10
```

**Este archivo NO va a Git.** Está excluido por el `.gitignore` y por el `--exclude='.env'` del rsync en el Jenkinsfile.

---

## 7. Ajustar CORS para el dominio público

El backend solo acepta requests desde origins en su allowlist. Editar `medicget-nextjs/nginx/nginx.conf` y agregar la IP del VPS al bloque `map $http_origin`:

```nginx
map $http_origin $cors_origin {
  default                       "";
  "http://localhost:3000"       $http_origin;
  "http://localhost:5173"       $http_origin;
  "http://<VPS_IP>:5173"        $http_origin;
}
```

Hacer commit + push desde tu máquina local. Cuando Jenkins corra el siguiente deploy, va a sincronizar este cambio al VPS.

---

## 8. Primer arranque manual

Antes de Jenkins, verificar que el stack levanta a mano:

```bash
cd /proyectos/opt/medicget
docker compose up -d --build
docker compose ps
```

Esto tarda 5-15 min la primera vez (descarga imágenes base + builds de las 9 imágenes). Cuando todos los servicios estén `Up`:

- `http://<VPS_IP>:5173` → frontend (puede mostrar errores de API hasta que migres la DB).
- `http://<VPS_IP>:8080/health` → debería responder `ok`.

Para diagnosticar:

```bash
docker compose logs -f svc-auth
docker compose logs -f frontend
```

---

## 9. Configurar credenciales Git en el VPS

Para que Jenkins (y vos en SSH) puedan hacer `git pull`/`push` sin pedir password cada vez:

### Opción A — SSH key (recomendado)

```bash
ssh-keygen -t ed25519 -C "deploy@medicget-vps" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Copiar la salida y agregarla en GitHub:

- **Personal key** (sirve para todos tus repos): GitHub → Settings → SSH and GPG keys → New SSH key.
- **Deploy key** (recomendado, scoped al repo): el repo → Settings → Deploy keys → Add deploy key. Marcar `Allow write access`.

Verificar:

```bash
ssh -T git@github.com
```

Cambiar el remote del repo a SSH:

```bash
cd /proyectos/opt/medicget
git remote set-url origin git@github.com:<usuario>/<repo>.git
```

### Opción B — PAT con credential helper (fallback)

```bash
git config --global credential.helper store
git push        # te pide user (tu usuario GitHub) y pass (tu PAT)
```

Las credenciales se guardan en texto plano en `~/.git-credentials`. Menos seguro que SSH.

---

## 10. Levantar Jenkins en Docker

Jenkins corre en su propio container, separado del stack de la app. Necesita acceso al docker.sock del host + rsync + docker-compose-plugin para correr el pipeline.

### 10.1. Crear las carpetas

```bash
sudo mkdir -p /proyectos/opt/jenkins/{home,compose}
sudo chown -R 1000:1000 /proyectos/opt/jenkins/home   # UID jenkins del container
```

### 10.2. Dockerfile custom de Jenkins

`/proyectos/opt/jenkins/Dockerfile`:

```dockerfile
FROM jenkins/jenkins:lts-jdk17

USER root

# rsync — usado por el pipeline para sync workspace → /proyectos/opt/medicget.
# docker-compose-plugin — para que `docker compose` funcione dentro del container.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        rsync \
        ca-certificates \
        curl \
        gnupg && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
         https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
        > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends docker-compose-plugin && \
    rm -rf /var/lib/apt/lists/*

USER jenkins
```

### 10.3. docker-compose.yml de Jenkins

`/proyectos/opt/jenkins/compose/docker-compose.yml`:

```yaml
services:
  jenkins:
    build:
      context: ..
      dockerfile: Dockerfile
    container_name: jenkins
    restart: unless-stopped
    user: root
    ports:
      - "9090:8080"
      - "50000:50000"
    volumes:
      - /proyectos/opt/jenkins/home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
      - /usr/bin/docker:/usr/bin/docker:ro
      - /proyectos/opt/medicget:/proyectos/opt/medicget
    environment:
      JAVA_OPTS: "-Djenkins.install.runSetupWizard=true"
```

### 10.4. Arrancar Jenkins

```bash
cd /proyectos/opt/jenkins/compose
docker compose up -d --build
docker compose logs -f jenkins      # esperar "Jenkins is fully up and running"
```

### 10.5. Verificar las herramientas

```bash
docker exec jenkins rsync --version | head -1
docker exec jenkins docker compose version
```

Ambos comandos tienen que devolver una versión.

---

## 11. Configurar Jenkins por primera vez

### 11.1. Obtener el password inicial

El secret está protegido y el user del host no puede leerlo directamente. Usar `docker exec`:

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Copiar el hash.

### 11.2. Wizard de instalación

Abrir `http://<VPS_IP>:9090` en el navegador.

1. Pegar el password inicial.
2. Elegir **"Install suggested plugins"** (git, pipeline, credentials, ~30 plugins). Tarda 2-3 min.
3. Crear el user admin. Anotar las credenciales — de acá en más vas a entrar con eso.
4. Confirmar la URL como `http://<VPS_IP>:9090/`.

### 11.3. Plugins adicionales

En **Manage Jenkins → Plugins → Available plugins**, instalar si no vinieron con los suggested:

- **Docker Pipeline**
- **SSH Agent** (para deploys a hosts remotos en el futuro)

Reiniciar Jenkins cuando termine.

---

## 12. Crear credenciales y el pipeline

### 12.1. Credenciales de GitHub

**Manage Jenkins → Credentials → System → Global credentials → Add credentials**:

- Si el repo es privado: tipo **Username with password**. User: tu GitHub user. Password: un Personal Access Token con scope `repo`. ID: `github-creds`.
- Si usaste SSH key (paso 9A), no hace falta credenciales acá — pero el remote del job tiene que ser `git@github.com:...`.

Para secrets sensibles del proyecto (PayPhone, SMTP), podés crear **Secret text** con IDs descriptivos. Después se inyectan al pipeline con `withCredentials`.

### 12.2. Crear el pipeline

**New Item** → Nombre: `medicget-deploy` → Tipo: **Pipeline** → OK.

En la configuración:

- **Build Triggers**: dejar desmarcado (deploy manual con "Build Now").
- **Pipeline**:
  - Definition: `Pipeline script from SCM`
  - SCM: `Git`
  - Repository URL: `git@github.com:<usuario>/<repo>.git` (SSH) o HTTPS
  - Credentials: `github-creds` si privado HTTPS, `- none -` si SSH/público
  - Branch: `*/main` (o `*/master`)
  - Script Path: `Jenkinsfile`

**Save**.

---

## 13. Migraciones y seed de la DB

El proyecto incluye un container dedicado `prisma` (build context `./medicget-nextjs/docker/Dockerfile.prisma`) que NO arranca con `docker compose up` porque tiene `profiles: ["tools"]`. Se invoca on-demand.

### 13.1. Migraciones automáticas

Cada `Build Now` de Jenkins corre el stage `Run DB migrations` automáticamente — aplica las migraciones pendientes ANTES de levantar los servicios. Esto evita que el código nuevo intente usar tablas que aún no existen.

El comando que ejecuta es:

```bash
docker compose --profile tools build prisma
docker compose --profile tools run --rm prisma
```

Por default ejecuta `npm run prisma:deploy` dentro del container, que corresponde a `prisma migrate deploy` — idempotente, seguro de correr en cada deploy.

### 13.2. Correr seed manualmente

El seed NO se ejecuta automáticamente porque suele ser destructivo (o idempotente, depende del script). Para correrlo:

```bash
cd /proyectos/opt/medicget
docker compose --profile tools run --rm prisma prisma:seed
```

### 13.3. Abrir Prisma Studio

Útil para inspeccionar/editar la DB visualmente desde el navegador:

```bash
# Abrir puerto en UFW (solo una vez)
sudo ufw allow 5555/tcp

# Levantar Studio (deja la terminal ocupada — Ctrl+C para cerrar)
cd /proyectos/opt/medicget
docker compose --profile tools run --rm -p 5555:5555 prisma prisma:studio
```

Abrí `http://<VPS_IP>:5555` en tu navegador.

### 13.4. Ver el estado de migraciones

```bash
docker compose --profile tools run --rm prisma sh -c \
  "cd packages/shared && npx prisma migrate status --schema=./prisma/schema.prisma"
```

---

## 14. Primer deploy

En Jenkins UI → tu job `medicget-deploy` → **Build Now**.

El pipeline tiene 4 stages:

1. **Checkout** — Jenkins clona el repo en su workspace.
2. **Sync sources to /proyectos/opt/medicget** — rsync del workspace al directorio de deploy (excluye `.env`, `.git`, `node_modules`).
3. **Run DB migrations** — ejecuta `prisma migrate deploy`.
4. **Build & deploy** — `docker compose up -d --build --remove-orphans`.
5. **Health check** — espera hasta 60s a que `http://localhost:8080/health` responda OK.

La primera vez tarda 15-20 min (build de las 9 imágenes). Las siguientes, 1-3 min porque Docker cachea las capas.

Cuando termine OK:

- `http://<VPS_IP>:5173` → frontend con la app deployada.
- `http://<VPS_IP>:8080/api/v1/...` → backend.

---

## 15. Workflow continuo

```
[Tu máquina local]                  [GitHub]                  [VPS]
─────────────────                   ────────                  ─────
edit + commit + push  ──────────>   main branch
                                       │
                                       │
                                       ▼
                                   [Jenkins :9090]
                                       │ click "Build Now"
                                       ▼
                                   git pull
                                   rsync workspace → /proyectos/opt/medicget
                                   docker compose --profile tools run prisma
                                   docker compose up -d --build
                                       │
                                       ▼
                                   app actualizada
```

**Regla de oro:** el código se edita en tu máquina local y se sube a Git. El VPS solo recibe deploys via Jenkins. NO editar archivos directamente en `/proyectos/opt/medicget/` porque el siguiente `rsync` los va a sobreescribir (excepto `.env`, que está excluido).

---

## 16. Troubleshooting

### `docker compose: not found` dentro de Jenkins

La imagen `jenkins/jenkins:lts` no trae el plugin de compose por default. La solución está en [10.2 — Dockerfile custom](#102-dockerfile-custom-de-jenkins). Si ya estabas usando la imagen oficial sin Dockerfile, rebuildeá Jenkins:

```bash
cd /proyectos/opt/jenkins/compose
docker compose down
docker compose up -d --build
```

### `rsync: not found` dentro de Jenkins

Misma causa, misma solución que `docker compose`. Rebuildear con el Dockerfile custom.

### `Permission denied` al leer `secrets/initialAdminPassword`

El directorio está protegido. Usar `docker exec`:

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### `.env` commiteado por error

Si todavía NO pushaste:

```bash
git reset --soft HEAD~1                          # deshacer commit
git restore --staged .env                        # sacar .env del staging
echo '.env' >> .gitignore
echo '.env.local' >> .gitignore
git add .gitignore                               # commitear solo el gitignore
git commit -m "ignore .env files"
```

Si **YA pushaste**, considerá los secretos comprometidos: rotalos (DB password, JWT_SECRET, SMTP pass, PayPhone token) y limpiá el historial con `git filter-repo` o BFG.

### El build del frontend falla por errores TypeScript

El `npm run build` del frontend corre `tsc -b && vite build`. Si tu código tiene errores de TS, falla el build. El Dockerfile usa `npx vite build` directo (sin tsc) para no bloquear el deploy. El typecheck queda para tu IDE / pre-commit.

### El stage de migraciones falla

Revisar el log del stage. Errores típicos:

- **`P1001: Can't reach database server`** — postgres no está healthy. Ver `docker compose logs postgres`.
- **`P3009: migrate found failed migrations`** — alguna migración previa quedó en estado `FAILED`. Hay que arreglarla a mano:
  ```bash
  docker compose --profile tools run --rm prisma sh -c \
    "cd packages/shared && npx prisma migrate resolve --rolled-back <migration_name> --schema=./prisma/schema.prisma"
  ```
- **Error de SQL en una migración** — la migración tiene un bug. Editarla en `medicget-nextjs/packages/shared/prisma/migrations/`, commit, push, re-Build Now.

### "Sesión expirada" / 401 al loguearse en el frontend

Probablemente el frontend está pegando a una API URL mal. Revisar:

```bash
docker exec medicget-frontend sh -c "grep -r VITE_API_BASE_URL /usr/share/nginx/html/ 2>/dev/null | head -5"
```

Tiene que aparecer `http://<VPS_IP>:8080/api/v1` ahí. Si dice `localhost`, el build del frontend usó el default. Rebuildear pasando la env:

```bash
VITE_API_BASE_URL=http://<VPS_IP>:8080/api/v1 docker compose up -d --build frontend
```

O mejor: agregarlo al `.env` del root y dejar que Jenkins lo recoja en el próximo deploy.

### Las migraciones se aplicaron pero el código viejo sigue corriendo

Probablemente el stage de Build no rebuildeó las imágenes. Forzá un rebuild limpio:

```bash
cd /proyectos/opt/medicget
docker compose build --no-cache
docker compose up -d --force-recreate
```

---

## 17. Próximos pasos

Una vez que el flujo básico funciona, lo natural es ir incorporando esto:

### 17.1. HTTPS + dominio

Sin HTTPS no podés tener:
- Webhooks de GitHub para auto-deploy en cada push.
- PayPhone Cajita en producción (exige HTTPS).
- Web Push notifications.
- SecureStore en la app móvil con cualquier API que no sea localhost.

Opciones baratas:
- **DuckDNS** + **Caddy** + **Let's Encrypt**: subdominio gratis tipo `medicget.duckdns.org`, certs automáticos, 15 min de setup.
- **Dominio propio** (1-3 USD/año en Namecheap) + mismo Caddy/Traefik.

### 17.2. Auto-deploy en cada push

Con HTTPS configurado, en GitHub → Settings → Webhooks añadir:
- URL: `https://ci.tudominio.com/github-webhook/`
- Content type: `application/json`
- Trigger: `Just the push event`

En Jenkins → tu job → Build Triggers → marcar **"GitHub hook trigger for GITScm polling"**.

A partir de ahí, cada `git push` dispara el deploy automáticamente.

### 17.3. Multi-environment

Branch `staging` deploya a `/proyectos/opt/medicget-staging/` con otros puertos (5273, 8180, etc.). Útil para QA antes de producción.

### 17.4. Backups de Postgres

```bash
# Backup manual (one-shot)
docker exec medicget-postgres pg_dump -U postgres medicget_dev > backup-$(date +%F).sql

# Backup automático con cron (diario a las 3 AM):
# crontab -e
0 3 * * * cd /proyectos/opt/medicget && docker exec medicget-postgres pg_dump -U postgres medicget_dev | gzip > /var/backups/medicget-$(date +\%F).sql.gz
```

Mejor: pushear los dumps a S3/Backblaze para que sobrevivan a una pérdida total del VPS.

### 17.5. Logs centralizados

Para no andar haciendo `docker compose logs -f` a mano:
- **Loki + Grafana** (self-hosted, gratis).
- **Logtail / Better Stack** (managed, free tier).
- **Papertrail** (managed, free tier).

### 17.6. Métricas y alertas

- **Prometheus + Grafana** para métricas de los containers.
- **Uptime Kuma** (super liviano) para alertas si algún endpoint cae — `http://<VPS_IP>:8080/health` y `http://<VPS_IP>:5173/`.

---

## Referencias rápidas

| Acción                                | Comando                                                            |
|---------------------------------------|--------------------------------------------------------------------|
| Ver containers corriendo              | `docker compose ps`                                                |
| Logs en tiempo real                   | `docker compose logs -f <servicio>`                                |
| Restart de un servicio                | `docker compose restart <servicio>`                                |
| Rebuild de un servicio                | `docker compose up -d --build <servicio>`                          |
| Apagar todo                           | `docker compose down`                                              |
| Migraciones                           | `docker compose --profile tools run --rm prisma`                   |
| Seed                                  | `docker compose --profile tools run --rm prisma prisma:seed`       |
| Prisma Studio                         | `docker compose --profile tools run --rm -p 5555:5555 prisma prisma:studio` |
| Bash adentro de un servicio           | `docker compose exec <servicio> sh`                                |
| Backup de la DB                       | `docker exec medicget-postgres pg_dump -U postgres medicget_dev > backup.sql` |
| Restaurar dump                        | `cat backup.sql \| docker exec -i medicget-postgres psql -U postgres medicget_dev` |
| Ver el password inicial de Jenkins    | `docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword` |
| Liberar disco (capas huérfanas)       | `docker image prune -f`                                            |
| Liberar disco (TODO lo no usado)      | `docker system prune -a -f --volumes` (⚠ borra volúmenes también)  |


# Comando para migraciones

docker compose --profile tools run --rm prisma prisma:seed