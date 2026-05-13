import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth, withRole } from '@medicget/shared/auth';
import { apiOk, apiError } from '@medicget/shared/response';
import { parseBody } from '@medicget/shared/validate';
import { prisma } from '@medicget/shared/prisma';

export const dynamic = 'force-dynamic';

/**
 * Formulario de atención médica para una cita puntual.
 *
 *   GET  → leer el registro (paciente, médico y clínica autorizada lo
 *          ven; cualquier otro rol → 403). Devuelve 404 si todavía no
 *          existe.
 *   POST → upsert: el médico crea o actualiza el registro de la cita.
 *          Solo el médico dueño de la cita puede escribir.
 */

const medicalRecordSchema = z.object({
  reason:             z.string().min(1, 'El motivo de la consulta es obligatorio').max(500),
  symptoms:           z.string().max(2000).optional(),
  existingConditions: z.string().max(2000).optional(),
  diagnosis:          z.string().max(2000).optional(),
  treatment:          z.string().max(2000).optional(),
  notes:              z.string().max(2000).optional(),
});

export const GET = withAuth<{ id: string }>(
  async (_req: NextRequest, { user, params }) => {
    const { id } = params;
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true, patientId: true, doctorId: true, clinicId: true,
        medicalRecord: true,
      },
    });
    if (!appointment) return apiError('NOT_FOUND', 'Appointment not found');

    // Authorización: paciente dueño, médico dueño o clínica dueña.
    if (user.role === 'PATIENT') {
      const p = await prisma.patient.findUnique({ where: { userId: user.id } });
      if (!p || p.id !== appointment.patientId) return apiError('FORBIDDEN', 'Access denied');
    } else if (user.role === 'DOCTOR') {
      const d = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!d || d.id !== appointment.doctorId) return apiError('FORBIDDEN', 'Access denied');
    } else if (user.role === 'CLINIC') {
      const c = await prisma.clinic.findUnique({ where: { userId: user.id } });
      if (!c || c.id !== appointment.clinicId) return apiError('FORBIDDEN', 'Access denied');
    } else if (user.role !== 'ADMIN') {
      return apiError('FORBIDDEN', 'Access denied');
    }

    if (!appointment.medicalRecord) return apiError('NOT_FOUND', 'No medical record yet');
    return apiOk(appointment.medicalRecord);
  },
);

export const POST = withRole<{ id: string }>(
  ['DOCTOR'],
  async (req: NextRequest, { user, params }) => {
    const { id } = params;
    const parsed = await parseBody(req, medicalRecordSchema);
    if ('error' in parsed) return parsed.error;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, patientId: true, doctorId: true },
    });
    if (!appointment) return apiError('NOT_FOUND', 'Appointment not found');

    const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!doctor || doctor.id !== appointment.doctorId) {
      return apiError('FORBIDDEN', 'Only the doctor of this appointment can write the medical record');
    }

    const record = await prisma.medicalRecord.upsert({
      where:  { appointmentId: id },
      create: {
        appointmentId:      id,
        patientId:          appointment.patientId,
        doctorId:           appointment.doctorId,
        reason:             parsed.data.reason,
        symptoms:           parsed.data.symptoms,
        existingConditions: parsed.data.existingConditions,
        diagnosis:          parsed.data.diagnosis,
        treatment:          parsed.data.treatment,
        notes:              parsed.data.notes,
      },
      update: {
        reason:             parsed.data.reason,
        symptoms:           parsed.data.symptoms,
        existingConditions: parsed.data.existingConditions,
        diagnosis:          parsed.data.diagnosis,
        treatment:          parsed.data.treatment,
        notes:              parsed.data.notes,
      },
    });

    return apiOk(record, 'Medical record saved');
  },
);
