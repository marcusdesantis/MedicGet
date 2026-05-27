import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, Clock, Loader2, X, List, CalendarDays, Video, MessageSquare, MapPin, Eye, CreditCard, Star, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { ReviewModal } from '@/features/shared/reviews/ReviewModal';
import { PageHeader }    from '@/components/ui/PageHeader';
import { PolicyPanel }   from '@/components/ui/PolicyPanel';
import { Tabs }          from '@/components/ui/Tabs';
import { Avatar }        from '@/components/ui/Avatar';
import { StatusBadge }   from '@/components/ui/StatusBadge';
import { SectionCard }   from '@/components/ui/SectionCard';
import { EmptyState }    from '@/components/ui/EmptyState';
import { Alert }         from '@/components/ui/Alert';
import { AppointmentCalendar } from '@/components/ui/AppointmentCalendar';
import { useApi }        from '@/hooks/useApi';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { appointmentsApi, type AppointmentDto, type PaginatedData } from '@/lib/api';

const TABS = ['Próximas', 'Pasadas', 'Canceladas'] as const;

/** Backend appointment statuses bucketed into the three UI tabs. */
const TAB_STATUSES: Record<typeof TABS[number], string[]> = {
  'Próximas':   ['PENDING', 'UPCOMING', 'ONGOING'],
  'Pasadas':    ['COMPLETED', 'NO_SHOW'],
  'Canceladas': ['CANCELLED'],
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function doctorName(a: AppointmentDto): string {
  const p = a.doctor?.user?.profile;
  return `Dr. ${[p?.firstName, p?.lastName].filter(Boolean).join(' ')}`.trim();
}

function doctorInitials(a: AppointmentDto): string {
  const p = a.doctor?.user?.profile;
  return ((p?.firstName?.[0] ?? '') + (p?.lastName?.[0] ?? '')).toUpperCase() || 'DR';
}

export function PatientAppointmentsPage() {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Próximas');
  const [viewMode, setViewMode]   = useState<'list' | 'calendar'>('list');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<AppointmentDto | null>(null);
  /** Cita seleccionada para el modal de cancelación (con política de reembolso). */
  const [pendingCancel, setPendingCancel] = useState<AppointmentDto | null>(null);

  const { state, refetch } = useApi<PaginatedData<AppointmentDto>>(
    () => appointmentsApi.list({ pageSize: 100 }),
    [],
  );

  const visible = useMemo(() => {
    if (state.status !== 'ready') return [];
    return state.data.data.filter((a) =>
      TAB_STATUSES[activeTab].includes(a.status),
    );
  }, [state, activeTab]);

  /**
   * Confirma la cancelación tras el modal. El backend evalúa si aplica
   * reembolso (>=24h + payment.status=PAID) y crea una RefundRequest si
   * corresponde. Acá mostramos el toast acorde y refetcheamos.
   */
  const confirmCancel = async (appt: AppointmentDto, reason: string) => {
    setCancellingId(appt.id);
    setActionError(null);
    try {
      await appointmentsApi.update(appt.id, {
        status:       'CANCELLED',
        cancelReason: reason || undefined,
      });
      const wouldRefund = appointmentQualifiesForRefund(appt);
      if (wouldRefund) {
        toast.success('Cita cancelada. Tu reembolso está en proceso (3-5 días hábiles).');
      } else {
        toast.success('Cita cancelada.');
      }
      setPendingCancel(null);
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo cancelar la cita';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setCancellingId(null);
    }
  };

  /** Helper para el calendar view, que no abre modal — usa confirm legacy. */
  const handleCancelFromCalendar = (id: string) => {
    const appt = state.status === 'ready' ? state.data.data.find((x) => x.id === id) : null;
    if (appt) setPendingCancel(appt);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis citas"
        subtitle="Gestiona tus citas médicas"
        action={
          <Link
            to="/patient/search"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition shadow-sm"
          >
            <Plus size={15} /> Nueva cita
          </Link>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Tabs tabs={[...TABS]} active={activeTab} onChange={(v) => setActiveTab(v as typeof TABS[number])} />
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {actionError && <Alert variant="error">{actionError}</Alert>}

      <PolicyPanel
        title="Política de cancelación y reembolsos"
        icon={RotateCcw}
        tone="blue"
        defaultOpen={false}
        steps={[
          <>Podés cancelar una cita cuando quieras desde el botón <strong>Cancelar</strong>.</>,
          <>Si tu cita está <strong>pagada</strong> y la cancelás con <strong>24 horas o más de anticipación</strong>, se te reembolsa el <strong>100% del monto</strong>.</>,
          <>Si la cancelás con <strong>menos de 24 horas</strong>, la cancelación se hace igual pero <strong>no aplica reembolso</strong>.</>,
          <>Cuando aplica, el reembolso se procesa al <strong>mismo medio de pago</strong> en <strong>3 a 5 días hábiles</strong>. Lo vas a ver reflejado según tu banco.</>,
        ]}
      >
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Antes de confirmar una cancelación te mostramos si tu caso aplica o no a reembolso, así no hay sorpresas.
        </p>
      </PolicyPanel>

      {state.status === 'loading' && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin" size={20} />
        </div>
      )}

      {state.status === 'error' && (
        <Alert variant="error" action={
          <button onClick={refetch} className="text-sm font-medium underline whitespace-nowrap">Reintentar</button>
        }>
          {state.error.message}
        </Alert>
      )}

      {state.status === 'ready' && viewMode === 'calendar' && (
        // Calendar view always shows ALL appointments regardless of the
        // active tab — the user filters visually via the colours.
        // Click on an event opens a detail drawer with action buttons.
        <AppointmentCalendar
          appointments={state.data.data}
          role="patient"
          onCancel={(appt) => handleCancelFromCalendar(appt.id)}
          actingId={cancellingId}
        />
      )}

      {state.status === 'ready' && viewMode === 'list' && (
        <SectionCard noPadding>
          {visible.length === 0 ? (
            <EmptyState
              title="Sin citas en esta categoría"
              description={activeTab === 'Próximas'
                ? 'Cuando reserves con un especialista, lo verás acá.'
                : 'Las citas pasadas y canceladas se mostrarán aquí cuando ocurran.'}
              icon={Calendar}
              action={activeTab === 'Próximas' ? (
                <Link to="/patient/search" className="text-sm text-blue-600 font-medium hover:underline">
                  Buscar médicos →
                </Link>
              ) : undefined}
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {visible.map((a) => {
                const cancellable = a.status === 'PENDING' || a.status === 'UPCOMING';
                const showJoinBtn =
                  a.modality === 'ONLINE' &&
                  a.meetingUrl &&
                  a.status !== 'CANCELLED' &&
                  a.status !== 'COMPLETED' &&
                  a.status !== 'NO_SHOW';
                /* Payment is required for any PENDING appointment. The
                 * "Pagar" button takes priority over chat/presencial
                 * actions because if you don't pay nothing else will
                 * unlock. */
                const needsPayment =
                  a.status === 'PENDING' &&
                  (!a.payment || a.payment.status === 'PENDING');
                return (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <Avatar
                      initials={doctorInitials(a)}
                      imageUrl={a.doctor?.user?.profile?.avatarUrl ?? null}
                      size="lg"
                      shape="rounded"
                      variant="blue"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 dark:text-white">{doctorName(a)}</p>
                        <StatusBadge status={a.status.toLowerCase()} statusMap={appointmentStatusMap} size="sm" />
                        {a.payment?.status === 'PENDING_REFUND' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-md text-[11px] font-semibold">
                            <Loader2 size={10} className="animate-spin" /> Reembolso en proceso
                          </span>
                        )}
                        {a.payment?.status === 'REFUNDED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-md text-[11px] font-semibold">
                            <CheckCircle2 size={10} /> Reembolsado
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-blue-600 font-medium">{a.doctor?.specialty ?? '—'}</p>
                      {a.notes && <p className="text-xs text-slate-400 mt-0.5 truncate">{a.notes}</p>}
                      {a.clinic && <p className="text-xs text-slate-400 mt-0.5">{a.clinic.name}</p>}
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 justify-end">
                        <Calendar size={14} /> {fmtDate(a.date)}
                      </p>
                      <p className="flex items-center gap-1.5 text-sm text-slate-400 justify-end mt-1">
                        <Clock size={14} /> {a.time}
                      </p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">
                        ${a.price.toFixed(2)}
                      </p>
                    </div>
                    {needsPayment && (
                      <Link
                        to={`/payment/checkout/${a.id}`}
                        className="ml-2 inline-flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
                        title="Pagar reserva"
                      >
                        <CreditCard size={14} />
                        <span>Pagar ${a.price.toFixed(2)}</span>
                      </Link>
                    )}
                    {showJoinBtn && !needsPayment && (
                      <a
                        href={a.meetingUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
                        title="Unirse a la videollamada"
                      >
                        <Video size={14} />
                        <span className="hidden md:inline">Unirme</span>
                      </a>
                    )}
                    {a.modality === 'CHAT' &&
                     a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && a.status !== 'NO_SHOW' && (
                      <Link
                        to={`/patient/appointments/${a.id}/chat`}
                        className="ml-2 inline-flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
                        title="Abrir chat en vivo"
                      >
                        <MessageSquare size={14} />
                        <span className="hidden md:inline">Chat</span>
                      </Link>
                    )}
                    {a.modality === 'PRESENCIAL' &&
                     a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && a.status !== 'NO_SHOW' && (
                      <Link
                        to={`/patient/appointments/${a.id}`}
                        className="ml-2 inline-flex items-center gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
                        title="Ver detalles de la cita presencial"
                      >
                        <MapPin size={14} />
                        <span className="hidden md:inline">Asistir</span>
                      </Link>
                    )}
                    <Link
                      to={`/patient/appointments/${a.id}`}
                      className="ml-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1.5 rounded-lg transition"
                      title="Ver detalles"
                    >
                      <Eye size={14} />
                    </Link>
                    {a.status === 'COMPLETED' && !a.review && (
                      <button
                        onClick={() => setReviewing(a)}
                        className="ml-2 inline-flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
                        title="Calificar al médico"
                      >
                        <Star size={14} />
                        <span className="hidden md:inline">Calificar</span>
                      </button>
                    )}
                    {a.status === 'COMPLETED' && a.review && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-500 font-semibold px-2 py-1.5">
                        <Star size={12} className="fill-amber-400" />
                        {a.review.rating}/5
                      </span>
                    )}
                    {cancellable && (
                      <button
                        onClick={() => setPendingCancel(a)}
                        disabled={cancellingId === a.id}
                        className="ml-2 inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-2 py-1.5 rounded-lg transition disabled:opacity-50"
                      >
                        {cancellingId === a.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                        <span className="hidden sm:inline">Cancelar</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}

      {reviewing && (
        <ReviewModal
          appointment={reviewing}
          onClose={() => setReviewing(null)}
          onSaved={() => { setReviewing(null); refetch(); }}
        />
      )}

      {pendingCancel && (
        <CancelAppointmentModal
          appointment={pendingCancel}
          submitting={cancellingId === pendingCancel.id}
          onClose={() => setPendingCancel(null)}
          onConfirm={(reason) => confirmCancel(pendingCancel, reason)}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */

/**
 * Modal de confirmación de cancelación con política de reembolso visible.
 *
 * Lógica de elegibilidad (debe espejar `paymentService.refund` del backend):
 *   • Cita con pago PAID → reembolsable si la cita es >=24h en el futuro.
 *   • Sin pago aprobado o cita <24h → cancela pero sin reembolso.
 *
 * El modal pide un `cancelReason` libre (opcional pero recomendado, va al
 * admin cuando procesa el reverso).
 */
const REFUND_HOURS_THRESHOLD = 24;

function appointmentQualifiesForRefund(appt: AppointmentDto): boolean {
  if (!appt.payment || appt.payment.status !== 'PAID') return false;
  const hoursUntil = hoursUntilAppointment(appt);
  return hoursUntil >= REFUND_HOURS_THRESHOLD;
}

function hoursUntilAppointment(appt: AppointmentDto): number {
  // El backend asume Ecuador (UTC-5) — replicamos acá para que el preview
  // coincida con la decisión real.
  const slot = new Date(`${appt.date.slice(0, 10)}T${appt.time}:00-05:00`);
  return (slot.getTime() - Date.now()) / (60 * 60 * 1000);
}

function CancelAppointmentModal({
  appointment, submitting, onClose, onConfirm,
}: {
  appointment: AppointmentDto;
  submitting:  boolean;
  onClose:     () => void;
  onConfirm:   (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const refundable = appointmentQualifiesForRefund(appointment);
  const hours      = Math.max(0, Math.floor(hoursUntilAppointment(appointment)));
  const hasPaidPayment = appointment.payment?.status === 'PAID';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Cancelar cita</h2>
            <p className="text-xs text-slate-500 mt-1">
              {doctorName(appointment)} · {fmtDate(appointment.date)} {appointment.time}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" disabled={submitting}>
            <X size={20} />
          </button>
        </div>

        {/* Política de reembolso visible ANTES de confirmar */}
        {hasPaidPayment ? (
          refundable ? (
            <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 p-4 mb-4">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 inline-flex items-center gap-2">
                <CheckCircle2 size={16} /> Reembolso aplicable
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-200 mt-1.5">
                Faltan {hours}h para tu cita. Se devolverán <strong>${appointment.payment?.amount.toFixed(2)}</strong> al mismo medio de pago. Procesamos el reverso en 3-5 días hábiles.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 p-4 mb-4">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 inline-flex items-center gap-2">
                <AlertTriangle size={16} /> Sin reembolso
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-200 mt-1.5">
                Tu cita es en menos de {REFUND_HOURS_THRESHOLD}h ({hours}h restantes). Las cancelaciones con menos de {REFUND_HOURS_THRESHOLD}h de anticipación no son reembolsables — vas a cancelar pero no se devuelve el monto.
              </p>
            </div>
          )
        ) : (
          <div className="rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-4 mb-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Esta cita todavía no está pagada — al cancelarla simplemente liberás el horario para otro paciente.
            </p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
            Motivo de la cancelación (opcional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="ej: Surgió un imprevisto laboral."
            maxLength={300}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <p className="text-[11px] text-slate-400 mt-1">{reason.length}/300</p>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition disabled:opacity-50"
          >
            Volver
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={submitting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg inline-flex items-center gap-2 transition disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Confirmar cancelación
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Tiny segmented control to switch between list and calendar view. Reused
 * in the doctor's appointments page below.
 */
function ViewToggle({ value, onChange }: {
  value:    'list' | 'calendar';
  onChange: (v: 'list' | 'calendar') => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
      <button
        onClick={() => onChange('list')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
          value === 'list'
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <List size={13} /> Lista
      </button>
      <button
        onClick={() => onChange('calendar')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
          value === 'calendar'
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <CalendarDays size={13} /> Calendario
      </button>
    </div>
  );
}
