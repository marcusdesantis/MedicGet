# Despliegue de MedicGet — `medicget.io`

Guía completa para desplegar MedicGet en un VPS con dominio propio y Jenkins
para deploys automáticos desde `main`.

**Stack final:**

```
Internet
   │
   ▼
Nginx (host, :80/:443) — SSL termination, reverse proxy
   ├─→ 127.0.0.1:8080  Docker compose interno (nginx → microservicios + frontend)
   └─→ 127.0.0.1:8081  Jenkins
```

**Rutas en el VPS:**

| Path                        | Contenido                                       |
| --------------------------- | ----------------------------------------------- |
| `/proyectos/opt/medicget`   | Código de la app (clone del repo) + `.env`      |
| `/proyectos/opt/jenkins`    | `JENKINS_HOME` (configuración, jobs, plugins, builds) |
| `/etc/nginx/sites-enabled/` | Configuración Nginx host                        |
| `/etc/letsencrypt/`         | Certificados SSL                                |

---

## 0. Pre-requisitos

- VPS con Ubuntu 22.04 LTS y al menos **4 GB RAM** (Jenkins + Docker + 9 servicios pesan).
- Dominio `medicget.io` con acceso al panel DNS.
- Repositorio Git accesible (GitHub/GitLab) con el código del proyecto.
- IP pública del VPS: `89.117.58.101` (cambiala si la tuya es otra).

---

## 1. Configurar DNS

Entrá al panel de tu registrador de dominio y agregá 3 registros tipo **A**:

| Tipo | Nombre              | Valor              | TTL |
| ---- | ------------------- | ------------------ | --- |
| A    | `medicget.io`       | `89.117.58.101`    | 300 |
| A    | `www.medicget.io`   | `89.117.58.101`    | 300 |
| A    | `ci.medicget.io`    | `89.117.58.101`    | 300 |

Esperá 5-10 minutos para que propague. Verificá desde tu PC:

```bash
dig +short medicget.io
dig +short ci.medicget.io
```

Ambos tienen que devolver `89.117.58.101`.

---

## 2. Bootstrap del VPS (una sola vez)

Conectate por SSH al VPS:

```bash
ssh root@89.117.58.101
```

Copiá el script `setup-vps.sh` al servidor (o cloná el repo entero):

```bash
# Opción A — clonar el repo entero (recomendado):
cd /tmp
git clone https://github.com/TU-USER/TU-REPO.git medicget-source
sudo bash medicget-source/deploy/setup-vps.sh

# Opción B — scp solo el script:
# (desde tu PC) scp deploy/setup-vps.sh root@89.117.58.101:/tmp/
# sudo bash /tmp/setup-vps.sh
```

El script hace todo automáticamente:
- Instala Docker + Docker Compose
- Instala Nginx + Certbot
- Crea usuario `deploy` (con permisos para docker)
- Configura firewall (abre solo 22, 80, 443)
- Levanta Jenkins en `127.0.0.1:8081`
- Deja una config Nginx mínima para que Certbot funcione

Al final imprime los siguientes pasos. No los saltes.

---

## 3. Clonar el repo en `/proyectos/opt/medicget`

```bash
sudo -u deploy git clone https://github.com/TU-USER/TU-REPO.git /proyectos/opt/medicget
```

Si el repo es privado, configurá una llave SSH para el usuario `deploy`:

```bash
sudo -u deploy ssh-keygen -t ed25519 -C "deploy@medicget"
sudo cat /home/deploy/.ssh/id_ed25519.pub
# Agregá esa llave como Deploy Key en GitHub/GitLab (read-only).
```

---

## 4. Subir el archivo `.env` de producción

El `.env` NO está en el repo (está en `.gitignore`). Tenés que crearlo
manualmente con los secrets reales:

```bash
sudo nano /proyectos/opt/medicget/.env
```

Contenido mínimo:

