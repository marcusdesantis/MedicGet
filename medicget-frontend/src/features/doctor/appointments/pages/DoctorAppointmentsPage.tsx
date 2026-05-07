import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Loader2, Check, X, CheckCircle, List, CalendarDays, Video, MessageSquare, MapPin, Eye } from 'lucide-react';
import { PageHeader }     from '@/components/ui/PageHeader';
import { Tabs }           from '@/components/ui/Tabs';
import { SearchInput }    from '@/components/ui/SearchInput';
import { SectionCard }    from '@/components/ui/SectionCard';
import { Avatar }         from '@/components/ui/Avatar';
import { StatusBadge }    from '@/components/ui/StatusBadge';
import { EmptyState }     from '@/components/ui/EmptyState';
import { Alert }          from '@/components/ui/Alert';
import { AppointmentCalendar } from '@/components/ui/AppointmentCalendar';
import { useApi }         from '@/hooks/useApi';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { appointmentsApi, type AppointmentDto, type PaginatedData } from '@/lib/api';

const TABS = ['Todas', 'Pendientes', 'Próximas', 'Completadas', 'Canceladas'] as const;

const TAB_STATUSES: Record<typeof TABS[number], string[] | null> = {
  'Todas':       null,
  'Pendientes':  ['PENDING'],
  'Próximas':    ['UPCOMING', 'ONGOING'],
  'Completadas': ['COMPLETED'],
  'Canceladas':  ['CANCELLED', 'NO_SHOW'],
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

function patientName(a: AppointmentDto): string {
  const p = a.patient?.user?.profile;
  return [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'Paciente';
}

function patientInitials(a: AppointmentDto): string {
  const p = a.patient?.user?.profile;
  return ((p?.firstName?.[0] ?? '') + (p?.lastName?.[0] ?? '')).toUpperCase() || 'PT';
}

export function DoctorAppointmentsPage() {
  const [tab,    setTab]    = useState<typeof TABS[number]>('Todas');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode]   = useState<'list' | 'calendar'>('list');
  const [actingId,    setActingId]    = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { state, refetch } = useApi<PaginatedData<AppointmentDto>>(
    () => appointmentsApi.list({ pageSize: 100 }),
    [],
  );

  const visible = useMemo(() => {
    if (state.status !== 'ready') return [];
    const statusFilter = TAB_STATUSES[tab];
    const q = search.trim().toLowerCase();
    return state.data.data.filter((a) => {
      const matchStatus = !statusFilter || statusFilter.includes(a.status);
      const matchSearch = !q || patientName(a).toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [state, tab, search]);

  /**
   * Drives the row-level action buttons. Uses the `update` endpoint with the
   * new status — the backend's appointmentsService validates that the caller
   * is the assigned doctor before mutating.
   */
  const updateStatus = async (
    id: string,
    newStatus: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED',
  ) => {
    setActingId(id);
    setActionError(null);
    try {
      await appointmentsApi.update(id, { status: newStatus });
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo actualizar la cita';
      setActionError(msg);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Citas" subtitle="Gestiona todas tus consultas programadas" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Tabs tabs={[...TABS]} active={tab} onChange={(v) => setTab(v as typeof TABS[number])} />
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar paciente..." className="flex-1 sm:w-48" />
          <ViewToggleDoctor value={viewMode} onChange={setViewMode} />
        </div>
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
        // Calendar always shows ALL appointments — colour-coded by status.
        // Click on an event opens a detail drawer with role-specific actions.
        <AppointmentCalendar
          appointments={state.data.data}
          role="doctor"
          actingId={actingId}
          onConfirm={(a)  => updateStatus(a.id, 'UPCOMING')}
          onCancel={(a)   => updateStatus(a.id, 'CANCELLED')}
          onComplete={(a) => updateStatus(a.id, 'COMPLETED')}
        />
      )}

      {state.status === 'ready' && viewMode === 'list' && (
        <SectionCard noPadding>
          {visible.length === 0 ? (
            <EmptyState
              title="Sin citas para mostrar"
              description="Cuando un paciente reserve, su cita aparecerá aquí."
              icon={Calendar}
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {visible.map((a) => {
                const isActing = actingId === a.id;
                return (
                  <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <Avatar initials={patientInitials(a)} size="md" variant="indigo" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 dark:text-white">{patientName(a)}</p>
                        <StatusBadge status={a.status.toLowerCase()} statusMap={appointmentStatusMap} size="sm" />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{a.notes ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                      <span className="flex items-center gap-1 text-slate-500"><Calendar size={13} /> {fmtDate(a.date)}</span>
                      <span className="flex items-center gap-1 text-slate-500"><Clock size={13} /> {a.time}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {a.modality === 'ONLINE' && a.meetingUrl &&
                       a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && a.status !== 'NO_SHOW' && (
                        <a
                          href={a.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg transition shadow-sm mr-1"
                          title="Unirse a la videollamada"
                        >
                          <Video size={14} />
                          <span className="hidden md:inline">Unirme</span>
                        </a>
                      )}
                      {a.modality === 'CHAT' &&
                       a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && a.status !== 'NO_SHOW' && (
                        <Link
                          to={`/doctor/appointments/${a.id}/chat`}
                          className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg transition shadow-sm mr-1"
                          title="Abrir chat en vivo"
                        >
                          <MessageSquare size={14} />
                          <span className="hidden md:inline">Chat</span>
                        </Link>
                      )}
                      {a.modality === 'PRESENCIAL' &&
                       a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && a.status !== 'NO_SHOW' && (
                        <Link
                          to={`/doctor/appointments/${a.id}`}
                          className="inline-flex items-center gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold px-3 py-1.5 rounded-lg transition shadow-sm mr-1"
                          title="Gestionar cita presencial"
                        >
                          <MapPin size={14} />
                          <span className="hidden md:inline">Atender</span>
                        </Link>
                      )}
                      <Link
                        to={`/doctor/appointments/${a.id}`}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1.5 rounded-lg transition mr-1"
                        title="Ver detalles"
                      >
                        <Eye size={14} />
                      </Link>
                      {a.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => updateStatus(a.id, 'UPCOMING')}
                            disabled={isActing}
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2 py-1.5 rounded-lg transition disabled:opacity-50"
                            title="Confirmar cita"
                          >
                            {isActing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            <span className="hidden md:inline">Confirmar</span>
                          </button>
                          <button
                            onClick={() => updateStatus(a.id, 'CANCELLED')}
                            disabled={isActing}
                            className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-2 py-1.5 rounded-lg transition disabled:opacity-50"
                            title="Rechazar"
                          >
                            <X size={14} />
                            <span className="hidden md:inline">Rechazar</span>
                          </button>
                        </>
                      )}
                      {(a.status === 'UPCOMING' || a.status === 'ONGOING') && (
                        <button
                          onClick={() => updateStatus(a.id, 'COMPLETED')}
                          disabled={isActing}
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2 py-1.5 rounded-lg transition disabled:opacity-50"
                          title="Marcar como atendida"
                        >
                          {isActing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          <span className="hidden md:inline">Atender</span>
                        </button>
                      )}
                    </div>
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

/** Same shape as the patient version — a small segmented control. */
function ViewToggleDoctor({ value, onChange }: {
  value:    'list' | 'calendar';
  onChange: (v: 'list' | 'calendar') => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 flex-shrink-0">
      <button
        onClick={() => onChange('list')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
          value === 'list'
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
        title="Vista lista"
      >
        <List size={13} />
      </button>
      <button
        onClick={() => onChange('calendar')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
          value === 'calendar'
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
        title="Vista calendario"
      >
        <CalendarDays size={13} />
      </button>
    </div>
  );
}
