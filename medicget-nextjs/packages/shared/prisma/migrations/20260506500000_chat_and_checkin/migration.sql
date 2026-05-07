-- Chat messages + presencial check-in fields
--
-- 1. ChatMessage table — backs the CHAT-modality live conversation between
--    a patient and the assigned doctor for a given appointment.
-- 2. Appointment.patientArrivedAt + .doctorCheckedInAt — power the
--    PRESENCIAL "I'm on my way / I've arrived" / "patient checked-in"
--    flow. Both nullable; only relevant for PRESENCIAL appointments but
--    we don't enforce that at the DB level.

ALTER TABLE "Appointment"
  ADD COLUMN "patientArrivedAt"  TIMESTAMP(3),
  ADD COLUMN "doctorCheckedInAt" TIMESTAMP(3);

CREATE TABLE "ChatMessage" (
  "id"             TEXT        NOT NULL,
  "appointmentId"  TEXT        NOT NULL,
  "senderId"       TEXT        NOT NULL,
  "content"        TEXT        NOT NULL,
  "attachmentUrl"  TEXT,
  "attachmentName" TEXT,
  "attachmentMime" TEXT,
  "deletedAt"      TIMESTAMP(3),
  "readAt"         TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatMessage_appointmentId_idx"           ON "ChatMessage"("appointmentId");
CREATE INDEX "ChatMessage_senderId_idx"                ON "ChatMessage"("senderId");
CREATE INDEX "ChatMessage_appointmentId_createdAt_idx" ON "ChatMessage"("appointmentId", "createdAt");

ALTER TABLE "ChatMessage"
  ADD CONSTRAINT "ChatMessage_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
