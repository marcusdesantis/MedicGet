import { NextRequest } from 'next/server';
import { withRole }    from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody }       from '@medicget/shared/validate';
import { z } from 'zod';
import { verificationsService } from '@/modules/verifications/verifications.service';

export const dynamic = 'force-dynamic';

const rejectSchema = z.object({
  /// Mínimo 5 caracteres — sino el médico recibe un email sin información útil.
  reason: z.string().trim().min(5, 'Explicá brevemente el motivo (mínimo 5 caracteres).').max(500),
}).strict();

/**
 * POST /admin/verifications/:id/reject
 *
 * Rechaza la licencia. El motivo se envía al médico por notif + email
 * para que pueda corregir y reenviar.
 *
 * `:id` es el `Doctor.id`.
 */
export const POST = withRole<{ id: string }>(['ADMIN'], async (req: NextRequest, { user, params }) => {
  const parsed = await parseBody(req, rejectSchema);
  if ('error' in parsed) return parsed.error;
  try {
    const doctor = await verificationsService.reject(params.id, user.id, parsed.data);
    return apiOk(doctor, 'Licencia rechazada.');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    if (msg.includes('not found')) return apiError('NOT_FOUND', 'Médico no encontrado');
    return apiError('BAD_REQUEST', msg);
  }
});
