-- Bloqueo manual de slots por parte del medico.
-- `isBlocked` = el medico marco el slot como cerrado (compromiso externo,
-- dia personal, etc). NO se reserva ni aparece como libre al paciente.
-- `blockReason` opcional para que el medico recuerde por que lo bloqueo.

ALTER TABLE "AppointmentSlot" ADD COLUMN "isBlocked"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AppointmentSlot" ADD COLUMN "blockReason" TEXT;

CREATE INDEX "AppointmentSlot_isBlocked_idx" ON "AppointmentSlot"("isBlocked");
