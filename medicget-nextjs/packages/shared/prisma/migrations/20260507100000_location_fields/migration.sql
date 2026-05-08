-- Location structure: province + lat/lng on Profile and Clinic
--
-- Permite filtrar por país+provincia en el directorio público y guardar
-- coordenadas exactas para mostrar en el mapa del perfil. Todo opcional —
-- los registros existentes quedan intactos.

ALTER TABLE "Profile"
  ADD COLUMN "province"  TEXT,
  ADD COLUMN "latitude"  DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION;

CREATE INDEX "Profile_country_province_idx" ON "Profile"("country", "province");

ALTER TABLE "Clinic"
  ADD COLUMN "province"  TEXT,
  ADD COLUMN "latitude"  DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION;

CREATE INDEX "Clinic_country_province_idx" ON "Clinic"("country", "province");
