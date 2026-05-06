-- 1. Make Appointment.clinicId optional so independent doctors (no clinic
--    association) can still receive bookings.
ALTER TABLE "Appointment" ALTER COLUMN "clinicId" DROP NOT NULL;

-- 2. Add the AppointmentModality enum and a `modality` column on Appointment.
--    Default ONLINE so existing rows have a sensible value without manual
--    backfill — nothing else uses this column yet, so no compat issues.
CREATE TYPE "AppointmentModality" AS ENUM ('ONLINE', 'PRESENCIAL', 'CHAT');
ALTER TABLE "Appointment"
  ADD COLUMN "modality" "AppointmentModality" NOT NULL DEFAULT 'ONLINE';
