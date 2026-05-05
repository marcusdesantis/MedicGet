import { useMemo } from 'react';
import { TrendingUp, Users, Calendar, DollarSign, UserCheck, Loader2, BarChart3 } from 'lucide-react';
import { PageHeader }   from '@/components/ui/PageHeader';
import { SectionCard }  from '@/components/ui/SectionCard';
import { StatCard }     from '@/components/ui/StatCard';
import { BarChart }     from '@/components/ui/BarChart';
import { Avatar }       from '@/components/ui/Avatar';
import { Alert }        from '@/components/ui/Alert';
import { EmptyState }   from '@/components/ui/EmptyState';
import { useApi }       from '@/hooks/useApi';
import { dashboardApi, type DoctorDto } from '@/lib/api';

function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

/**
 * Clinic — operational + financial reports.
 *
 * Reuses the same `dashboardApi.clinic()` payload but presents it from a
 * "reports" angle: revenue trend, top doctors, KPI snapshots. Future work:
 * date-range filtering and CSV export — both require backend additions.
 */
export function ReportsPage() {
  const { state, refetch } = useApi(() => dashboardApi.clinic(), []);

  const data = useMemo(() => {
    if (state.status !== 'ready') return null;
    const d = state.data as Record<string, unknown>;
    return {
      stats:           (d.stats           as Record<string, number | undefined>) ?? {},
      revenueByMonth:  (d.revenueByMonth  as { label: string; amount: number }[]) ?? [],
      topDoctors:      (d.topDoctors      as { doctor: DoctorDto | null; appointmentCount: number }[]) ?? [],
      weeklyChart:     (d.weeklyChart     as { label: string; value: number }[]) ?? [],
    };
  }, [state]);

  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <Alert variant="error" action={
        <button onClick={refetch} className="text-sm font-medium underline">Reintentar</button>
      }>
        {state.error.message}
      </Alert>
    );
  }

  if (!data) return null;

  const s = data.stats;
  const totalRevenue      = s.totalRevenue      ?? 0;
  const pendingRevenue    = s.pendingRevenue    ?? 0;
  const totalDoctors      = s.totalDoctors      ?? 0;
  const totalPatients     = s.totalPatients     ?? 0;
  const monthAppointments = s.monthAppointments ?? 0;
  const todayAppointments = s.todayAppointments ?? 0;

  const revenueChart = data.revenueByMonth.map((m) => ({ label: m.label, value: m.amount }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Informes"
        subtitle="Vista financiera y operativa de tu clínica"
      />

      {/* KPIs row 1 */}
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <SectionCard
          className="xl:col-span-2"
          title="Ingresos mensuales"
          subtitle="Últimos meses"
          action={
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <TrendingUp size={14} /> Total {fmtMoney(totalRevenue)}
            </div>
          }
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

        {/* Top doctors */}
        <SectionCard
          title="Top médicos"
          subtitle="Por número de citas"
          noPadding
        >
          {data.topDoctors.length === 0 ? (
            <EmptyState
              title="Sin actividad todavía"
              description="Cuando tus médicos atiendan pacientes, los más activos aparecerán aquí."
              icon={UserCheck}
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.topDoctors.slice(0, 6).map((row, i) => {
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

      {/* Weekly distribution */}
      <SectionCard title="Citas esta semana" subtitle="Distribución diaria">
        {data.weeklyChart.length === 0 ? (
          <EmptyState message="Sin datos esta semana" icon={Calendar} />
        ) : (
          <BarChart
            data={data.weeklyChart}
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
