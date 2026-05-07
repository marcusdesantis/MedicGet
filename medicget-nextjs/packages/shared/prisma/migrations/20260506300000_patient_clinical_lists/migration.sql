-- Add `conditions` and `medications` String[] columns to Patient.
--
-- Backs the medical-history view: paciente edita su lista de condiciones
-- crónicas y medicamentos en uso, doctor las consulta antes de la cita.
-- Modeled as String[] (not separate tables) because we don't need ICD-10
-- codes, dosage scheduling, or pharmacy integrations at MVP — those would
-- justify dedicated `Diagnosis` / `Prescription` models later.
--
-- Default empty array so existing patients land in a sensible state.

ALTER TABLE "Patient" ADD COLUMN "conditions"  TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Patient" ADD COLUMN "medications" TEXT[] NOT NULL DEFAULT '{}';
