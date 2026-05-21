/**
 * /doctor/payments — pagos recibidos por el medico.
 *
 * Filtra los appointments del medico actual (la API ya scope-filtra por
 * rol) y muestra solo los que tienen pago. Se ven los montos brutos, la
 * comision retenida por la plataforma y el neto al medico.
 *
 * Tras eliminar el sistema de planes, todos los medicos tienen acceso
 * sin restricciones (antes habia un feature gate PAYMENTS_DASHBOARD).
 */
import { useMemo } from 'react';
import { DollarSign, TrendingUp, CreditCard } from 'lucide-react';
import { PageHeader }    from '@/components/ui/PageHeader';
import { CardContainer } from '@/components/ui/CardContainer';
import { useApi }        from '@/hooks/useApi';
import { PaymentsHistoryTable } from '@/features/shared/payments/PaymentsHistoryTable';
import {
  appointmentsApi,
  type AppointmentDto, type PaginatedData,
} from '@/lib/api';

function fmtMoney(n: number) { return `$${n.toFixed(2)}`; }

export function DoctorPaymentsPage() {
  const appts = useApi<PaginatedData<AppointmentDto>>(
    () => appointmentsApi.list({ pageSize: 100 }),
    [],
  );

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
      <PageHeader title="Pagos recibidos" subtitle="Cobros de los pacientes y liquidacion neta a tu cuenta" />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Stat icon={DollarSign} color="emerald" label="Ingreso neto"     value={fmtMoney(stats.net)}     sub="despues de comision" />
        <Stat icon={TrendingUp} color="blue"    label="Volumen bruto"    value={fmtMoney(stats.gross)}   sub={`${stats.paidCount} cobros`} />
        <Stat icon={CreditCard} color="purple"  label="Comision plataforma" value={fmtMoney(stats.fees)} sub="solo informativa" />
        <Stat icon={CreditCard} color="amber"   label="Pendiente"         value={fmtMoney(stats.pending)} sub="esperando confirmacion" />
      </div>

      {/* Historial — componente reutilizable. Mismo UI que /admin/payments
          y /clinic/payments. Incluye filtro por estado + boton "Recibo". */}
      <PaymentsHistoryTable />
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
