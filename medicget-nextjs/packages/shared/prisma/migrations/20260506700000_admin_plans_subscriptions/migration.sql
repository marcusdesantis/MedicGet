-- Admin role + Plans / Subscriptions / AppSettings
--
-- Adds:
--   1. ADMIN value to Role enum (superadmin).
--   2. Three new enums: PlanAudience, PlanCode, SubscriptionStatus.
--   3. Plan, Subscription and AppSettings tables.
--   4. Seeds the 6 default plans (FREE/PRO/PREMIUM × DOCTOR/CLINIC) so the
--      landing page and the admin panel have something to render right
--      after migration.
--
-- The superadmin user (admin@gmail.com) is created at runtime by svc-admin's
-- bootstrap so we don't have to hardcode a bcrypt hash here.

-- 1. Add ADMIN to Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADMIN';

-- 2. New enums
CREATE TYPE "PlanAudience" AS ENUM ('DOCTOR', 'CLINIC');
CREATE TYPE "PlanCode"     AS ENUM ('FREE', 'PRO', 'PREMIUM');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING_PAYMENT');

-- 3. Plan table
CREATE TABLE "Plan" (
  "id"           TEXT             NOT NULL,
  "code"         "PlanCode"       NOT NULL,
  "audience"     "PlanAudience"   NOT NULL,
  "name"         TEXT             NOT NULL,
  "description"  TEXT,
  "monthlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "modules"      TEXT[]           NOT NULL DEFAULT ARRAY[]::TEXT[],
  "limits"       JSONB,
  "isActive"     BOOLEAN          NOT NULL DEFAULT TRUE,
  "sortOrder"    INTEGER          NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Plan_audience_code_key" ON "Plan"("audience", "code");
CREATE INDEX        "Plan_isActive_idx"      ON "Plan"("isActive");

-- 4. Subscription table
CREATE TABLE "Subscription" (
  "id"            TEXT                 NOT NULL,
  "userId"        TEXT                 NOT NULL,
  "planId"        TEXT                 NOT NULL,
  "status"        "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "startsAt"      TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"     TIMESTAMP(3)         NOT NULL,
  "lastPaymentId" TEXT,
  "autoRenew"     BOOLEAN              NOT NULL DEFAULT TRUE,
  "cancelledAt"   TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Subscription_userId_idx"     ON "Subscription"("userId");
CREATE INDEX "Subscription_planId_idx"     ON "Subscription"("planId");
CREATE INDEX "Subscription_status_idx"     ON "Subscription"("status");
CREATE INDEX "Subscription_expiresAt_idx"  ON "Subscription"("expiresAt");

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId")
    REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. AppSettings table
CREATE TABLE "AppSettings" (
  "id"        TEXT          NOT NULL,
  "key"       TEXT          NOT NULL,
  "value"     TEXT,
  "category"  TEXT          NOT NULL DEFAULT 'GENERAL',
  "isSecret"  BOOLEAN       NOT NULL DEFAULT FALSE,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AppSettings_key_key"      ON "AppSettings"("key");
CREATE INDEX        "AppSettings_category_idx" ON "AppSettings"("category");

-- 6. Seed default plans (idempotent — won't double-insert thanks to
--    the unique (audience, code) constraint).
INSERT INTO "Plan" ("id", "code", "audience", "name", "description", "monthlyPrice", "modules", "limits", "sortOrder")
VALUES
  -- DOCTOR plans
  ('plan_doc_free',    'FREE',    'DOCTOR', 'Médico Free',
   'Ideal para empezar. Una modalidad y hasta 5 citas mensuales.',
   0,
   ARRAY['ONLINE'],
   '{"maxAppointmentsPerMonth": 5, "maxModalities": 1}'::JSONB,
   1),
  ('plan_doc_pro',     'PRO',     'DOCTOR', 'Médico Pro',
   'Para profesionales activos. Todas las modalidades y citas ilimitadas.',
   19,
   ARRAY['ONLINE','PRESENCIAL','CHAT'],
   '{"maxAppointmentsPerMonth": null, "maxModalities": 3}'::JSONB,
   2),
  ('plan_doc_premium', 'PREMIUM', 'DOCTOR', 'Médico Premium',
   'Todo Pro + reportes avanzados, prioridad en búsqueda y branding propio.',
   39,
   ARRAY['ONLINE','PRESENCIAL','CHAT','REPORTS','PRIORITY_SEARCH','BRANDING'],
   '{"maxAppointmentsPerMonth": null, "maxModalities": 3}'::JSONB,
   3),

  -- CLINIC plans
  ('plan_cli_free',    'FREE',    'CLINIC', 'Clínica Starter',
   'Hasta 2 médicos en plantilla. Modalidad online incluida.',
   0,
   ARRAY['ONLINE'],
   '{"maxDoctors": 2, "maxAppointmentsPerMonth": 30}'::JSONB,
   1),
  ('plan_cli_pro',     'PRO',     'CLINIC', 'Clínica Business',
   'Hasta 10 médicos, todas las modalidades, dashboard de pagos.',
   79,
   ARRAY['ONLINE','PRESENCIAL','CHAT','PAYMENTS_DASHBOARD'],
   '{"maxDoctors": 10, "maxAppointmentsPerMonth": null}'::JSONB,
   2),
  ('plan_cli_premium', 'PREMIUM', 'CLINIC', 'Clínica Enterprise',
   'Médicos ilimitados, multi-sede, reportería avanzada y soporte prioritario.',
   199,
   ARRAY['ONLINE','PRESENCIAL','CHAT','PAYMENTS_DASHBOARD','REPORTS','MULTI_LOCATION','PRIORITY_SUPPORT'],
   '{"maxDoctors": null, "maxAppointmentsPerMonth": null}'::JSONB,
   3)
ON CONFLICT ("audience", "code") DO NOTHING;

-- 7. Seed AppSettings keys with NULL values — the rows exist so the admin
--    panel can render them with empty inputs; values default to env vars
--    until the superadmin saves them.
INSERT INTO "AppSettings" ("id", "key", "category", "isSecret") VALUES
  ('set_smtp_host',     'SMTP_HOST',         'EMAIL',    FALSE),
  ('set_smtp_port',     'SMTP_PORT',         'EMAIL',    FALSE),
  ('set_smtp_secure',   'SMTP_SECURE',       'EMAIL',    FALSE),
  ('set_smtp_user',     'SMTP_USER',         'EMAIL',    FALSE),
  ('set_smtp_pass',     'SMTP_PASS',         'EMAIL',    TRUE),
  ('set_smtp_from',     'SMTP_FROM',         'EMAIL',    FALSE),
  ('set_payphone_tok',  'PAYPHONE_TOKEN',    'PAYMENTS', TRUE),
  ('set_payphone_str',  'PAYPHONE_STORE_ID', 'PAYMENTS', FALSE),
  ('set_payphone_url',  'PAYPHONE_BASE_URL', 'PAYMENTS', FALSE),
  ('set_platform_fee',  'PLATFORM_FEE_PCT',  'PAYMENTS', FALSE),
  ('set_jitsi_url',     'JITSI_BASE_URL',    'VIDEO',    FALSE),
  ('set_brand_name',    'BRAND_NAME',        'BRANDING', FALSE),
  ('set_brand_logo',    'BRAND_LOGO_URL',    'BRANDING', FALSE)
ON CONFLICT ("key") DO NOTHING;
