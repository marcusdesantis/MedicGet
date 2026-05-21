/**
 * Boot-time tasks:
 *   1. Ensure the superadmin user (admin@gmail.com / 12345678) exists.
 *      We do this in code instead of in a SQL migration because we need
 *      bcrypt — having a hardcoded hash in a migration would be brittle
 *      across bcrypt versions.
 *   2. Subsequent restarts are no-ops because of the unique constraint
 *      on User.email.
 *
 * Idempotent — safe to call multiple times.
 *
 * Called lazily from each admin route handler (see ensureAdminBootstrapped()
 * in withAdminAuth) so we don't need a custom Next.js startup hook.
 */

import bcrypt from 'bcryptjs';
import { prisma } from '@medicget/shared/prisma';
import { ensureVapidKeys }       from '@medicget/shared/webpush';

const ADMIN_EMAIL    = 'admin@gmail.com';
const ADMIN_PASSWORD = '12345678';

/**
 * Defaults que se siembran en AppSettings la PRIMERA vez que el sistema
 * arranca y la fila correspondiente está vacía. Si el superadmin después
 * cambia el valor, el bootstrap NO lo machaca (sólo escribe cuando
 * `value` es null).
 *
 * Email: cuenta corporativa de Abisoft (`soportemedicget@abisoft.it`)
 * usando el SMTP de Aruba (smtps.aruba.it:465). Si tu hosting tiene
 * otro proveedor, cambialo desde /admin/settings → Configuración de
 * correo. SSL implícito queda en false porque así está configurado en
 * el panel actual; cambialo si te tira "wrong version number".
 */
const DEFAULT_SETTINGS: Record<string, string> = {
  SMTP_ENABLED:    'true',
  SMTP_HOST:       'smtps.aruba.it',
  SMTP_PORT:       '465',
  SMTP_SECURE:     'false',
  SMTP_USER:       'soportemedicget@abisoft.it',
  SMTP_PASS:       'Ecuador7.',
  SMTP_FROM:       'MedicGet <soportemedicget@abisoft.it>',
  BRAND_NAME:      'MedicGet',
  // PLATFORM_FEE_PCT: comision real aplicada al payment (hoy SIEMPRE 0,
  // el cobro de la plataforma se acuerda manualmente offline con cada
  // medico). Queda oculto del admin para evitar que se modifique por
  // accidente.
  PLATFORM_FEE_PCT: '0',
  // COMMISSION_PCT: porcentaje INFORMATIVO que se publica en la landing
  // y en /terminos para que pacientes y medicos sepan el modelo de
  // negocio. NO se aplica a ningun calculo de Payment.
  COMMISSION_PCT:   '15',
};

async function bootstrapDefaultSettings(): Promise<void> {
  // Asegurarse de que las filas existen primero (algunas vienen del seed
  // de la migración, otras las creamos acá si la migración no las metió).
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    await prisma.appSettings.upsert({
      where:  { key },
      update: {},
      create: {
        key,
        category: key.startsWith('SMTP_')      ? 'EMAIL'
                : key === 'PLATFORM_FEE_PCT'   ? 'PAYMENTS'
                : key === 'COMMISSION_PCT'     ? 'PAYMENTS'
                : key.startsWith('BRAND_')     ? 'BRANDING'
                : 'GENERAL',
        isSecret: key === 'SMTP_PASS',
        value:    null,
      },
    });
  }
  // Sembrar valores SOLO en filas que están todavía en NULL.
  for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.appSettings.updateMany({
      where: { key, value: null },
      data:  { value: defaultValue },
    });
  }
  // Hay también un toggle SMTP_SECURE_BANNER que no es estándar; lo
  // dejamos a cargo del usuario.
}

let bootstrapped = false;
let inflight: Promise<void> | null = null;

export async function ensureAdminBootstrapped(): Promise<void> {
  if (bootstrapped) return;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
      if (!existing) {
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await prisma.user.create({
          data: {
            email:        ADMIN_EMAIL,
            passwordHash,
            role:         'ADMIN',
            status:       'ACTIVE',
            profile: {
              create: {
                firstName: 'Super',
                lastName:  'Admin',
              },
            },
          },
        });
        // eslint-disable-next-line no-console
        console.log(`[svc-admin] Superadmin seed created: ${ADMIN_EMAIL}`);
      }
      // bootstrapPlanFeatures() eliminado tras quitar el sistema de planes.
      // Sembrar credenciales SMTP de Abisoft + branding default si AppSettings
      // todavía está vacío (primera vez que arranca el sistema).
      await bootstrapDefaultSettings().catch(() => {/* swallow */});
      // Generar claves VAPID para Web Push (idempotente — sólo crea
      // si no existen).
      await ensureVapidKeys().catch(() => {/* swallow */});
      bootstrapped = true;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
