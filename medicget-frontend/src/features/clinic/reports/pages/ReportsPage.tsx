/**
 * /clinic/reports — informes operativos + financieros de la clínica.
 *
 *  - Filtro de rango (30/90 días, este año, todo).
 *  - KPIs (ingresos, citas, médicos, pacientes únicos).
 *  - Líneas de tendencia: ingresos mensuales + citas mensuales.
 *  - Top médicos + distribución semanal.
 *  - Botones de descarga CSV (citas, pagos, médicos, pacientes únicos).
 */
import { useMemo, useState } from 'react';
import {
  TrendingUp, Users, Calendar, DollarSign, UserCheck, Loader2, BarChart3, Download,
} from 'lucide-react';
import { PageHeader }     from '@/components/ui/PageHeader';
import { SectionCard }    from '@/components/ui/SectionCard';
import { StatCard }       from '@/components/ui/StatCard';
import { BarChart }       from '@/components/ui/BarChart';
import { TrendLineChart } from '@/components/ui/TrendLineChart';
import { Avatar }         from '@/components/ui/Avatar';
import { Alert }          from '@/components/ui/Alert';
import { EmptyState }     from '@/components/ui/EmptyState';
import { useApi }         from '@/hooks/useApi';
import {
  dashboardApi, appointmentsApi,
  type DoctorDto, type AppointmentDto, type PaginatedData,
} from '@/lib/api';
import { downloadCsv, dateStampedName } from '@/lib/csv';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type RangeKey = '30d' | '90d' | 'ytd' | 'all';
const RANGE_LABELS: Record<RangeKey, string> = {
  '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días',
  'ytd': 'Este año',
  'all': 'Todo el historial',
};

function rangeStart(range: RangeKey): Date | null {
  const now = new Date();
  if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (range === '90d') return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  if (range === 'ytd') return new Date(now.getFullYear(), 0, 1);
  return null;
}

