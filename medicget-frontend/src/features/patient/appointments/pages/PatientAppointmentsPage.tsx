import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, Clock, Loader2, X, List, CalendarDays, Video, MessageSquare, MapPin, Eye, CreditCard } from 'lucide-react';
import { PageHeader }    from '@/components/ui/PageHeader';
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

  const handleCancel = async (id: string) => {
    if (!confirm('¿Seguro que deseas cancelar esta cita?')) return;
    setCancellingId(id);
    setActionError(null);
    try {
      await appointmentsApi.cancel(id);
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo cancelar la cita';
      setActionError(msg);
    } finally {
      setCancellingId(null);
    }
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
          onCancel={(appt) => handleCancel(appt.id)}
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
                    <Avatar initials={doctorInitials(a)} size="lg" shape="rounded" variant="blue" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 dark:text-white">{doctorName(a)}</p>
                        <StatusBadge status={a.status.toLowerCase()} statusMap={appointmentStatusMap} size="sm" />
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
                    {cancellable && (
                      <button
                        onClick={() => handleCancel(a.id)}
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
