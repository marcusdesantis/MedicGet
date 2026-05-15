/**
 * statusConfig — colores compartidos por StatusBadge. Misma estructura que
 * el frontend web pero las classNames están tuneadas para NativeWind.
 */

import type { StatusMap } from '@/components/ui/StatusBadge';

export const appointmentStatusMap: StatusMap = {
  upcoming: {
    label: 'Próxima',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
  },
  pending: {
    label: 'Pendiente',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
  },
  completed: {
    label: 'Completada',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  done: {
    label: 'Completada',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  ongoing: {
    label: 'En curso',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
  },
  cancelled: {
    label: 'Cancelada',
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-400',
  },
  no_show: {
    label: 'No asistió',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-400',
  },
};
