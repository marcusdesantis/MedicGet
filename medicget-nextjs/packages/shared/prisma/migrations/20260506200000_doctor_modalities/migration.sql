-- Add `modalities` array column to Doctor.
--
-- Stores which appointment modalities the doctor accepts (ONLINE / PRESENCIAL
-- / CHAT). Drives the modality picker on the patient booking page, so
-- patients only see options the doctor has opted in to.
--
-- Default `{ONLINE}` so all existing doctors keep being bookable for video
-- consults without manual data entry. They can extend their offer from the
-- profile page when they're ready.
ALTER TABLE "Doctor"
  ADD COLUMN "modalities" "AppointmentModality"[] NOT NULL DEFAULT '{ONLINE}';
