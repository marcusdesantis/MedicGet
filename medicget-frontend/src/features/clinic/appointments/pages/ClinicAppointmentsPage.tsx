import { useMemo, useState } from 'react';
import { Calendar, Clock, Loader2, X } from 'lucide-react';
import { PageHeader }    from '@/components/ui/PageHeader';
import { Tabs }          from '@/components/ui/Tabs';
import { SearchInput }   from '@/components/ui/SearchInput';
import { SectionCard }   from '@/components/ui/SectionCard';
import { Avatar }        from '@/components/ui/Avatar';
import { StatusBadge }   from '@/components/ui/StatusBadge';
import { EmptyState }    from '@/components/ui/EmptyState';
import { Alert }         from '@/components/ui/Alert';
import { useApi }        from '@/hooks/useApi';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { appointmentsApi, type AppointmentDto, type PaginatedData } from '@/lib/api';
import { matchesSearch } from '@/lib/search';

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

function fullName(p?: { firstName?: string; lastName?: string }) {
  return [p?.firstName, p?.lastName].filter(Boolean).join(' ') || '—';
}

export function ClinicAppointmentsPage() {
  const [tab,    setTab]    = useState<typeof TABS[number]>('Todas');
  const [search, setSearch] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { state, refetch } = useApi<PaginatedData<AppointmentDto>>(
    () => appointmentsApi.list({ pageSize: 100 }),
    [],
  );

  const visible = useMemo(() => {
    if (state.status !== 'ready') return [];
    const statusFilter = TAB_STATUSES[tab];
    return state.data.data.filter((a) => {
      const matchStatus = !statusFilter || statusFilter.includes(a.status);
      if (!matchStatus) return false;
      // Búsqueda case + diacritic-insensitive sobre paciente/médico.
      return matchesSearch(
        search,
        fullName(a.patient?.user?.profile),
        fullName(a.doctor?.user?.profile),
      );
    });
  }, [state, tab, search]);

  const handleCancel = async (id: string) => {
    if (!confirm('¿Cancelar esta cita?')) return;
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
      <PageHeader title="Citas de la clínica" subtitle="Todas las citas de tus médicos asociados" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Tabs tabs={[...TABS]} active={tab} onChange={(v) => setTab(v as typeof TABS[number])} />
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar paciente o médico..." className="w-56" />
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

      {state.status === 'ready' && (
        <SectionCard noPadding>
          {visible.length === 0 ? (
            <EmptyState
              title="Sin citas"
              description="Cuando se reserven citas con los médicos de tu clínica, aparecerán aquí."
              icon={Calendar}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-5 py-3">Paciente</th>
                    <th className="text-left px-5 py-3">Médico</th>
                    <th className="text-left px-5 py-3">Fecha</th>
                    <th className="text-left px-5 py-3">Hora</th>
                    <th className="text-right px-5 py-3">Precio</th>
                    <th className="text-left px-5 py-3">Estado</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visible.map((a) => {
                    const cancellable = a.status === 'PENDING' || a.status === 'UPCOMING';
                    return (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar
                              initials={((a.patient?.user?.profile?.firstName?.[0] ?? '') + (a.patient?.user?.profile?.lastName?.[0] ?? '')).toUpperCase() || 'PT'}
                              size="sm"
                              variant="blue"
                            />
                            <span className="font-medium text-slate-800 dark:text-white">{fullName(a.patient?.user?.profile)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                          Dr. {fullName(a.doctor?.user?.profile)}
                          <p className="text-xs text-slate-400">{a.doctor?.specialty}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          <span className="flex items-center gap-1"><Calendar size={13} /> {fmtDate(a.date)}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          <span className="flex items-center gap-1"><Clock size={13} /> {a.time}</span>
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-slate-700 dark:text-slate-200">
                          ${a.price.toFixed(2)}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={a.status.toLowerCase()} statusMap={appointmentStatusMap} size="sm" />
                        </td>
                        <td className="px-5 py-3 text-right">
                          {cancellable && (
                            <button
                              onClick={() => handleCancel(a.id)}
                              disabled={cancellingId === a.id}
                              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-2 py-1 rounded-lg transition disabled:opacity-50"
                              title="Cancelar"
                            >
                              {cancellingId === a.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
