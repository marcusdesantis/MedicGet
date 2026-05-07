import { NextRequest } from 'next/server';
import { withAuth } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { z } from 'zod';
import { parseBody } from '@medicget/shared/validate';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/appointments/:id/checkin
 *
 * Marks the patient as arrived (PATIENT calls it) or the doctor as
 * having received the patient (DOCTOR calls it). Used by the PRESENCIAL
 * appointment flow.
 *
 * Body: `{ event: 'arrived' | 'patient_received' | 'no_show' | 'undo' }`
 */
const checkinSchema = z.object({
  event: z.enum(['arrived', 'patient_received', 'no_show', 'undo']),
});

export const POST = withAuth<{ id: string }>(
  async (req: NextRequest, { user, params }) => {
    const { id } = params;
    const parsed = await parseBody(req, checkinSchema);
    if ('error' in parsed) return parsed.error;

    const { prisma } = await import('@medicget/shared/prisma');

    const appt = await prisma.appointment.findUnique({
      where:   { id },
      include: {
        patient: { select: { userId: true } },
        doctor:  { select: { userId: true } },
      },
    });
    if (!appt) return apiError('NOT_FOUND', 'Appointment not found');

    if (appt.modality !== 'PRESENCIAL') {
      return apiError('BAD_REQUEST', 'El check-in sólo aplica a citas presenciales.');
    }

    const isPatient = user.role === 'PATIENT' && appt.patient.userId === user.id;
    const isDoctor  = user.role === 'DOCTOR'  && appt.doctor.userId  === user.id;
    if (!isPatient && !isDoctor) {
      return apiError('FORBIDDEN', 'Sólo los participantes de la cita pueden registrar check-in.');
    }

    const data: Record<string, unknown> = {};

    switch (parsed.data.event) {
      case 'arrived':
        if (!isPatient) return apiError('FORBIDDEN', 'Sólo el paciente puede marcar "He llegado".');
        data['patientArrivedAt'] = new Date();
        break;
      case 'patient_received':
        if (!isDoctor) return apiError('FORBIDDEN', 'Sólo el médico puede marcar "Paciente recibido".');
        data['doctorCheckedInAt'] = new Date();
        // Move the cita to ONGOING when the doctor opens the consult.
        if (appt.status === 'UPCOMING' || appt.status === 'PENDING') {
          data['status'] = 'ONGOING';
        }
        break;
      case 'no_show':
        if (!isDoctor) return apiError('FORBIDDEN', 'Sólo el médico puede marcar inasistencia.');
        data['status'] = 'NO_SHOW';
        break;
      case 'undo':
        // Either party can undo their own check-in.
        if (isPatient) data['patientArrivedAt']  = null;
        if (isDoctor)  data['doctorCheckedInAt'] = null;
        break;
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data,
    });

    return apiOk(updated, 'Check-in updated');
  },
);
