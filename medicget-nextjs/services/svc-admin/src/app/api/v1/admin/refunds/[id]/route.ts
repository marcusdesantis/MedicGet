import { NextRequest } from 'next/server';
import { withRole }    from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { refundsService }   from '@/modules/refunds/refunds.service';

export const dynamic = 'force-dynamic';

/**
 * GET /admin/refunds/:id — detalle individual con paciente, médico y cita.
 */
export const GET = withRole<{ id: string }>(['ADMIN'], async (_req: NextRequest, { params }) => {
  const refund = await refundsService.getById(params.id);
  if (!refund) return apiError('NOT_FOUND', 'Solicitud no encontrada');
  return apiOk(refund);
});
