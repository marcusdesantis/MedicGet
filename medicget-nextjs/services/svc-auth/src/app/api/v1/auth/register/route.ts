import { NextRequest } from 'next/server';
import { z }           from 'zod';
import { Role }        from '@prisma/client';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody }       from '@/lib/validate';
import { authService }     from '@/modules/auth/auth.service';

export const dynamic = 'force-dynamic';

/**
 * Registration schema.
 *
 * Common fields (`email`, `password`, `role`, `firstName`, `lastName`, `phone`)
 * are required for every role. Role-specific fields are all optional and only
 * read when the relevant role is selected:
 *
 *   • PATIENT  → no extra fields needed; a Patient row is created automatically.
 *   • CLINIC   → `clinicName` (recommended); a Clinic row is created.
 *                Without it we fall back to `${firstName} Clinic`.
 *   • DOCTOR   → `specialty`, `licenseNumber`, `experience`, `pricePerConsult`
 *                are accepted and stashed on the Profile/User for later, but
 *                a Doctor row is NOT created here because the schema requires
 *                a `clinicId` and the doctor self-registration flow doesn't
 *                provide one. The doctor completes their professional profile
 *                in a separate step after login.
 *
 * Address-style fields (`address`, `city`, `country`) live on Profile and can
 * be supplied for any role.
 */
const schema = z.object({
  // ─── Auth ──────────────────────────────────────────────────────────────────
  email:     z.string().email(),
  password:  z.string().min(6, 'Password must be at least 6 characters'),
  role:      z.nativeEnum(Role),

  // ─── Profile ───────────────────────────────────────────────────────────────
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  phone:     z.string().optional(),
  address:   z.string().optional(),
  city:      z.string().optional(),
  country:   z.string().optional(),

  // ─── Role-specific (all optional, server picks based on `role`) ────────────
  clinicName:        z.string().optional(),
  clinicDescription: z.string().optional(),
  clinicPhone:       z.string().optional(),
  clinicEmail:       z.string().email().optional(),
  clinicWebsite:     z.string().url().optional(),

  specialty:       z.string().optional(),
  licenseNumber:   z.string().optional(),
  experience:      z.number().int().min(0).optional(),
  pricePerConsult: z.number().positive().optional(),
}).strict();

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if ('error' in parsed) return parsed.error;

  const result = await authService.register(parsed.data);
  if (!result.ok) {
    // Forward the field hint to the client so it can render the error inline
    // (when the field is on the current step) or as an alert with a "go back"
    // CTA (when it's on a previous step).
    const details = result.field ? { field: result.field } : undefined;
    return apiError(result.code, result.message, details);
  }

  return apiOk(result.data, 'Registration successful', { status: 201 });
}