function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function ReportsPage() {
  const [range, setRange] = useState<RangeKey>('90d');

  const dashQ  = useApi(() => dashboardApi.clinic(), []);
  const apptsQ = useApi<PaginatedData<AppointmentDto>>(
    () => appointmentsApi.list({ pageSize: 500 }),
    [],
  );

  const dash = useMemo(() => {
    if (dashQ.state.status !== 'ready') return null;
    const d = dashQ.state.data as unknown as Record<string, unknown>;
    return {
      stats:           (d.stats           as Record<string, number | undefined>) ?? {},
      revenueByMonth:  (d.revenueByMonth  as { label: string; amount: number }[]) ?? [],
      topDoctors:      (d.topDoctors      as { doctor: DoctorDto | null; appointmentCount: number }[]) ?? [],
      weeklyChart:     (d.weeklyChart     as { label: string; value: number }[]) ?? [],
    };
  }, [dashQ.state]);

  const appts = useMemo(() => {
    if (apptsQ.state.status !== 'ready') return null;
    const all = apptsQ.state.data.data;
    const start = rangeStart(range);
    const filtered = start ? all.filter((a) => new Date(a.date) >= start) : all;

    // Tendencia mensual (citas + ingresos) sobre el rango.
    const monthsCount = range === '30d' ? 1 : range === '90d' ? 3 : range === 'ytd' ? new Date().getMonth() + 1 : 12;
    const monthly = new Array(Math.max(monthsCount, 6)).fill(0).map((_, i) => {
      const limit = Math.max(monthsCount, 6);
      const d = new Date();
      d.setMonth(d.getMonth() - (limit - 1 - i));
      const ym = `${d.getFullYear()}-${d.getMonth()}`;
      const monthAppts = filtered.filter((a) => {
        const ad = new Date(a.date);
        return `${ad.getFullYear()}-${ad.getMonth()}` === ym;
      });
      const monthRevenue = monthAppts
        .filter((a) => a.payment?.status === 'PAID')
        .reduce((s, a) => s + (a.payment?.amount ?? 0), 0);
      return {
        label:   MONTH_LABELS[d.getMonth()] ?? '',
        count:   monthAppts.length,
        revenue: monthRevenue,
      };
    });

    // Pacientes únicos.
    const patientMap = new Map<string, { id: string; name: string; visits: number; lastDate: string }>();
    for (const a of filtered) {
      const id = a.patient?.id;
      if (!id) continue;
      const name = `${a.patient?.user?.profile?.firstName ?? ''} ${a.patient?.user?.profile?.lastName ?? ''}`.trim() || 'Paciente';
      const cur = patientMap.get(id) ?? { id, name, visits: 0, lastDate: a.date };
      cur.visits += 1;
      if (new Date(a.date) > new Date(cur.lastDate)) cur.lastDate = a.date;
      patientMap.set(id, cur);
    }

    return {
      filtered,
      monthly,
      patients: [...patientMap.values()],
    };
  }, [apptsQ.state, range]);

  const exportAppointments = () => {
    if (!appts) return;
    const rows = appts.filtered.map((a) => ({
      fecha:      new Date(a.date).toISOString().slice(0, 10),
      hora:       a.time,
      paciente:   `${a.patient?.user?.profile?.firstName ?? ''} ${a.patient?.user?.profile?.lastName ?? ''}`.trim(),
      medico:     `${a.doctor?.user?.profile?.firstName ?? ''} ${a.doctor?.user?.profile?.lastName ?? ''}`.trim(),
      especialidad: a.doctor?.specialty ?? '',
      modalidad:  a.modality,
      estado:     a.status,
      pago:       a.payment?.status ?? 'SIN_COBRO',
      monto:      a.payment?.amount ?? 0,
    }));
    downloadCsv(dateStampedName('citas-clinica'), rows);
  };

  const exportPayments = () => {
    if (!appts) return;
    const rows = appts.filtered
      .filter((a) => a.payment)
      .map((a) => ({
        fecha:        new Date(a.date).toISOString().slice(0, 10),
        paciente:     `${a.patient?.user?.profile?.firstName ?? ''} ${a.patient?.user?.profile?.lastName ?? ''}`.trim(),
        medico:       `${a.doctor?.user?.profile?.firstName ?? ''} ${a.doctor?.user?.profile?.lastName ?? ''}`.trim(),
        modalidad:    a.modality,
        estado_pago:  a.payment?.status,
        monto_bruto:  a.payment?.amount ?? 0,
        monto_medico: a.payment?.doctorAmount ?? 0,
        comision:    (a.payment?.amount ?? 0) - (a.payment?.doctorAmount ?? 0),
      }));
    downloadCsv(dateStampedName('pagos-clinica'), rows);
  };

  const exportDoctors = () => {
    if (!dash) return;
    const rows = dash.topDoctors.map((row) => {
      const profile = row.doctor?.user?.profile;
      return {
        medico:        `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim(),
        especialidad:  row.doctor?.specialty ?? '',
        citas:         row.appointmentCount,
      };
    });
    downloadCsv(dateStampedName('medicos-clinica'), rows);
  };

  const exportPatients = () => {
    if (!appts) return;
    const rows = appts.patients
      .sort((a, b) => b.visits - a.visits)
      .map((p) => ({
        paciente:       p.name,
        visitas:        p.visits,
        ultima_visita:  new Date(p.lastDate).toISOString().slice(0, 10),
      }));
    downloadCsv(dateStampedName('pacientes-clinica'), rows);
  };

  if (dashQ.state.status === 'loading' || apptsQ.state.status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }
  if (dashQ.state.status === 'error') {
    return (
      <Alert variant="error" action={
        <button onClick={dashQ.refetch} className="text-sm font-medium underline">Reintentar</button>
      }>
        {dashQ.state.error.message}
      </Alert>
    );
  }
  if (!dash || !appts) return null;

  const s = dash.stats;
  const totalRevenue      = s.totalRevenue      ?? 0;
  const pendingRevenue    = s.pendingRevenue    ?? 0;
  const totalDoctors      = s.totalDoctors      ?? 0;
  const totalPatients     = s.totalPatients     ?? 0;
  const monthAppointments = s.monthAppointments ?? 0;
  const todayAppointments = s.todayAppointments ?? 0;

  const revenueChart = dash.revenueByMonth.map((m) => ({ label: m.label, value: m.amount }));

  return (
    <div className="space-y-6">
      <PageHeader title="Informes" subtitle="Vista financiera y operativa de tu clínica" />

      {/* Toolbar: rango + descargas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setRange(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                range === k
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {RANGE_LABELS[k]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DownloadButton onClick={exportAppointments} label="Citas (CSV)" />
          <DownloadButton onClick={exportPayments}     label="Pagos (CSV)" />
          <DownloadButton onClick={exportDoctors}      label="Médicos (CSV)" />
          <DownloadButton onClick={exportPatients}     label="Pacientes (CSV)" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Ingresos totales"
          value={fmtMoney(totalRevenue)}
          icon={DollarSign}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600"
          trend={pendingRevenue > 0 ? `Pendiente: ${fmtMoney(pendingRevenue)}` : undefined}
        />
        <StatCard
          label="Citas del mes"
          value={monthAppointments}
          icon={Calendar}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600"
          trend={`Hoy: ${todayAppointments}`}
        />
        <StatCard
          label="Médicos activos"
          value={totalDoctors}
          icon={UserCheck}
          iconBg="bg-indigo-100 dark:bg-indigo-900/30"
          iconColor="text-indigo-600"
        />
        <StatCard
          label="Pacientes únicos"
          value={totalPatients}
          icon={Users}
          iconBg="bg-violet-100 dark:bg-violet-900/30"
          iconColor="text-violet-600"
        />
      </div>

      {/* Tendencias — ingresos + citas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionCard
          title="Tendencia de ingresos"
          subtitle="Mensual"
          action={
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <TrendingUp size={14} /> Total {fmtMoney(totalRevenue)}
            </div>
          }
        >
          <TrendLineChart
            data={appts.monthly.map((m) => ({ label: m.label, value: m.revenue }))}
            color="#10b981"
            formatValue={(v) => `$${v.toFixed(0)}`}
          />
        </SectionCard>

        <SectionCard title="Tendencia de citas" subtitle="Mensual">
          <TrendLineChart
            data={appts.monthly.map((m) => ({ label: m.label, value: m.count }))}
            color="#6366f1"
            formatValue={(v) => String(Math.round(v))}
          />
        </SectionCard>
      </div>

      {/* Revenue mensual desde dashboard (consolidado backend) + Top médicos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <SectionCard
          className="xl:col-span-2"
          title="Ingresos mensuales (consolidado)"
          subtitle="Datos directamente del backend"
        >
          {revenueChart.length === 0 ? (
            <EmptyState
              title="Sin datos para graficar"
              description="Los ingresos aparecerán cuando los pacientes paguen sus consultas."
              icon={BarChart3}
            />
          ) : (
            <BarChart
              data={revenueChart}
              height={180}
              activeColor="bg-indigo-600"
              inactiveColor="bg-indigo-200 dark:bg-indigo-900/50"
            />
          )}
        </SectionCard>

        <SectionCard title="Top médicos" subtitle="Por número de citas" noPadding>
          {dash.topDoctors.length === 0 ? (
            <EmptyState
              title="Sin actividad todavía"
              description="Cuando tus médicos atiendan pacientes, los más activos aparecerán aquí."
              icon={UserCheck}
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {dash.topDoctors.slice(0, 6).map((row, i) => {
                const d = row.doctor;
                if (!d) return null;
                const profile = d.user?.profile;
                const name = `Dr. ${[profile?.firstName, profile?.lastName].filter(Boolean).join(' ')}`.trim();
                return (
                  <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
                    <Avatar
                      initials={((profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '')).toUpperCase() || 'DR'}
                      size="sm"
                      variant="indigo"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{name}</p>
                      <p className="text-xs text-slate-400 truncate">{d.specialty}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {row.appointmentCount} citas
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Distribución semanal */}
      <SectionCard title="Citas esta semana" subtitle="Distribución diaria">
        {dash.weeklyChart.length === 0 ? (
          <EmptyState message="Sin datos esta semana" icon={Calendar} />
        ) : (
          <BarChart
            data={dash.weeklyChart}
            height={140}
            activeColor="bg-blue-600"
            inactiveColor="bg-blue-200 dark:bg-blue-900/40"
            showValues
          />
        )}
      </SectionCard>
    </div>
  );
}

function DownloadButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
    >
      <Download size={12} /> {label}
    </button>
  );
}
