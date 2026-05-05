import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, Clock, Loader2, X } from 'lucide-react';
import { PageHeader }    from '@/components/ui/PageHeader';
import { Tabs }          from '@/components/ui/Tabs';
import { Avatar }        from '@/components/ui/Avatar';
import { StatusBadge }   from '@/components/ui/StatusBadge';
import { SectionCard }   from '@/components/ui/SectionCard';
import { EmptyState }    from '@/components/ui/EmptyState';
import { Alert }         from '@/components/ui/Alert';
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

      <Tabs tabs={[...TABS]} active={activeTab} onChange={(v) => setActiveTab(v as typeof TABS[number])} />

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

      {state.status === 'ready' && (
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
