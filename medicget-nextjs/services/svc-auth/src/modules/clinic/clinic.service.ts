import { AuthUser }        from '@medicget/shared/auth';
import { clinicRepository } from './clinic.repository';

export type ServiceResult<T> =
  | { ok: true;  data: T }
  | { ok: false; code: string; message: string };

export const clinicService = {
  async dashboard(user: AuthUser): Promise<ServiceResult<object>> {
    if (user.role !== 'CLINIC') {
      return { ok: false, code: 'FORBIDDEN', message: 'Clinic role required' };
    }

    const clinic = await clinicRepository.findByUserId(user.id);
    if (!clinic) return { ok: false, code: 'NOT_FOUND', message: 'Clinic not found' };

    const [stats, recentAppointments, appointmentsByDay] = await Promise.all([
      clinicRepository.dashboardStats(clinic.id),
      clinicRepository.recentAppointments(clinic.id, 10),
      clinicRepository.appointmentsByDay(clinic.id, 7),
    ]);

    // Aggregate appointments per day label
    const dayCounts: Record<string, number> = {};
    for (const appt of appointmentsByDay) {
      const label = appt.date.toISOString().slice(0, 10);
      dayCounts[label] = (dayCounts[label] ?? 0) + 1;
    }
    const weeklyChart = Object.entries(dayCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        label: new Date(date).toLocaleDateString('es-ES', { weekday: 'short' }),
        value: count,
      }));

    return {
      ok: true,
      data: {
        clinic,
        stats,
        recentAppointments,
        weeklyChart,
      },
    };
  },
};
