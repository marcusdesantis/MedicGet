import { DollarSign, TrendingUp, CreditCard, Download, MoreHorizontal } from 'lucide-react';
import { PageHeader }   from '@/components/ui/PageHeader';
import { SectionCard }  from '@/components/ui/SectionCard';
import { StatCard }     from '@/components/ui/StatCard';
import { DataTable }    from '@/components/ui/DataTable';
import { StatusBadge }  from '@/components/ui/StatusBadge';
import { BarChart }     from '@/components/ui/BarChart';
import { IconButton }   from '@/components/ui/IconButton';
import { paymentStatusMap } from '@/lib/statusConfig';
import {
  transactions,
  monthlyChartData,
  PAYMENT_METHOD_ICONS,
  type MockTransaction,
} from '@/lib/mockData';

type TxRow = Record<string, unknown> & MockTransaction;

const columns = [
  { key: 'patient', header: 'Paciente', cellClass: 'font-medium text-slate-800 dark:text-white', render: (r: TxRow) => <>{r.patient}</> },
  { key: 'doctor',  header: 'Médico',   render: (r: TxRow) => <>{r.doctor}</> },
  { key: 'amount',  header: 'Importe',  cellClass: 'font-bold text-slate-800 dark:text-white', render: (r: TxRow) => <>€{r.amount}</> },
  {
    key: 'method', header: 'Método',
    render: (r: TxRow) => <span>{PAYMENT_METHOD_ICONS[r.method] ?? ''} {r.method}</span>,
  },
  { key: 'date',   header: 'Fecha',    render: (r: TxRow) => <span className="text-slate-500 dark:text-slate-400">{r.date}</span> },
  {
    key: 'status', header: 'Estado',
    render: (r: TxRow) => <StatusBadge status={r.status} statusMap={paymentStatusMap} />,
  },
  { key: 'actions', header: '', cellClass: 'w-10', render: () => <IconButton icon={MoreHorizontal} /> },
];

export function PaymentsPage() {
  const totalPaid    = transactions.filter((t) => t.status === 'paid').reduce((s, t) => s + t.amount, 0);
  const totalPending = transactions.filter((t) => t.status === 'pending').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagos"
        subtitle="Control de ingresos y transacciones"
        action={
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700
                             bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200
                             text-sm font-medium rounded-xl transition hover:bg-slate-50 dark:hover:bg-slate-800">
            <Download size={15} /> Exportar
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Ingresos este mes" value="€21,400" icon={TrendingUp} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600" trend="+6.2% vs anterior" trendUp />
        <StatCard label="Cobrado hoy"       value={`€${totalPaid}`}    icon={DollarSign} iconBg="bg-blue-100 dark:bg-blue-900/30"    iconColor="text-blue-600"   />
        <StatCard label="Pendiente cobro"   value={`€${totalPending}`} icon={CreditCard} iconBg="bg-amber-100 dark:bg-amber-900/30"  iconColor="text-amber-500"  />
      </div>

      <SectionCard title="Ingresos últimos 7 meses">
        <BarChart
          data={monthlyChartData}
          height={96}
          activeColor="bg-indigo-600"
          inactiveColor="bg-indigo-200 dark:bg-indigo-900/40"
        />
      </SectionCard>

      <SectionCard title="Transacciones recientes" noPadding>
        <DataTable
          columns={columns as never}
          data={transactions as unknown as Record<string, unknown>[]}
          emptyMessage="Sin transacciones"
        />
      </SectionCard>
    </div>
  );
}
