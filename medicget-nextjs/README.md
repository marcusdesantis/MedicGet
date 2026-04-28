# medicget-nextjs

Backend monorepo de medicget. Microservicios en Next.js 15 (App Router, solo API Routes), orquestados con Docker Compose y Nginx como reverse proxy.

## Estructura

```
medicget-nextjs/
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
├── packages/
│   └── shared/                Paquete @medicget/shared
│       ├── prisma/schema.prisma
│       └── src/               apiOk, apiError, withAuth, withRole, prisma
└── services/
    └── svc-auth/              Microservicio de autenticación
```

## Convenciones

- Routes delgadas: solo validan input con Zod y llaman al service.
- Toda la lógica vive en `modules/[recurso]/[recurso].service.ts`.
- Errores como objetos: `throw { code: 'NOT_FOUND', message: '...' }`.
- Respuestas siempre con `apiOk(data)` / `apiError(code, message)`.
- Schema Prisma único en `packages/shared/prisma/schema.prisma`.

## Desarrollo local

```bash
npm install
npm run prisma:generate
npm run dev:auth        # svc-auth en :4001
```

O todo con Docker:

```bash
npm run compose:up      # postgres + svc-auth + nginx (:8080)
```

Las rutas públicas pasan por nginx:

```
http://localhost:8080/api/v1/auth/*  →  svc-auth:4001
```
