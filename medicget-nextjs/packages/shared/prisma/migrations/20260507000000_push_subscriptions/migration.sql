-- Push subscriptions (Web Push API)
--
-- Un usuario puede tener varias suscripciones (una por dispositivo +
-- navegador). El campo `endpoint` es único globalmente — si el mismo
-- navegador re-suscribe, sobreescribe la fila vieja. Las claves
-- `p256dh` y `auth` viajan en el JSON `keys`.

CREATE TABLE "PushSubscription" (
  "id"        TEXT          NOT NULL,
  "userId"    TEXT          NOT NULL,
  "endpoint"  TEXT          NOT NULL,
  "keys"      JSONB         NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX        "PushSubscription_userId_idx"   ON "PushSubscription"("userId");

ALTER TABLE "PushSubscription"
  ADD CONSTRAINT "PushSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
