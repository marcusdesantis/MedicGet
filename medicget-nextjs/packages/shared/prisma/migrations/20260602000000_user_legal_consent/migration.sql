-- =============================================================================
-- 20260602000000_user_legal_consent
--
-- Consentimiento legal del usuario al registro: Términos de Uso y Política
-- de Privacidad. Guardamos el timestamp por documento + la versión vigente
-- al momento de aceptar (para auditoría legal y eventual re-consent cuando
-- actualicemos los documentos).
-- =============================================================================

ALTER TABLE "User"
  ADD COLUMN "termsAcceptedAt"   TIMESTAMP(3),
  ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "legalVersion"      TEXT;
