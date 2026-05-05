import { useMemo } from 'react';
import { DollarSign, TrendingUp, CreditCard, Loader2 } from 'lucide-react';
import { PageHeader }    from '@/components/ui/PageHeader';
import { SectionCard }   from '@/components/ui/SectionCard';
import { CardContainer } from '@/components/ui/CardContainer';
import { StatusBadge }   from '@/components/ui/StatusBadge';
import { Alert }         from '@/components/ui/Alert';
import { EmptyState }    from '@/components/ui/EmptyState';
import { useApi }        from '@/hooks/useApi';
import { paymentStatusMap } from '@/lib/statusConfig';
import { dashboardApi, appointmentsApi, type AppointmentDto, type PaginatedData } from '@/lib/api';

function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

function fullName(p?: { firstName?: string; lastName?: string }) {
  return [p?.firstName, p?.lastName].filter(Boolean).join(' ') || '—';
}

/**
 * Clinic — payments overview.
 *
 * Combines:
 *   • dashboard data (totalRevenue, pendingRevenue, monthlyChart) for KPIs
 *   • appointments list with embedded payment info for the per-row table
 *
 * The backend already returns `payment` nested in each AppointmentDto, so
 * we don't need a separate "list payments" endpoint.
 */
export function PaymentsPage() {
  const dash  = useApi(() => dashboardApi.clinic(), []);
  const appts = useApi<PaginatedData<AppointmentDto>>(() => appointmentsApi.list({ pageSize: 100 }), []);

  const stats = useMemo(() => {
    if (dash.state.status !== 'ready') return null;
    const s = (dash.state.data as Record<string, unknown>).stats as Record<string, number | undefined>;
    return {
      totalRevenue:    s?.totalRevenue   ?? 0,
      pendingRevenue:  s?.pendingRevenue ?? 0,
      monthAppts:      s?.monthAppointments ?? 0,
    };
  }, [dash.state]);

  const rows = useMemo(() => {
    if (appts.state.status !== 'ready') return [];
    return appts.state.data.data
      .filter((a) => a.payment)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [appts.state]);

  return (
    <div className="space-y-6">
      <PageHeader title="Pagos" subtitle="Resumen financiero de tu clínica" />

      {/* KPIs */}
      {dash.state.status === 'loading' && (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 className="animate-spin" size={18} />
        </div>
      )}

      {dash.state.status === 'error' && (
        <Alert variant="error">{dash.state.error.message}</Alert>
      )}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CardContainer>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <DollarSign size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Ingresos totales</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{fmtMoney(stats.totalRevenue)}</p>
              </div>
            </div>
          </CardContainer>
          <CardContainer>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <CreditCard size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Pendiente de cobro</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{fmtMoney(stats.pendingRevenue)}</p>
              </div>
            </div>
          </CardContainer>
          <CardContainer>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <TrendingUp size={18} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Citas este mes</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{stats.monthAppts}</p>
              </div>
            </div>
          </CardContainer>
        </div>
      )}

      {/* Table */}
      <SectionCard
        title="Movimientos recientes"
        subtitle={appts.state.status === 'ready' ? `${rows.length} pagos registrados` : ''}
        noPadding
      >
        {appts.state.status === 'loading' && (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="animate-spin" size={20} />
          </div>
        )}

        {appts.state.status === 'error' && (
          <div className="p-6">
            <Alert variant="error">{appts.state.error.message}</Alert>
          </div>
        )}

        {appts.state.status === 'ready' && (
          rows.length === 0 ? (
            <EmptyState
              title="Sin pagos registrados"
              description="Cuando los pacientes completen un pago aparecerá acá."
              icon={CreditCard}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-5 py-3">Fecha</th>
                    <th className="text-left px-5 py-3">Paciente</th>
                    <th className="text-left px-5 py-3">Médico</th>
                    <th className="text-left px-5 py-3">Método</th>
                    <th className="text-right px-5 py-3">Monto</th>
                    <th className="text-left px-5 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((a) => {
                    const status = (a.payment?.status ?? 'PENDING').toLowerCase();
                    return (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-5 py-3 text-slate-500">{fmtDate(a.payment?.paidAt ?? a.createdAt)}</td>
                        <td className="px-5 py-3 text-slate-800 dark:text-white font-medium">
                          {fullName(a.patient?.user?.profile)}
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                          Dr. {fullName(a.doctor?.user?.profile)}
                          <p className="text-xs text-slate-400">{a.doctor?.specialty}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-500 capitalize">
                          {(a.payment?.method ?? 'PENDING').toLowerCase()}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-slate-800 dark:text-white">
                          {fmtMoney(a.payment?.amount ?? a.price)}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={status} statusMap={paymentStatusMap} size="sm" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </SectionCard>
    </div>
  );
}
