-- =============================================================================
-- 20260527000000_doctor_acess_verification
--
-- Soporte para verificación automática de licencia médica contra ACESS
-- (Agencia de Aseguramiento de la Calidad de los Servicios de Salud, Ecuador).
--
-- Agrega a Doctor:
--   • nationalId                  — cédula, para consultar ACESS.
--   • licenseVerificationSource   — 'MANUAL' | 'ACESS_AUTO'.
--   • licenseVerificationEvidence — snapshot JSON de la respuesta de ACESS.
--
-- Para los doctores ya VERIFIED (grandfathered en la migración anterior)
-- marcamos el source como MANUAL retroactivamente — fueron habilitados por
-- el grandfathering, no por ACESS.
-- =============================================================================

ALTER TABLE "Doctor"
  ADD COLUMN "nationalId"                  TEXT,
  ADD COLUMN "licenseVerificationSource"   TEXT,
  ADD COLUMN "licenseVerificationEvidence" JSONB;

UPDATE "Doctor"
SET    "licenseVerificationSource" = 'MANUAL'
WHERE  "licenseVerificationStatus" = 'VERIFIED'
  AND  "licenseVerificationSource" IS NULL;
