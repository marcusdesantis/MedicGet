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

const ADMIN_EMAIL    = 'admin@gmail.com';
const ADMIN_PASSWORD = '12345678';

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
      bootstrapped = true;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
