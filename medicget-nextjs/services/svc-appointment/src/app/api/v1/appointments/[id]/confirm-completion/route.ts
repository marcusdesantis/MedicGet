import { NextRequest } from 'next/server';
import { withRole } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { appointmentsService } from '@/modules/appointments/appointments.service';

export const dynamic = 'force-dynamic';

/**
 * Doble validación de finalización — segunda mitad.
 *
 * Body: vacío. El backend resuelve user→patient y verifica que la cita
 * tiene `doctorCompletedAt` (i.e. el médico ya hizo su parte). Setea
 * `patientConfirmedAt` y transiciona la cita a COMPLETED.
 */
export const POST = withRole<{ id: string }>(
  ['PATIENT'],
  async (_req: NextRequest, { user, params }) => {
    const { id } = params;
    const result = await appointmentsService.confirmCompletion(id, user);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk(result.data, 'Atención confirmada');
  },
);