```env
# ─── Database ─────────────────────────────────────────────────────────
DATABASE_URL=postgresql://medicget:STRONG_PASSWORD@db:5432/medicget?schema=public
POSTGRES_USER=medicget
POSTGRES_PASSWORD=STRONG_PASSWORD
POSTGRES_DB=medicget

# ─── Auth ─────────────────────────────────────────────────────────────
JWT_SECRET=GENERAR_ALEATORIO_64_CHARS_CON_openssl_rand_-hex_32

# ─── SMTP (notificaciones, recuperación de contraseña) ────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=soportemedicget@abisoft.it
SMTP_PASS=app-password-de-gmail

# ─── PayPhone (pasarela de pagos) ─────────────────────────────────────
PAYPHONE_API_TOKEN=...
PAYPHONE_STORE_ID=...
PAYPHONE_RETURN_URL=https://medicget.io/payment/return

# ─── App URLs ─────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://medicget.io
VITE_API_BASE_URL=https://medicget.io/api/v1
NODE_ENV=production
```

Permisos:

```bash
sudo chown deploy:deploy /proyectos/opt/medicget/.env
sudo chmod 600 /proyectos/opt/medicget/.env
```

---

## 5. Generar certificados SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d medicget.io -d www.medicget.io
sudo certbot --nginx -d ci.medicget.io
```

Certbot te va a pedir un email (para alertas de expiración) y aceptar los TOS.
Elegí la opción que redirige HTTP → HTTPS.

Verificar:

```bash
sudo certbot certificates
# Tiene que mostrar los 3 certs con expiración en ~90 días.
```

Los certs se renuevan solos via systemd timer (ya viene activado).

---

## 6. Activar la config Nginx definitiva

El bootstrap dejó una config mínima para el ACME challenge. Ahora la
reemplazamos por la definitiva con SSL + reverse proxy:

```bash
sudo rm /etc/nginx/sites-enabled/medicget-bootstrap.conf
sudo cp /proyectos/opt/medicget/deploy/nginx-host.conf /etc/nginx/sites-available/medicget.conf
sudo ln -sf /etc/nginx/sites-available/medicget.conf /etc/nginx/sites-enabled/medicget.conf
sudo nginx -t
sudo systemctl reload nginx
```

Probar:

```bash
curl -I https://medicget.io
# HTTP/2 200
curl -I https://ci.medicget.io
# HTTP/2 200 (login de Jenkins)
```

---

## 7. Primer build manual (sin Jenkins)

Antes de configurar Jenkins, levantá la app a mano para confirmar que todo
funciona:

```bash
cd /proyectos/opt/medicget
sudo -u deploy docker compose pull --ignore-pull-failures
sudo -u deploy docker compose up -d --build
sudo -u deploy docker compose ps
```

Esperá 1-2 minutos a que todos los servicios estén `running`.

Aplicá migraciones Prisma:

```bash
sudo -u deploy docker compose --profile tools build prisma
sudo -u deploy docker compose --profile tools run --rm prisma
```

Entrá a `https://medicget.io` desde el browser — debería cargar la landing.

---

## 8. Configurar Jenkins

### 8.1 Primer login

```bash
docker exec jenkins-medicget cat /var/jenkins_home/secrets/initialAdminPassword
```

Copiá la contraseña y andá a `https://ci.medicget.io`.

Pasos del wizard:

1. Pegá la contraseña inicial.
2. **Install suggested plugins** → instala lo básico.
3. Crear usuario admin (anotalo bien, no se puede recuperar fácil).
4. Confirmar la URL: `https://ci.medicget.io/`.

### 8.2 Plugins adicionales

Manage Jenkins → Plugins → Available, instalá:

- **Pipeline: Stage View**
- **GitHub** (suele venir con suggested)
- **Credentials Binding**
- **Timestamper** (opcional pero útil para logs)

### 8.3 Credenciales

Manage Jenkins → Credentials → System → Global → Add Credentials:

1. **Tipo: SSH Username with private key**
   - ID: `medicget-github-ssh`
   - Username: `git`
   - Private Key: pegá la `id_ed25519` del usuario `deploy` que generaste en paso 3.
   - (Solo si el repo es privado).

