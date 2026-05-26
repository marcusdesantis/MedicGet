import { NextRequest } from 'next/server';
import { withRole }    from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { verificationsService } from '@/modules/verifications/verifications.service';

export const dynamic = 'force-dynamic';

/**
 * POST /admin/verifications/:id/approve
 *
 * Aprueba la licencia del médico. A partir de acá el médico aparece en
 * la búsqueda pública y puede recibir bookings.
 *
 * `:id` es el `Doctor.id`, no el `User.id`.
 */
export const POST = withRole<{ id: string }>(['ADMIN'], async (_req: NextRequest, { user, params }) => {
  try {
    const doctor = await verificationsService.approve(params.id, user.id);
    return apiOk(doctor, 'Licencia verificada.');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    if (msg.includes('not found')) return apiError('NOT_FOUND', 'Médico no encontrado');
    return apiError('BAD_REQUEST', msg);
  }
});
