import { NextRequest } from 'next/server';
import { withRole }    from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody }       from '@medicget/shared/validate';
import { z } from 'zod';
import { refundsService } from '@/modules/refunds/refunds.service';

export const dynamic = 'force-dynamic';

const processSchema = z.object({
  externalReference: z.string().trim().max(120).optional(),
  processorNotes:    z.string().trim().max(500).optional(),
}).strict();

/**
 * POST /admin/refunds/:id/process
 *
 * Marca la solicitud como PROCESSED después de que el admin haya hecho el
 * reverso real en PayPhone Business. Acepta `externalReference` (el ID del
 * reverso en PayPhone) y `processorNotes` para auditoría.
 *
 * Side effects: Payment → REFUNDED + notif "reembolso procesado" al paciente.
 */
export const POST = withRole<{ id: string }>(['ADMIN'], async (req: NextRequest, { user, params }) => {
  const parsed = await parseBody(req, processSchema);
  if ('error' in parsed) return parsed.error;
  try {
    const refund = await refundsService.process(params.id, user.id, parsed.data);
    return apiOk(refund, 'Reembolso marcado como procesado.');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    if (msg.includes('not found')) return apiError('NOT_FOUND', 'Solicitud no encontrada');
    return apiError('BAD_REQUEST', msg);
  }
});
