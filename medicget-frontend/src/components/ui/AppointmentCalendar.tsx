import { useMemo, useState } from 'react';
import {
  Calendar, dateFnsLocalizer, type Event as RBCEvent, type View,
} from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  X, Calendar as CalendarIcon, Clock, MapPin, User, Stethoscope,
  Video, MessageSquare, Building2, Check, CheckCircle, Loader2,
} from 'lucide-react';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import './AppointmentCalendar.css';

import type { AppointmentDto, AppointmentModality } from '@/lib/api';
import { StatusBadge } from './StatusBadge';
import { appointmentStatusMap } from '@/lib/statusConfig';

/* ── Localizer (Spanish, Mon-start) ─────────────────────────────────────── */
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }),
  getDay,
  locales: { es },
});

interface AppointmentEvent extends RBCEvent {
  id:        string;
  appointment: AppointmentDto;
  status:    AppointmentDto['status'];
}

/* ── Status / modality maps (UI strings + colours) ──────────────────────── */
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  PENDING:   { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  UPCOMING:  { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  ONGOING:   { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a' },
  COMPLETED: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  CANCELLED: { bg: '#ffe4e6', border: '#f43f5e', text: '#9f1239' },
  NO_SHOW:   { bg: '#f1f5f9', border: '#64748b', text: '#334155' },
};
const STATUS_LABEL: Record<string, string> = {
  PENDING:   'Pendiente',
  UPCOMING:  'Próxima',
  ONGOING:   'En curso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW:   'No asistió',
};
const MODALITY_META: Record<AppointmentModality, { label: string; icon: React.ReactNode }> = {
  ONLINE:     { label: 'Videollamada', icon: <Video size={14} /> },
  PRESENCIAL: { label: 'Presencial',   icon: <Building2 size={14} /> },
  CHAT:       { label: 'Chat en vivo', icon: <MessageSquare size={14} /> },
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fullName(p?: { firstName?: string; lastName?: string }) {
  return [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'Sin nombre';
}

/**
 * Combine `date` (YYYY-MM-DD or full ISO) + `time` (HH:MM) into a Date in
 * the BROWSER'S LOCAL TZ — same convention as the booking page.
 */
function combineDateTime(date: string, time: string): Date {
  const datePart = date.length > 10 ? date.slice(0, 10) : date;
  return new Date(`${datePart}T${time}:00`);
}

function fmtLong(d: Date): string {
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

/* ── Public props ───────────────────────────────────────────────────────── */
export interface AppointmentCalendarProps {
  appointments: AppointmentDto[];
  /** Whose perspective is showing the calendar — affects event title + actions. */
  role:         'doctor' | 'patient' | 'clinic';
  className?:   string;

  /** Optional action handlers — shown in the detail drawer when applicable. */
  onCancel?:   (a: AppointmentDto) => void | Promise<void>;
  onConfirm?:  (a: AppointmentDto) => void | Promise<void>;   // doctor only
  onComplete?: (a: AppointmentDto) => void | Promise<void>;   // doctor only
  /** Called BEFORE any of the above run, for parent-level loading state. */
  actingId?:   string | null;
}

/**
 * AppointmentCalendar — month/week/day view of a list of appointments,
 * styled to match the rest of the app and with a built-in detail drawer
 * that opens on event click.
 *
 * The drawer renders generic info (date, time, modality, price, notes,
 * counterpart) plus action buttons that fire the parent's callbacks.
 * Buttons appear only when the corresponding handler is supplied AND the
 * status/role combination makes sense (a patient gets "Cancelar" on
 * PENDING/UPCOMING; a doctor gets "Confirmar" on PENDING and "Atender" on
 * UPCOMING/ONGOING).
 */
export function AppointmentCalendar({
  appointments, role, onCancel, onConfirm, onComplete, actingId, className,
}: AppointmentCalendarProps) {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState<Date>(new Date());
  const [selected, setSelected] = useState<AppointmentDto | null>(null);

  const events = useMemo<AppointmentEvent[]>(() =>
    appointments.map((a) => {
      const start = combineDateTime(a.date, a.time);
      const durationMin = (a.doctor as { consultDuration?: number })?.consultDuration ?? 30;
      const end = new Date(start.getTime() + durationMin * 60_000);

      const title =
        role === 'doctor'
          ? `${a.time} · ${fullName(a.patient?.user?.profile)}`
          : role === 'clinic'
            ? `${fullName(a.patient?.user?.profile)} → Dr. ${fullName(a.doctor?.user?.profile)}`
            : `Dr. ${fullName(a.doctor?.user?.profile)}`;

      return {
        id:          a.id,
        title,
        start,
        end,
        status:      a.status,
        appointment: a,
      };
    }),
    [appointments, role],
  );

  const eventStyleGetter = (event: AppointmentEvent) => {
    const colors = STATUS_COLORS[event.status] ?? STATUS_COLORS.PENDING;
    return {
      style: {
        backgroundColor: colors.bg,
        borderLeft:      `3px solid ${colors.border}`,
        color:           colors.text,
      },
    };
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 ${className ?? ''}`}>
      <Calendar<AppointmentEvent>
        localizer={localizer}
        events={events}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        startAccessor="start"
        endAccessor="end"
        culture="es"
        views={['month', 'week', 'day', 'agenda']}
        style={{ height: 620 }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={(e) => setSelected(e.appointment)}
        popup
        messages={{
          today:    'Hoy',
          previous: 'Anterior',
          next:     'Siguiente',
          month:    'Mes',
          week:     'Semana',
          day:      'Día',
          agenda:   'Agenda',
          date:     'Fecha',
          time:     'Hora',
          event:    'Cita',
          noEventsInRange: 'No hay citas en este rango.',
          showMore: (count) => `+${count} más`,
        }}
      />

      {/* Status legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
        {Object.entries(STATUS_COLORS).map(([status, colors]) => (
          <span key={status} className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: colors.bg, borderLeft: `3px solid ${colors.border}` }}
            />
            {STATUS_LABEL[status]}
          </span>
        ))}
      </div>

      {/* Detail drawer */}
      {selected && (
        <DetailDrawer
          appointment={selected}
          role={role}
          onClose={() => setSelected(null)}
          onCancel={onCancel}
          onConfirm={onConfirm}
          onComplete={onComplete}
          isActing={actingId === selected.id}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Detail drawer
 * ═══════════════════════════════════════════════════════════════════════════ */
interface DrawerProps {
  appointment: AppointmentDto;
  role:        AppointmentCalendarProps['role'];
  onClose:     () => void;
  onCancel?:   AppointmentCalendarProps['onCancel'];
  onConfirm?:  AppointmentCalendarProps['onConfirm'];
  onComplete?: AppointmentCalendarProps['onComplete'];
  isActing:    boolean;
}

function DetailDrawer({
  appointment, role, onClose, onCancel, onConfirm, onComplete, isActing,
}: DrawerProps) {
  const a = appointment;
  const startDate = combineDateTime(a.date, a.time);
  const modality = MODALITY_META[a.modality];

  // Counterpart — the OTHER party in the appointment based on viewer role.
  const counterpart =
    role === 'doctor'
      ? { label: 'Paciente',     icon: <User size={14} />,        name: fullName(a.patient?.user?.profile),               sub: undefined }
      : role === 'clinic'
        ? { label: 'Paciente',   icon: <User size={14} />,        name: fullName(a.patient?.user?.profile),               sub: `Dr. ${fullName(a.doctor?.user?.profile)} · ${a.doctor?.specialty ?? ''}` }
        : { label: 'Médico',     icon: <Stethoscope size={14} />, name: `Dr. ${fullName(a.doctor?.user?.profile)}`,        sub: a.doctor?.specialty };

  // Action visibility per role + status
  const canCancel  = !!onCancel  && (a.status === 'PENDING' || a.status === 'UPCOMING');
  const canConfirm = !!onConfirm && role === 'doctor' && a.status === 'PENDING';
  const canComplete = !!onComplete && role === 'doctor' && (a.status === 'UPCOMING' || a.status === 'ONGOING');

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 h-full overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-1.5">Detalle de la cita</p>
            <div className="flex items-center gap-2">
              <StatusBadge status={a.status.toLowerCase()} statusMap={appointmentStatusMap} size="sm" />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mt-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-5 space-y-5">
          {/* Big date + time */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white capitalize">{fmtLong(startDate)}</h2>
            <p className="mt-1 text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{a.time}</p>
          </div>

          <div className="space-y-3">
            <DetailRow icon={counterpart.icon} label={counterpart.label} value={counterpart.name} sub={counterpart.sub} />
            <DetailRow icon={modality.icon}    label="Modalidad"        value={modality.label} />
            {a.clinic && (
              <DetailRow icon={<MapPin size={14} />} label="Centro" value={a.clinic.name} />
            )}
            <DetailRow
              icon={<Clock size={14} />}
              label="Duración"
              value={`${(a.doctor as { consultDuration?: number })?.consultDuration ?? 30} min`}
            />
            <DetailRow
              icon={<CalendarIcon size={14} />}
              label="Precio"
              value={a.price > 0 ? `$${a.price.toFixed(2)}` : 'Gratuita'}
              bold
            />
          </div>

          {a.notes && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400 mb-1.5">Notas</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{a.notes}</p>
            </div>
          )}

          {a.cancelReason && a.status === 'CANCELLED' && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-4">
              <p className="text-xs uppercase tracking-wider text-rose-500 mb-1.5">Motivo de cancelación</p>
              <p className="text-sm text-rose-700 dark:text-rose-300">{a.cancelReason}</p>
            </div>
          )}

          {/* Meeting link — only ONLINE appointments that are still active */}
          {a.modality === 'ONLINE' && a.meetingUrl && a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-4 border border-blue-100 dark:border-blue-900/50">
              <p className="text-xs uppercase tracking-wider text-blue-500 mb-1.5 flex items-center gap-1.5">
                <Video size={11} /> Videollamada
              </p>
              <a
                href={a.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm"
              >
                <Video size={14} /> Unirse a la consulta
              </a>
              <p className="mt-2 text-[11px] text-slate-500 break-all">
                {a.meetingUrl}
              </p>
            </div>
          )}

          {/* Chat link — CHAT modality, while still active. Clinic admins
              don't get chat access (privacy boundary). */}
          {a.modality === 'CHAT' && a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && a.status !== 'NO_SHOW' && role !== 'clinic' && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-100 dark:border-emerald-900/50">
              <p className="text-xs uppercase tracking-wider text-emerald-600 mb-1.5 flex items-center gap-1.5">
                <MessageSquare size={11} /> Chat en vivo
              </p>
              <a
                href={`/${role}/appointments/${a.id}/chat`}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm"
              >
                <MessageSquare size={14} /> Abrir conversación
              </a>
            </div>
          )}

          {/* Presencial detail link — PRESENCIAL modality, while still active */}
          {a.modality === 'PRESENCIAL' && a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && a.status !== 'NO_SHOW' && role !== 'clinic' && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-4 border border-rose-100 dark:border-rose-900/50">
              <p className="text-xs uppercase tracking-wider text-rose-600 mb-1.5 flex items-center gap-1.5">
                <MapPin size={11} /> Cita presencial
              </p>
              <a
                href={`/${role}/appointments/${a.id}`}
                className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm"
              >
                <MapPin size={14} /> {role === 'doctor' ? 'Atender en consultorio' : 'Ver detalles · check-in'}
              </a>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {(canCancel || canConfirm || canComplete) && (
          <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center gap-2 flex-wrap">
            {canConfirm && (
              <button
                onClick={() => onConfirm?.(a)}
                disabled={isActing}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                {isActing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Confirmar cita
              </button>
            )}
            {canComplete && (
              <button
                onClick={() => onComplete?.(a)}
                disabled={isActing}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                {isActing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Marcar atendida
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => onCancel?.(a)}
                disabled={isActing}
                className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50 ml-auto"
              >
                {isActing ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Cancelar cita
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function DetailRow({ icon, label, value, sub, bold }: {
  icon:  React.ReactNode;
  label: string;
  value: string;
  sub?:  string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 mt-0.5">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
        <p className={`${bold ? 'font-bold text-slate-900 dark:text-white text-base' : 'text-sm text-slate-700 dark:text-slate-200'}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
