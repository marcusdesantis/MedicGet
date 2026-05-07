/**
 * /doctor/payments — pagos recibidos por el médico.
 *
 * Filtra los appointments del médico actual (la API ya scope-filtra por
 * rol) y muestra sólo los que tienen pago. Se ven los montos brutos, la
 * comisión retenida por la plataforma y el neto al médico.
 *
 * Bloqueado para planes que no incluyen PAYMENTS_DASHBOARD — se muestra
 * un upsell que lleva a /doctor/plan.
 */
import { useMemo } from 'react';
import { Loader2, DollarSign, TrendingUp, CreditCard, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader }    from '@/components/ui/PageHeader';
import { SectionCard }   from '@/components/ui/SectionCard';
import { CardContainer } from '@/components/ui/CardContainer';
import { StatusBadge }   from '@/components/ui/StatusBadge';
import { Alert }         from '@/components/ui/Alert';
import { EmptyState }    from '@/components/ui/EmptyState';
import { useApi }        from '@/hooks/useApi';
import { paymentStatusMap } from '@/lib/statusConfig';
import {
  appointmentsApi, subscriptionsApi,
  type AppointmentDto, type PaginatedData,
} from '@/lib/api';

function fmtMoney(n: number) { return `$${n.toFixed(2)}`; }
function fmtDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export function DoctorPaymentsPage() {
  const meSub = useApi(() => subscriptionsApi.me(), []);
  const appts = useApi<PaginatedData<AppointmentDto>>(
    () => appointmentsApi.list({ pageSize: 100 }),
    [],
  );

  const plan = meSub.state.status === 'ready'
    ? meSub.state.data.subscription?.plan ?? meSub.state.data.freePlan
    : null;
  const hasFeature = plan?.modules.includes('PAYMENTS_DASHBOARD') ?? false;

  const rows = useMemo(() => {
    if (appts.state.status !== 'ready') return [];
    return appts.state.data.data
      .filter((a) => a.payment)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [appts.state]);

  const stats = useMemo(() => {
    const paid = rows.filter((r) => r.payment?.status === 'PAID');
    const gross   = paid.reduce((s, r) => s + (r.payment?.amount       ?? 0), 0);
    const net     = paid.reduce((s, r) => s + (r.payment?.doctorAmount ?? 0), 0);
    const fees    = paid.reduce((s, r) => s + (r.payment?.platformFee  ?? 0), 0);
    const pending = rows.filter((r) => r.payment?.status === 'PENDING').reduce((s, r) => s + (r.payment?.amount ?? 0), 0);
    return { gross, net, fees, pending, paidCount: paid.length };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader title="Pagos recibidos" subtitle="Cobros de los pacientes y liquidación neta a tu cuenta" />

      {meSub.state.status === 'ready' && !hasFeature && (
        <SectionCard>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Lock size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-800 dark:text-white">El panel de pagos está bloqueado</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tu plan actual ({plan?.name}) no incluye el panel de pagos online.
                Subí a Pro o Premium para verlo.
              </p>
            </div>
            <Link
              to="/doctor/plan"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition flex-shrink-0"
            >
              Mejorar plan
            </Link>
          </div>
        </SectionCard>
      )}

      {hasFeature && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Stat icon={DollarSign} color="emerald" label="Ingreso neto"     value={fmtMoney(stats.net)}     sub="después de comisión" />
            <Stat icon={TrendingUp} color="blue"    label="Volumen bruto"    value={fmtMoney(stats.gross)}   sub={`${stats.paidCount} cobros`} />
            <Stat icon={CreditCard} color="purple"  label="Comisión MedicGet" value={fmtMoney(stats.fees)}    sub="retenida por la plataforma" />
            <Stat icon={CreditCard} color="amber"   label="Pendiente"         value={fmtMoney(stats.pending)} sub="esperando confirmación" />
          </div>

          <SectionCard title="Movimientos recientes" subtitle={`${rows.length} cobros`} noPadding>
            {appts.state.status === 'loading' && (
              <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 className="animate-spin" size={20} /></div>
            )}
            {appts.state.status === 'error' && (
              <div className="p-6"><Alert variant="error">{appts.state.error.message}</Alert></div>
            )}
            {appts.state.status === 'ready' && (
              rows.length === 0 ? (
                <EmptyState
                  title="Sin pagos todavía"
                  description="Cuando un paciente pague una cita aparecerá acá."
                  icon={CreditCard}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-5 py-3">Fecha</th>
                        <th className="text-left px-5 py-3">Paciente</th>
                        <th className="text-left px-5 py-3">Modalidad</th>
                        <th className="text-right px-5 py-3">Bruto</th>
                        <th className="text-right px-5 py-3">Comisión</th>
                        <th className="text-right px-5 py-3">Mi neto</th>
                        <th className="text-left px-5 py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rows.map((a) => {
                        const status = (a.payment?.status ?? 'PENDING').toLowerCase();
                        const pName  = `${a.patient?.user?.profile?.firstName ?? ''} ${a.patient?.user?.profile?.lastName ?? ''}`.trim();
                        return (
                          <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            <td className="px-5 py-3 text-slate-500">{fmtDate(a.payment?.paidAt ?? a.createdAt)}</td>
                            <td className="px-5 py-3 font-medium text-slate-800 dark:text-white">{pName || '—'}</td>
                            <td className="px-5 py-3 text-slate-500 capitalize">{a.modality.toLowerCase()}</td>
                            <td className="px-5 py-3 text-right font-bold text-slate-800 dark:text-white">{fmtMoney(a.payment?.amount ?? 0)}</td>
                            <td className="px-5 py-3 text-right text-purple-600 font-medium">{a.payment?.platformFee ? `-${fmtMoney(a.payment.platformFee)}` : '—'}</td>
                            <td className="px-5 py-3 text-right text-emerald-600 font-bold">{a.payment?.doctorAmount ? fmtMoney(a.payment.doctorAmount) : '—'}</td>
                            <td className="px-5 py-3"><StatusBadge status={status} statusMap={paymentStatusMap} size="sm" /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, color, label, value, sub }: {
  icon: typeof DollarSign;
  color: 'blue' | 'emerald' | 'purple' | 'amber';
  label: string;
  value: string;
  sub?: string;
}) {
  const c: Record<string, string> = {
    blue:    'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
    purple:  'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
    amber:   'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
  };
  return (
    <CardContainer>
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${c[color]}`}><Icon size={18} /></div>
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="text-xl font-bold text-slate-800 dark:text-white">{value}</p>
          {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
        </div>
      </div>
    </CardContainer>
  );
}
