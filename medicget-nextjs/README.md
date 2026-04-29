# medicget-nextjs

Backend monorepo for MedicGet. Seven Next.js 15 API-only microservices behind an Nginx gateway on port 8080, backed by PostgreSQL 16.

## Architecture

```
medicget-nextjs/
├── docker-compose.yml             All services + postgres + nginx
├── nginx/nginx.conf               API gateway routing
├── packages/
│   └── shared/                    @medicget/shared
│       ├── prisma/
│       │   ├── schema.prisma      Single source of truth for all models
│       │   └── seed.ts            Demo data (clinic, 3 doctors, 3 patients, appointments)
│       └── src/
│           ├── auth.ts            withAuth, withRole, signToken, AuthUser
│           ├── env.ts             requireEnv / optionalEnv
│           ├── errors.ts          ServiceError type
│           ├── paginate.ts        parsePagination, paginate, toSkipTake
│           ├── prisma.ts          Singleton PrismaClient
│           ├── response.ts        apiOk / apiError
│           └── validate.ts        parseBody (Zod)
└── services/
    ├── svc-auth/        :4001   auth/login/register/me
    ├── svc-users/       :4002   users + profiles (CLINIC only)
    ├── svc-clinic/      :4003   clinic management
    ├── svc-doctor/      :4004   doctors, availability, slots, reviews
    ├── svc-patient/     :4005   patients, notifications
    ├── svc-appointment/ :4006   appointments CRUD + payment + review
    └── svc-dashboard/   :4007   aggregated stats per role
```

### Nginx routing (port 8080)

| Path prefix               | Upstream service      |
|---------------------------|-----------------------|
| `/api/v1/auth/*`          | svc-auth :4001        |
| `/api/v1/users/*`         | svc-users :4002       |
| `/api/v1/clinics/*`       | svc-clinic :4003      |
| `/api/v1/doctors/*`       | svc-doctor :4004      |
| `/api/v1/patients/*`      | svc-patient :4005     |
| `/api/v1/appointments/*`  | svc-appointment :4006 |
| `/api/v1/dashboard/*`     | svc-dashboard :4007   |

---

## Docker workflow (primary)

### 1. First-time setup — build and start everything

```bash
# From medicget-nextjs/
docker compose up -d --build
```

Builds all 7 service images, starts postgres, waits for it to be healthy, then starts all services and nginx.

### 2. Run migrations + seed (first time only)

```bash
# Apply Prisma migrations
docker exec -it medicget-svc-auth \
  npx prisma migrate deploy \
  --schema=./packages/shared/prisma/schema.prisma

# Seed demo data
docker exec -it medicget-svc-auth \
  npx ts-node packages/shared/prisma/seed.ts
```

### 3. Rebuild a single service

```bash
docker compose up -d --build svc-auth
docker compose up -d --build svc-doctor
# any service name works
```

### 4. Common day-to-day commands

```bash
# Start all (already built)
docker compose up -d
npm run compose:up        # shortcut

# View all logs
docker compose logs -f
npm run compose:logs      # shortcut

# View logs for one service
docker compose logs -f svc-appointment

# Stop everything
docker compose down
npm run compose:down      # shortcut

# Stop + wipe volumes (resets the database)
docker compose down -v

# Restart one service without rebuilding
docker compose restart svc-users
```

### 5. Verify everything is running

```bash
docker compose ps
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/auth/health
```

---

## Seed credentials

| Role    | Email                  | Password  |
|---------|------------------------|-----------|
| Clinic  | clinica@medicget.com   | clinica   |
| Doctor  | medico@medicget.com    | medico    |
| Patient | paciente@medicget.com  | paciente  |

---

## API reference

All routes via `http://localhost:8080/api/v1/`.

### Auth (public)
```
POST /auth/register   { email, password, role, firstName, lastName, phone? }
POST /auth/login      { email, password }  → { token, user }
GET  /auth/me         Bearer required
GET  /auth/health
```

