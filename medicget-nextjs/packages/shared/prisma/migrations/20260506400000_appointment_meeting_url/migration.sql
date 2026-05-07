-- Add `meetingUrl` to Appointment.
--
-- Stores the Jitsi Meet room URL generated automatically when an ONLINE
-- appointment is created. The URL is sent to the patient by email at the
-- moment of booking and stays attached to the appointment until it's
-- rescheduled or cancelled.
--
-- Nullable because PRESENCIAL and CHAT appointments don't need a video room.

ALTER TABLE "Appointment" ADD COLUMN "meetingUrl" TEXT;
