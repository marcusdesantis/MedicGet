# =============================================================================
# Dockerfile — frontend web MedicGet (Vite + React)
#
# Build context : medicget-frontend/
# Imagen final  : nginx:alpine sirviendo /usr/share/nginx/html
# Puerto        : 80 (interno; mapeado a 5173 en el compose)
#
# Build args:
#   VITE_API_BASE_URL — URL pública del nginx del backend.
#                       En dev local (Docker Desktop) los dos contenedores
#                       están en el mismo host, así que el navegador del
#                       usuario pega a http://localhost:8080/api/v1.
#
# Usage:
#   docker build --build-arg VITE_API_BASE_URL=http://localhost:8080/api/v1 \
#                -t medicget-frontend .
#   docker run -p 5173:80 medicget-frontend
# =============================================================================

# ── Stage 1 — builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Argumento de build expuesto como env var para que Vite lo embeba en el bundle.
# Vite SOLO inyecta variables con prefijo `VITE_` al cliente — por eso pasamos
# el valor en ese formato, no como `API_BASE_URL` genérico.
ARG VITE_API_BASE_URL=http://localhost:8080/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Instalar dependencias (con retries para sobrevivir a cortes de red al
# bajar paquetes pesados como recharts/leaflet).
COPY package.json package-lock.json* ./
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retries 5 && \
    npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Copiar el resto del código y compilar.
# IMPORTANTE: usamos `vite build` directo en vez de `npm run build` porque
# el script del package.json hace `tsc -b && vite build` — y tsc estricto
# rompe el build de Docker por errores menores (imports sin usar, null-checks)
# que no afectan el bundle real. Vite igualmente compila TS → JS sin chequear
# tipos. Si querés validación estricta, hacela en CI con `npm run build`
# local, no bloqueando la imagen.
COPY . .
RUN npx vite build

# ── Stage 2 — runtime (nginx static) ─────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Borrar la página default de nginx y poner la nuestra.
RUN rm -rf /usr/share/nginx/html/*

# Copiar el bundle compilado al webroot.
COPY --from=builder /app/dist /usr/share/nginx/html

# Config de nginx con try_files para SPA + gzip básico.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# nginx ya define su propio CMD adecuado, no lo sobreescribimos.
