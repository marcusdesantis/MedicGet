# medicget

Plataforma medicget. Tres proyectos independientes:

```
medicget/
├── medicget-frontend/    React + Vite + TS + Tailwind (web)
├── medicget-mobile/      Expo + React Native + TS + NativeWind
└── medicget-nextjs/      Backend microservicios Next.js 15 + Prisma + Postgres
```

## Stack

- **Frontend web**: React 18, Vite, TailwindCSS, React Router, Axios, Sonner, Lucide.
- **Móvil**: Expo + React Native, Expo Router, NativeWind, Axios.
- **Backend**: Next.js 15 (solo API Routes), TypeScript estricto, Prisma + PostgreSQL, microservicios independientes orquestados con Docker Compose y Nginx como reverse proxy.

## Cómo arrancar

Cada proyecto se levanta de forma independiente:

```bash
# backend (postgres + microservicios + nginx en :8080)
cd medicget-nextjs
npm install
npm run prisma:generate
npm run compose:up

# frontend web (:5173)
cd medicget-frontend
npm install
npm run dev

# móvil
cd medicget-mobile
npm install
npm run start
```

Cada subproyecto tiene su propio README con detalles.
