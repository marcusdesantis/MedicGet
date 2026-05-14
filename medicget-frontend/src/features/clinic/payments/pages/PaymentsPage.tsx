import { useMemo } from 'react';
import { DollarSign, CreditCard, Loader2, Percent } from 'lucide-react';
import { PageHeader }    from '@/components/ui/PageHeader';
import { CardContainer } from '@/components/ui/CardContainer';
import { Alert }         from '@/components/ui/Alert';
import { useApi }        from '@/hooks/useApi';
import { PaymentsHistoryTable } from '@/features/shared/payments/PaymentsHistoryTable';
import { dashboardApi, appointmentsApi, type AppointmentDto, type PaginatedData } from '@/lib/api';

function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`;
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

  /** Aggregate platform-fee KPI from paid rows (los necesitamos para los KPIs). */
  const platformAgg = useMemo(() => {
    if (appts.state.status !== 'ready') return { fees: 0, docs: 0 };
    const paidRows = appts.state.data.data.filter((a) => a.payment?.status === 'PAID');
    const fees = paidRows.reduce((sum, r) => sum + (r.payment?.platformFee  ?? 0), 0);
    const docs = paidRows.reduce((sum, r) => sum + (r.payment?.doctorAmount ?? 0), 0);
    return { fees, docs };
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <DollarSign size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Neto al médico</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{fmtMoney(platformAgg.docs)}</p>
                <p className="text-[11px] text-slate-400">después de comisión</p>
              </div>
            </div>
          </CardContainer>
          <CardContainer>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Percent size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Comisión MedicGet</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{fmtMoney(platformAgg.fees)}</p>
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
        </div>
      )}

      {/* Historial — componente reutilizable. Mismo UI que en admin/doctor. */}
      <PaymentsHistoryTable />
    </div>
  );
}
