-- Password reset tokens — used by /auth/forgot-password + /auth/reset-password.
--
-- We persist a SHA-256 hash of the random token (the plaintext token only
-- lives in the email we send), so a database dump cannot leak active tokens.
-- Tokens expire after 60 minutes and are single-use (`usedAt` flips to NOW
-- when consumed by /auth/reset-password).

CREATE TABLE "PasswordResetToken" (
  "id"        TEXT      NOT NULL,
  "userId"    TEXT      NOT NULL,
  "tokenHash" TEXT      NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requestIp" TEXT,

  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX        "PasswordResetToken_userId_idx"    ON "PasswordResetToken"("userId");
CREATE INDEX        "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
