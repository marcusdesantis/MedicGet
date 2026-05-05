/**
 * statusConfig — single source of truth for all StatusBadge color mappings.
 *
 * Rules:
 *  - Every status color must be defined HERE, never inline in a page.
 *  - Import the relevant map in your page and pass it to <StatusBadge statusMap={...} />.
 *  - Add new domain maps at the bottom following the same pattern.
 */

import type { StatusMap } from '@/components/ui/StatusBadge';

// ─── Appointment status ──────────────────────────────────────────────────────
// Used by: PatientAppointmentsPage, DoctorAppointmentsPage,
//          ClinicAppointmentsPage, ClinicDashboardPage
export const appointmentStatusMap: StatusMap = {
  upcoming:  { label: 'Próxima',    className: 'bg-blue-100    text-blue-700    dark:bg-blue-900/30    dark:text-blue-400'    },
  pending:   { label: 'Pendiente',  className: 'bg-amber-100   text-amber-700   dark:bg-amber-900/30   dark:text-amber-400'   },
  completed: { label: 'Completada', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  done:      { label: 'Completada', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  ongoing:   { label: 'En curso',   className: 'bg-blue-100    text-blue-700    dark:bg-blue-900/30    dark:text-blue-400'    },
  cancelled: { label: 'Cancelada',  className: 'bg-rose-100    text-rose-700    dark:bg-rose-900/30    dark:text-rose-400'    },
  no_show:   { label: 'No asistió', className: 'bg-slate-100   text-slate-600   dark:bg-slate-800      dark:text-slate-400'   },
};

// ─── Patient status ──────────────────────────────────────────────────────────
// Used by: ClinicPatientsPage, PatientHistoryPage
export const patientStatusMap: StatusMap = {
  active:   { label: 'Activo',   className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  new:      { label: 'Nuevo',    className: 'bg-blue-100    text-blue-700    dark:bg-blue-900/30    dark:text-blue-400'    },
  inactive: { label: 'Inactivo', className: 'bg-slate-100   text-slate-500   dark:bg-slate-800      dark:text-slate-400'   },
};

// ─── Payment status ──────────────────────────────────────────────────────────
// Used by: PaymentsPage
export const paymentStatusMap: StatusMap = {
  paid:     { label: 'Pagado',   className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  pending:  { label: 'Pendiente',className: 'bg-amber-100   text-amber-700   dark:bg-amber-900/30   dark:text-amber-400'   },
  refunded: { label: 'Devuelto', className: 'bg-slate-100   text-slate-600   dark:bg-slate-800      dark:text-slate-400'   },
};

// ─── Doctor availability ─────────────────────────────────────────────────────
// Used by: ManageDoctorsPage, SearchDoctorsPage
export const availabilityStatusMap: StatusMap = {
  available:     { label: 'Disponible',     className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  unavailable:   { label: 'No disponible',  className: 'bg-slate-100   text-slate-500   dark:bg-slate-800      dark:text-slate-400'   },
};

// ─── Specialty status ────────────────────────────────────────────────────────
// Used by: SpecialtiesPage
export const specialtyStatusMap: StatusMap = {
  active:   { label: 'Activa',   className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  inactive: { label: 'Inactiva', className: 'bg-slate-100   text-slate-500   dark:bg-slate-800      dark:text-slate-400'   },
};

// ─── Medical record types ────────────────────────────────────────────────────
// Used by: MedicalHistoryPage
export const recordTypeMap: StatusMap = {
  Laboratorio: { label: 'Laboratorio', className: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400'   },
  Diagnóstico: { label: 'Diagnóstico', className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  Imagen:      { label: 'Imagen',      className: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400'  },
  Consulta:    { label: 'Consulta',    className: 'bg-slate-100  text-slate-700  dark:bg-slate-800     dark:text-slate-300'  },
};

// ─── Doctor calendar time-slot status ────────────────────────────────────────
// Used by: DoctorCalendarPage
export const timeSlotStatusMap: StatusMap = {
  free:    { label: 'Libre',     className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  blocked: { label: 'Bloqueado', className: 'bg-rose-100    text-rose-600    dark:bg-rose-900/40    dark:text-rose-400'    },
};
