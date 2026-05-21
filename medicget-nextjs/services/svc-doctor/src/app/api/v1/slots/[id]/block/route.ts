import { type NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { z } from 'zod';
import { doctorsService } from '@/modules/doctors/doctors.service';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/v1/slots/:id/block
 *
 * Bloquea / desbloquea un slot puntual del medico. Solo el doctor
 * dueno (o un admin) puede modificarlo. No se puede bloquear un slot
 * ya reservado.
 *
 * Body:
 *   {
 *     blocked: boolean;
 *     reason?: string | null;  // opcional, solo se guarda si blocked=true
 *   }
 */
const bodySchema = z.object({
  blocked: z.boolean(),
  reason:  z.string().max(120).optional().nullable(),
});

export const PATCH = withAuth<{ id: string }>(async (req: NextRequest, { user, params }) => {
  const parsed = await parseBody(req, bodySchema);
  if ('error' in parsed) return parsed.error;

  const result = await doctorsService.toggleSlotBlock(
    params.id,
    user,
    parsed.data.blocked,
    parsed.data.reason,
  );

  if (!result.ok) return apiError(result.code, result.message);
  return apiOk(
    result.data,
    parsed.data.blocked ? 'Horario bloqueado.' : 'Horario disponible nuevamente.',
  );
});
