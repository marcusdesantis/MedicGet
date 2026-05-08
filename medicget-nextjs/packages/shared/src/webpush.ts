/**
 * Web Push helpers.
 *
 * Las claves VAPID se generan al primer arranque (`ensureVapidKeys`) y se
 * persisten en AppSettings (mismas claves para todos los servicios). El
 * frontend pide la clave pública al endpoint `GET /push/vapid-public-key`
 * y la usa para suscribirse desde el Service Worker.
 *
 * `sendPushToUser(userId, payload)` busca todas las suscripciones del
 * usuario y manda push a cada una. Si el endpoint ya no es válido (HTTP
 * 410), elimina esa suscripción de la DB.
 */

import webpush from 'web-push';
import { prisma } from './prisma';
import { getSetting } from './settings';

const VAPID_SUBJECT_FALLBACK = 'mailto:soporte@medicget.local';

export interface PushPayload {
  title: string;
  body:  string;
  /** URL relativa para abrir al click. */
  url?:  string;
  /** Tipo de notificación — el SW lo usa para agrupar/filtrar. */
  tag?:  string;
}

let cachedVapid: { publicKey: string; privateKey: string; subject: string } | null = null;
let cachedAt = 0;

/** Refresca las claves VAPID desde AppSettings cada 60s. */
async function getVapid() {
  if (cachedVapid && Date.now() - cachedAt < 60_000) return cachedVapid;
  const [pub, priv, subj] = await Promise.all([
    getSetting('VAPID_PUBLIC_KEY'),
    getSetting('VAPID_PRIVATE_KEY'),
    getSetting('VAPID_SUBJECT', VAPID_SUBJECT_FALLBACK),
  ]);
  if (!pub || !priv) return null;
  cachedVapid = { publicKey: pub, privateKey: priv, subject: subj ?? VAPID_SUBJECT_FALLBACK };
  cachedAt = Date.now();
  webpush.setVapidDetails(cachedVapid.subject, cachedVapid.publicKey, cachedVapid.privateKey);
  return cachedVapid;
}

/**
 * Devuelve la clave pública VAPID. Si todavía no se generaron las
 * claves, las genera y persiste de una vez. Idempotente.
 */
export async function getVapidPublicKey(): Promise<string | null> {
  const v = await getVapid();
  return v?.publicKey ?? null;
}

/**
 * Genera y persiste un par de claves VAPID si todavía no existen.
 * Llamado desde el bootstrap del svc-admin.
 */
export async function ensureVapidKeys(): Promise<void> {
  const existing = await prisma.appSettings.findUnique({ where: { key: 'VAPID_PUBLIC_KEY' } });
  if (existing?.value) return; // Ya generadas
  const keys = webpush.generateVAPIDKeys();
  await prisma.appSettings.upsert({
    where: { key: 'VAPID_PUBLIC_KEY' },
    update: { value: keys.publicKey },
    create: { key: 'VAPID_PUBLIC_KEY', value: keys.publicKey, category: 'PUSH', isSecret: false },
  });
  await prisma.appSettings.upsert({
    where: { key: 'VAPID_PRIVATE_KEY' },
    update: { value: keys.privateKey },
    create: { key: 'VAPID_PRIVATE_KEY', value: keys.privateKey, category: 'PUSH', isSecret: true },
  });
  await prisma.appSettings.upsert({
    where: { key: 'VAPID_SUBJECT' },
    update: {},
    create: { key: 'VAPID_SUBJECT', value: VAPID_SUBJECT_FALLBACK, category: 'PUSH', isSecret: false },
  });
  cachedVapid = null; // forzar reload
  // eslint-disable-next-line no-console
  console.log('[webpush] VAPID keys generated and persisted to AppSettings.');
}

/**
 * Envía un push a TODAS las suscripciones de un usuario. Best-effort —
 * loguea fallas pero no las propaga. Limpia suscripciones inválidas.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const v = await getVapid();
  if (!v) return; // No configurado — no hacemos nada

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  const stale: string[] = [];

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: s.endpoint,
          keys:     s.keys as { p256dh: string; auth: string },
        },
        body,
      );
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      // 404 / 410 → endpoint expirado; el navegador lo invalidó.
      if (status === 404 || status === 410) {
        stale.push(s.id);
      } else {
        // eslint-disable-next-line no-console
        console.warn('[webpush] send failed:', status, (err as Error).message);
      }
    }
  }));

  if (stale.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: stale } } });
  }
}
