-- =============================================================================
-- 20260526000000_refunds_and_license_verification
--
-- 1. Nuevos enums: VerificationStatus, RefundRequestStatus.
-- 2. Nuevo valor PENDING_REFUND en PaymentStatus.
-- 3. Nuevos valores en NotificationType (REFUND_*, LICENSE_*).
-- 4. Campos nuevos en Doctor para verificación documental de licencia.
-- 5. Tabla RefundRequest (cola operacional, 1:1 con Payment).
-- 6. Grandfathering: marca como VERIFIED a los doctores ACTIVE existentes
--    para que el filtro nuevo no rompa las búsquedas en producción. Solo
--    aplica a los doctores que ya estaban "en uso" antes de este feature.
-- =============================================================================

-- ─── Nuevos enums ──────────────────────────────────────────────────────────
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED');
CREATE TYPE "RefundRequestStatus" AS ENUM ('PENDING', 'PROCESSED', 'REJECTED');

-- ─── Extender PaymentStatus ────────────────────────────────────────────────
ALTER TYPE "PaymentStatus" ADD VALUE 'PENDING_REFUND';

-- ─── Extender NotificationType ─────────────────────────────────────────────
ALTER TYPE "NotificationType" ADD VALUE 'REFUND_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'REFUND_PROCESSED';
ALTER TYPE "NotificationType" ADD VALUE 'REFUND_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'LICENSE_PENDING_REVIEW';
ALTER TYPE "NotificationType" ADD VALUE 'LICENSE_VERIFIED';
ALTER TYPE "NotificationType" ADD VALUE 'LICENSE_REJECTED';

-- ─── Campos nuevos en Doctor ───────────────────────────────────────────────
ALTER TABLE "Doctor"
  ADD COLUMN "licenseAuthority"          TEXT,
  ADD COLUMN "licenseDocumentUrl"        TEXT,
  ADD COLUMN "licenseDocumentMime"       TEXT,
  ADD COLUMN "licenseDocumentUploadedAt" TIMESTAMP(3),
  ADD COLUMN "licenseVerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN "licenseVerifiedAt"         TIMESTAMP(3),
  ADD COLUMN "licenseVerifiedBy"         TEXT,
  ADD COLUMN "licenseRejectionReason"    TEXT;

CREATE INDEX "Doctor_licenseVerificationStatus_idx"
  ON "Doctor"("licenseVerificationStatus");

-- ─── Grandfathering ────────────────────────────────────────────────────────
-- Los doctores que ya estaban activos en la plataforma antes de este
-- feature no deben quedar bloqueados de la búsqueda. Los marcamos como
-- VERIFIED de oficio. Los registros nuevos arrancan en NOT_SUBMITTED y
-- pasan por el flujo manual.
UPDATE "Doctor"
SET    "licenseVerificationStatus" = 'VERIFIED',
       "licenseVerifiedAt"         = NOW()
WHERE  "licenseVerificationStatus" = 'NOT_SUBMITTED'
  AND  "status" = 'ACTIVE';

-- ─── RefundRequest ────────────────────────────────────────────────────────
CREATE TABLE "RefundRequest" (
    "id"                  TEXT NOT NULL,
    "paymentId"           TEXT NOT NULL,
    "appointmentId"       TEXT,
    "status"              "RefundRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedByUserId"   TEXT NOT NULL,
    "requestReason"       TEXT,
    "requestedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedByUserId"   TEXT,
    "processedAt"         TIMESTAMP(3),
    "processorNotes"      TEXT,
    "externalReference"   TEXT,

    CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefundRequest_paymentId_key"     ON "RefundRequest"("paymentId");
CREATE INDEX        "RefundRequest_status_idx"        ON "RefundRequest"("status");
CREATE INDEX        "RefundRequest_appointmentId_idx" ON "RefundRequest"("appointmentId");
CREATE INDEX        "RefundRequest_requestedAt_idx"   ON "RefundRequest"("requestedAt");

ALTER TABLE "RefundRequest"
  ADD CONSTRAINT "RefundRequest_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
