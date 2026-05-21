-- Drop Plan / Subscription tables and related enums.
-- Modelo nuevo: "registro 100% gratis + comision por consulta acordada
-- offline". No hay planes ni suscripciones - todas las cuentas tienen
-- full features sin restricciones.

-- 1. Quitar FK + columna `subscriptionId` de Payment.
DROP INDEX IF EXISTS "Payment_subscriptionId_idx";
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_subscriptionId_fkey";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "subscriptionId";

-- 2. Drop tables (orden: Subscription primero por FK a Plan).
DROP TABLE IF EXISTS "Subscription" CASCADE;
DROP TABLE IF EXISTS "Plan"         CASCADE;

-- 3. Drop enums asociados.
DROP TYPE IF EXISTS "SubscriptionStatus";
DROP TYPE IF EXISTS "PlanCode";
DROP TYPE IF EXISTS "PlanAudience";

-- 4. Forzar PLATFORM_FEE_PCT a 0 en instalaciones existentes para que
--    el modelo "comision offline" sea efectivo aun sin nuevo bootstrap.
UPDATE "AppSettings" SET "value" = '0' WHERE "key" = 'PLATFORM_FEE_PCT';

-- 5. Insertar el setting nuevo COMMISSION_PCT (% informativo) si no existe.
INSERT INTO "AppSettings" ("id", "key", "value", "category", "isSecret", "updatedAt", "createdAt")
SELECT
    'commission_pct_seed_001',
    'COMMISSION_PCT',
    '15',
    'PAYMENTS',
    false,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM "AppSettings" WHERE "key" = 'COMMISSION_PCT'
);
