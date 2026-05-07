-- Payment fields for PayPhone integration + platform-fee split
--
-- platformFee + doctorAmount → set on confirm, derived from PLATFORM_FEE_PCT
-- payphonePaymentId         → numeric id returned by PayPhone /Sale
-- paymentToken / paymentUrl → cached so the patient can reopen the same
--                              checkout link if they closed the tab
-- expiresAt                 → after this we auto-cancel the appointment
--                              and free the slot

ALTER TABLE "Payment"
  ADD COLUMN "platformFee"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "doctorAmount"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "payphonePaymentId"  TEXT,
  ADD COLUMN "paymentToken"       TEXT,
  ADD COLUMN "paymentUrl"         TEXT,
  ADD COLUMN "expiresAt"          TIMESTAMP(3);

CREATE INDEX "Payment_expiresAt_idx" ON "Payment"("expiresAt");