### Users (Bearer required)
```
GET    /users?search=&role=&page=1
GET    /users/:id
PATCH  /users/:id
DELETE /users/:id              → soft delete (status = DELETED)
GET    /users/:id/profile
PATCH  /users/:id/profile
```

### Clinics (Bearer required)
```
GET    /clinics?search=&page=1
POST   /clinics                (CLINIC role)
GET    /clinics/:id
PATCH  /clinics/:id            (CLINIC role)
DELETE /clinics/:id            (CLINIC role)
GET    /clinics/:id/doctors
```

### Doctors (Bearer required)
```
GET    /doctors?search=&specialty=&available=true&clinicId=&page=1
GET    /doctors/:id
PATCH  /doctors/:id
GET    /doctors/:id/availability
POST   /doctors/:id/availability
DELETE /doctors/:id/availability/:availId
GET    /doctors/:id/slots?date=YYYY-MM-DD
GET    /doctors/:id/reviews?page=1
GET    /doctors/dashboard      (DOCTOR role)
```

### Patients (Bearer required)
```
GET   /patients?search=&clinicId=&page=1
GET   /patients/:id
PATCH /patients/:id
GET   /patients/:id/appointments?page=1
GET   /patients/:id/notifications
PATCH /patients/:id/notifications/:notifId
GET   /patients/dashboard      (PATIENT role)
```

### Appointments (Bearer required — results scoped by caller role)
```
GET    /appointments?page=1&pageSize=20&status=UPCOMING&dateFrom=&dateTo=
POST   /appointments   { patientId, doctorId, clinicId, date, time, price, notes? }
GET    /appointments/:id
PATCH  /appointments/:id   { status?, notes?, cancelReason? }
DELETE /appointments/:id   → soft cancel (status = CANCELLED)
GET    /appointments/:id/payment
PATCH  /appointments/:id/payment
POST   /appointments/:id/review  { rating, comment?, isPublic? }
```

### Dashboard (Bearer required)
```
GET  /dashboard/clinic    (CLINIC role)
GET  /dashboard/doctor    (DOCTOR role)
GET  /dashboard/patient   (PATIENT role)
GET  /dashboard/health
```

---

## Conventions

- **Thin routes** — validate with Zod via `parseBody`, then call the service.
- **Service layer** — all business logic; returns `{ ok, data }` or `{ ok, code, message }`.
- **Repository layer** — all Prisma calls; no business logic.
- **Role scoping** — `withAuth` / `withRole` wrappers from `@medicget/shared/auth`.
- **Soft delete** — appointments: CANCELLED, users: DELETED, clinics/doctors: INACTIVE.
- **Pagination** — every list returns `{ data, meta: { page, pageSize, total, totalPages } }`.

---

## Local dev (without Docker)

Only needed for hot-reload during active development.

Prerequisites: Node 20+, PostgreSQL running on localhost:5432.

```bash
# 1. Ensure packages/shared/.env has the correct local DATABASE_URL:
#    DATABASE_URL=postgresql://postgres:1998jh@localhost:5432/medicget_dev?schema=public

# 2. Install all workspace dependencies
npm install

# 3. Generate Prisma client, apply migrations, seed
npm run prisma:generate
npm run prisma:migrate    # enter "init" as migration name on first run
npm run prisma:seed

# 4. Start all 7 services in parallel
npm run dev:all
```

Individual services: `npm run dev:auth`, `npm run dev:users`, `npm run dev:clinic`,
`npm run dev:doctor`, `npm run dev:patient`, `npm run dev:appointment`, `npm run dev:dashboard`.

---

## Frontend integration

```
medicget-frontend/.env.local:
  VITE_API_URL=http://localhost:8080/api/v1
```

- `src/lib/api.ts` — Axios instance + JWT interceptors + typed domain API objects
- `src/context/AuthContext.tsx` — real JWT login/logout + session bootstrap from stored token
