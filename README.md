# medicget

Plataforma medicget. Tres proyectos independientes:

```
medicget/
├── docker-compose.yml       Orquestación completa (DB + backend + frontend)
├── medicget-frontend/       React + Vite + TS + Tailwind (web)
├── medicget-mobile/         Expo + React Native + TS + NativeWind
└── medicget-nextjs/         Backend microservicios Next.js 15 + Prisma + Postgres
```

## Stack

- **Frontend web**: React 18, Vite, TailwindCSS, React Router, Axios, Sonner, Lucide.
- **Móvil**: Expo + React Native, Expo Router, NativeWind, Axios.
- **Backend**: Next.js 15 (solo API Routes), TypeScript estricto, Prisma + PostgreSQL, 8 microservicios independientes orquestados con Docker Compose y Nginx como reverse proxy.

## Levantar todo con Docker (recomendado)

Desde el root del monorepo:

```bash
# Build + arranque de toda la plataforma
docker compose up -d --build

# Solo un servicio (después de un cambio)
docker compose up -d --build frontend
docker compose up -d --build svc-auth

# Logs en tiempo real
docker compose logs -f svc-auth

# Bajar todo
docker compose down
```

Una vez levantado:

- **Frontend web**: http://localhost:5173
- **API gateway (nginx)**: http://localhost:8080/api/v1/...
- **Postgres**: localhost:5433 (usuario `postgres`, password `1998jh`, db `medicget_dev`)

### Variables opcionales

Crear un `.env` al lado del `docker-compose.yml` para sobreescribir defaults:

```bash
# URL pública del backend (se embebe en el bundle del frontend)
VITE_API_BASE_URL=http://localhost:8080/api/v1
# URL del frontend (usada en links de email — verify, reset password)
FRONTEND_URL=http://localhost:5173
# Pasarela de pagos PayPhone (vacío = stub mode)
PAYPHONE_TOKEN=
PAYPHONE_STORE_ID=
# Comisión de la plataforma %
PLATFORM_FEE_PCT=10
```

## Desarrollo sin Docker

Cada proyecto se puede levantar de forma independiente con `npm`:

```bash
# Backend (postgres + microservicios + nginx en :8080)
cd medicget-nextjs
npm install
npm run prisma:generate
npm run compose:up      # alias de `docker compose -f ../docker-compose.yml up -d`

# Frontend web (:5173) en modo dev con hot reload
cd medicget-frontend
npm install
npm run dev

# Móvil (Expo) — abre QR para Expo Go o levanta emulador
cd medicget-mobile
npm install
npm run start
```

Cada subproyecto tiene su propio README con detalles.
