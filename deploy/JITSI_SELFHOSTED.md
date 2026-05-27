# Jitsi Meet self-hosted para MedicGet

Reemplaza `meet.jit.si` (que ahora exige login de moderador) por una
instancia propia **sin autenticación**: cualquiera con el link inicia y
entra, sin registrarse. El código de MedicGet **no cambia** — solo se
apunta `JITSI_BASE_URL` al dominio nuevo desde `/admin/settings`.

## Resultado

```
Paciente / Médico
   │  https://meet.medicget.io/medicget-<appointmentId>
   ▼
nginx HOST :443 (TLS)  ──►  jitsi-web :8000 (HTTP)  ──►  prosody / jicofo
                                                          jvb (media UDP 10000)
```

## Requisitos

- VPS con Docker (el mismo donde corre MedicGet, o uno aparte si querés
  aislar recursos — Jitsi/JVB consume RAM/CPU).
- **Recomendación de recursos:** para llamadas 1:1 médicas alcanza con
  ~1-2 GB de RAM libres. Si tu VPS de 4 GB ya está cargado con los 8
  microservicios + Jenkins, considerá un VPS chico dedicado solo a Jitsi.
- Puerto **UDP 10000** abierto al WAN (el media de las videollamadas).

---

## 1. DNS

Agregá un registro A:

| Tipo | Nombre              | Valor           |
| ---- | ------------------- | --------------- |
| A    | `meet.medicget.io`  | `89.117.58.101` |

Verificá: `dig +short meet.medicget.io` → debe devolver la IP del VPS.

## 2. Certificado TLS

El nginx HOST termina el TLS (no Jitsi). Generá el cert:

```bash
sudo certbot --nginx -d meet.medicget.io
```

> Si Certbot tira "Could not find a matching server block" (como pasó con
> `.eu`), no importa: el cert igual queda guardado en
> `/etc/letsencrypt/live/meet.medicget.io/`. El bloque server ya está en
> `deploy/nginx-host.conf`.

## 3. Levantar Jitsi

```bash
cd /proyectos/opt/medicget/deploy/jitsi

# Config
cp jitsi.env.example .env
nano .env          # poné la IP pública real en DOCKER_HOST_ADDRESS y JVB_ADVERTISE_IPS

# Secrets de componentes (los baja el repo oficial de docker-jitsi-meet).
# Si no tenés gen-passwords.sh, generalos a mano (ver más abajo).
curl -fsSL https://raw.githubusercontent.com/jitsi/docker-jitsi-meet/master/gen-passwords.sh -o gen-passwords.sh
chmod +x gen-passwords.sh
./gen-passwords.sh    # rellena JICOFO_*, JVB_*, etc. en el .env

# Carpeta de config persistente
mkdir -p ~/.jitsi-meet-cfg/{web,transcripts,prosody/config,prosody/prosody-plugins-custom,jicofo,jvb}

# Arrancar
docker compose up -d
docker compose ps      # los 4 (web/prosody/jicofo/jvb) deben quedar Up
```

### Generar secrets a mano (si no usás gen-passwords.sh)

```bash
# Por cada uno de estos, pegá un valor aleatorio en el .env:
openssl rand -hex 16   # JICOFO_COMPONENT_SECRET
openssl rand -hex 16   # JICOFO_AUTH_PASSWORD
openssl rand -hex 16   # JVB_AUTH_PASSWORD
openssl rand -hex 16   # JIGASI_XMPP_PASSWORD
openssl rand -hex 16   # JIBRI_RECORDER_PASSWORD
openssl rand -hex 16   # JIBRI_XMPP_PASSWORD
```

## 4. Firewall — abrir el puerto de media

```bash
sudo ufw allow 10000/udp
sudo ufw reload
sudo ufw status        # confirmá que 10000/udp está ALLOW
```

> **Sin esto el audio/video no fluye** aunque la sala cargue. Es el error
> #1 al self-hostear Jitsi.

## 5. Activar el nginx HOST definitivo (si no estaba)

```bash
sudo cp /proyectos/opt/medicget/deploy/nginx-host.conf /etc/nginx/sites-available/medicget.conf
sudo nginx -t && sudo systemctl reload nginx
```

## 6. Apuntar MedicGet al nuevo Jitsi

Sin redeploy — desde el panel admin:

1. Entrá a `https://medicget.io` como superadmin → **Configuración**.
2. En la sección de servicios, seteá `JITSI_BASE_URL` = `https://meet.medicget.io`.
3. Guardá. Las próximas citas ONLINE generan el link contra tu Jitsi.

> Alternativa por env (requiere recreate): en el `.env` de la app poné
> `JITSI_BASE_URL=https://meet.medicget.io` y
> `docker compose up -d svc-appointment`. Pero AppSettings (DB) gana sobre
> la env var, así que el paso 6.1-6.3 es el camino recomendado.

## 7. Probar

```bash
curl -I https://meet.medicget.io          # 200, sirve la SPA de Jitsi
```

En el navegador, abrí `https://meet.medicget.io/medicget-test123`:
- Debe entrar **directo a la sala, sin pedir login**.
- Probá audio/video con dos dispositivos. Si la sala carga pero no hay
  video → revisá el paso 4 (UDP 10000) y la IP en `DOCKER_HOST_ADDRESS`.

Después, en MedicGet, reservá y pagá una cita ONLINE de prueba → el email
y el botón "Unirme" deben apuntar a `meet.medicget.io`.

---

## Mantenimiento

```bash
# Logs
cd /proyectos/opt/medicget/deploy/jitsi && docker compose logs -f jvb

# Actualizar Jitsi (las imágenes usan tag `stable`)
docker compose pull && docker compose up -d

# Reiniciar
docker compose restart
```

## Troubleshooting

| Síntoma | Causa probable |
|---|---|
| Sala carga pero sin audio/video | UDP 10000 cerrado, o `DOCKER_HOST_ADDRESS`/`JVB_ADVERTISE_IPS` con IP equivocada |
| "Connection failed" al entrar | El nginx HOST no proxia bien los WebSockets — revisá el bloque `meet.medicget.io` en nginx-host.conf |
| Pide login de moderador | `ENABLE_AUTH` quedó en 1 — debe ser 0 |
| 502 Bad Gateway | El container `web` no está Up, o el puerto 8000 no coincide |

## Si preferís no mantener un servidor de media

Dejá `JITSI_BASE_URL` apuntando a un servicio gestionado (ej. la opción
Daily.co que evaluamos) o volvé a `meet.jit.si` asumiendo el login de
moderador. El self-hosted es la opción "free + sin registro" pero implica
operar la infra.
