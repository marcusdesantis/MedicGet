-- Refactor del modelo de planes:
--   1) Agrega Plan.maxDoctors (cupo de médicos por clínica).
--   2) Agrega el status PAUSED al enum SubscriptionStatus para los
--      médicos que se unen a una clínica.

-- 1) Plan.maxDoctors
ALTER TABLE "Plan" ADD COLUMN "maxDoctors" INTEGER;

-- 2) SubscriptionStatus += PAUSED
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