2. **Tipo: Secret file**
   - ID: `medicget-env-file`
   - File: subí el `/proyectos/opt/medicget/.env`
   - (Esto es por si el Jenkinsfile lo necesita; opcional porque el `.env`
     ya vive en `/proyectos/opt/medicget` y el job lo lee directo).

### 8.4 Crear el job de deploy

New Item → **Pipeline** → nombre `medicget-deploy`.

**Configuración:**

- **GitHub project** → marcalo y pegá la URL de tu repo (sin `.git`).
- **Build Triggers** → ✓ **GitHub hook trigger for GITScm polling**
- **Pipeline**:
  - Definition: **Pipeline script from SCM**
  - SCM: **Git**
  - Repository URL: `git@github.com:TU-USER/TU-REPO.git` (o https si público)
  - Credentials: `medicget-github-ssh` (si privado)
  - Branch: `*/main`
  - Script Path: `Jenkinsfile`

Guardar.

### 8.5 Webhook en GitHub

En tu repo: Settings → Webhooks → **Add webhook**:

- **Payload URL**: `https://ci.medicget.io/github-webhook/`
- **Content type**: `application/json`
- **Which events**: Just the push event
- ✓ Active

Hacé un push a `main` (cualquier cambio) y andá a `https://ci.medicget.io/job/medicget-deploy/` —
tiene que arrancar un build solo.

---

## 9. Verificación final

| Test                                | Cómo probar                                              | Esperado            |
| ----------------------------------- | -------------------------------------------------------- | ------------------- |
| Frontend carga                      | `curl -I https://medicget.io`                            | HTTP/2 200          |
| Backend responde                    | `curl https://medicget.io/api/v1/health`                 | `{"ok":true}` o similar |
| SSL válido                          | Browser → candado verde                                  | sin warnings        |
| Jenkins accesible                   | `https://ci.medicget.io/login`                           | login page          |
| Push triggers build                 | `git push origin main`                                   | build inicia ~5s    |
| DB migration aplicada               | `docker compose logs db \| grep "ready to accept"`       | listo               |

---

## 10. Apuntar el app mobile al dominio nuevo

En `medicget-mobile/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=https://medicget.io/api/v1
```

Y regenerar el APK con:

```bash
cd medicget-mobile
npx expo prebuild --clean
cd android && ./gradlew assembleRelease
# El APK queda en android/app/build/outputs/apk/release/app-release.apk
```

---

## 11. Mantenimiento

### Logs en vivo

```bash
sudo -u deploy docker compose -f /proyectos/opt/medicget/docker-compose.yml logs -f --tail=100
```

### Reiniciar un servicio puntual

```bash
sudo -u deploy docker compose -f /proyectos/opt/medicget/docker-compose.yml restart svc-doctor
```

### Backup de la DB

```bash
sudo -u deploy docker compose exec db pg_dump -U medicget medicget > backup-$(date +%F).sql
```

### Renovación SSL manual (solo si falla la auto)

```bash
sudo certbot renew --dry-run        # test
sudo certbot renew                  # real
sudo systemctl reload nginx
```

### Actualizar Jenkins

```bash
docker pull jenkins/jenkins:lts-jdk17
docker stop jenkins-medicget
docker rm jenkins-medicget
# Volver a correr el `docker run -d --name jenkins-medicget ...` del setup-vps.sh
```

---

## 12. Troubleshooting

**El webhook de GitHub no dispara builds:**

- Verificá en GitHub → Settings → Webhooks → el último delivery: tiene que ser 200.
- Si es 403: en Jenkins → Manage Jenkins → Configure Global Security, activá
  "Allow anonymous read access" o setea el endpoint del webhook como público.

**`docker compose build` se queda colgado:**

- Memoria insuficiente. Free RAM con `docker system prune -af`.
- O hacé build secuencial con `COMPOSE_PARALLEL_LIMIT=1`.

**Certificado SSL no se renueva:**

```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

**El frontend tira "Mixed Content" en el browser:**

- Verificá que `VITE_API_BASE_URL` empieza con `https://` (no `http://`).
- Rebuildeá el frontend después de cambiar el `.env`.
