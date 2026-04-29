import { prisma } from '@medicget/shared/prisma';
import type { AuthUser } from '@medicget/shared/auth';
import {
  getClinicDashboard,
  getDoctorDashboard,
  getPatientDashboard,
} from './dashboard.repository';

type ServiceResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

export const dashboardService = {
  async clinic(user: AuthUser): Promise<ServiceResult<unknown>> {
    if (user.role !== 'CLINIC') {
      return { ok: false, code: 'FORBIDDEN', message: 'Only CLINIC can access this dashboard' };
    }

    const clinic = await prisma.clinic.findUnique({ where: { userId: user.id } });
    if (!clinic) {
      return { ok: false, code: 'NOT_FOUND', message: 'Clinic profile not found' };
    }

    const data = await getClinicDashboard(clinic.id);
    return { ok: true, data };
  },

  async doctor(user: AuthUser): Promise<ServiceResult<unknown>> {
    if (user.role !== 'DOCTOR') {
      return { ok: false, code: 'FORBIDDEN', message: 'Only DOCTOR can access this dashboard' };
    }

    const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!doctor) {
      return { ok: false, code: 'NOT_FOUND', message: 'Doctor profile not found' };
    }

    const data = await getDoctorDashboard(doctor.id);
    return { ok: true, data };
  },

  async patient(user: AuthUser): Promise<ServiceResult<unknown>> {
    if (user.role !== 'PATIENT') {
      return { ok: false, code: 'FORBIDDEN', message: 'Only PATIENT can access this dashboard' };
    }

    const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient) {
      return { ok: false, code: 'NOT_FOUND', message: 'Patient profile not found' };
    }

    const data = await getPatientDashboard(patient.id, user.id);
    return { ok: true, data };
  },
};
