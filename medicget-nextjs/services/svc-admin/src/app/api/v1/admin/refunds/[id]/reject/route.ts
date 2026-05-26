import { NextRequest } from 'next/server';
import { withRole }    from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody }       from '@medicget/shared/validate';
import { z } from 'zod';
import { refundsService } from '@/modules/refunds/refunds.service';

export const dynamic = 'force-dynamic';

const rejectSchema = z.object({
  /// Obligatorio — se le envía al paciente como explicación del rechazo.
  processorNotes: z.string().trim().min(5, 'El motivo debe tener al menos 5 caracteres').max(500),
}).strict();

/**
 * POST /admin/refunds/:id/reject
 *
 * Descarta la solicitud. Payment vuelve a PAID y se notifica al paciente
 * con el motivo. Útil cuando el paciente ya recibió la atención, hubo un
 * error de comunicación, o el reembolso no procede por otra razón.
 */
export const POST = withRole<{ id: string }>(['ADMIN'], async (req: NextRequest, { user, params }) => {
  const parsed = await parseBody(req, rejectSchema);
  if ('error' in parsed) return parsed.error;
  try {
    const refund = await refundsService.reject(params.id, user.id, parsed.data);
    return apiOk(refund, 'Solicitud rechazada.');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    if (msg.includes('not found')) return apiError('NOT_FOUND', 'Solicitud no encontrada');
    return apiError('BAD_REQUEST', msg);
  }
});
