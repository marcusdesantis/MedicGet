import { Users, Calendar, DollarSign, TrendingUp, UserCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard }    from '@/components/ui/StatCard';
import { PageHeader }  from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Avatar }      from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BarChart }    from '@/components/ui/BarChart';
import { DataTable }   from '@/components/ui/DataTable';
import { EmptyState }  from '@/components/ui/EmptyState';
import { DashboardLoading, DashboardError } from '@/components/ui/DashboardState';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { dashboardApi, type AppointmentDto, type DoctorDto } from '@/lib/api';

function fullName(p?: { firstName?: string; lastName?: string }) {
  return [p?.firstName, p?.lastName].filter(Boolean).join(' ') || '—';
}

export function ClinicDashboardPage() {
  const { user } = useAuth();
  const { state, refetch } = useApi(() => dashboardApi.clinic(), []);

  if (state.status === 'loading') return <DashboardLoading />;
  if (state.status === 'error')   return <DashboardError error={state.error} onRetry={refetch} role="clinic" />;

  // Backend: { stats, recentAppointments, weeklyChart, topDoctors, revenueByMonth }
  const data = state.data as Record<string, unknown>;
  const stats              = (data.stats              as Record<string, number | undefined>) ?? {};
  const recentAppointments = (data.recentAppointments as AppointmentDto[]) ?? [];
  const revenueByMonth     = (data.revenueByMonth     as { label: string; amount: number }[]) ?? [];
  const topDoctors         = (data.topDoctors         as { doctor: DoctorDto | null; appointmentCount: number }[]) ?? [];

  const totalDoctors      = stats.totalDoctors      ?? 0;
  const todayAppointments = stats.todayAppointments ?? 0;
  const totalPatients     = stats.totalPatients     ?? 0;
  const totalRevenue      = stats.totalRevenue      ?? 0;
  const monthAppointments = stats.monthAppointments ?? 0;
  const pendingRevenue    = stats.pendingRevenue    ?? 0;

  // Adapt revenueByMonth (amount) to BarChart expected shape (value).
  const revenueChart = revenueByMonth.map((m) => ({ label: m.label, value: m.amount }));

  type Row = Record<string, unknown> & {
    id: string; time: string; patient: string; doctor: string; specialty: string; status: string;
  };
  const apptRows: Row[] = recentAppointments.slice(0, 8).map((a) => ({
    id:        a.id,
    time:      a.time,
    patient:   fullName(a.patient?.user?.profile),
    doctor:    `Dr. ${fullName(a.doctor?.user?.profile)}`,
    specialty: a.doctor?.specialty ?? '—',
    status:    a.status.toLowerCase(),
  }));

  const apptColumns = [
    { key: 'time',      header: 'Hora',         render: (r: Row) => <span className="font-medium text-slate-700 dark:text-slate-300">{r.time}</span> },
    { key: 'patient',   header: 'Paciente',     render: (r: Row) => <span className="text-slate-800 dark:text-white">{r.patient}</span> },
    { key: 'doctor',    header: 'Médico',       render: (r: Row) => <span>{r.doctor}</span> },
    { key: 'specialty', header: 'Especialidad', render: (r: Row) => <span>{r.specialty}</span> },
    { key: 'status',    header: 'Estado',       render: (r: Row) => <StatusBadge status={r.status} statusMap={appointmentStatusMap} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Panel de control — ${user?.name ?? 'Clínica'}`}
        subtitle="Resumen de actividad de la clínica"
        action={
          <Link
            to="/clinic/reports"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition shadow-sm"
          >
            Ver informes <ArrowRight size={15} />
          </Link>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Médicos activos"   value={totalDoctors}      icon={UserCheck}  iconBg="bg-indigo-100 dark:bg-indigo-900/30"   iconColor="text-indigo-600"  />
        <StatCard label="Citas hoy"         value={todayAppointments} icon={Calendar}   iconBg="bg-blue-100 dark:bg-blue-900/30"       iconColor="text-blue-600"    />
        <StatCard label="Pacientes totales" value={totalPatients}     icon={Users}      iconBg="bg-violet-100 dark:bg-violet-900/30"   iconColor="text-violet-600"  />
        <StatCard
          label="Ingresos del mes"
          value={`$${totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600"
          trend={pendingRevenue > 0 ? `Pendiente: $${pendingRevenue.toFixed(2)}` : undefined}
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
              <TrendingUp size={14} /> Total ${totalRevenue.toFixed(0)}
            </div>
          }
        >
          {revenueChart.length === 0 ? (
            <EmptyState
              title="Sin ingresos registrados"
              description="Los ingresos aparecerán aquí cuando se procesen los primeros pagos."
            />
          ) : (
            <BarChart
              data={revenueChart}
              height={160}
              activeColor="bg-indigo-600"
              inactiveColor="bg-indigo-200 dark:bg-indigo-900/50"
            />
          )}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
            <div>
              <p className="text-xs text-slate-400">Citas este mes</p>
              <p className="font-bold text-slate-800 dark:text-white">{monthAppointments}</p>
            </div>
            <Link to="/clinic/appointments" className="text-xs text-indigo-600 hover:underline font-medium">
              Ver agenda →
            </Link>
          </div>
        </SectionCard>

        {/* Top doctors */}
        <SectionCard
          title="Top médicos"
          action={<Link to="/clinic/doctors" className="text-xs text-indigo-600 hover:underline font-medium">Ver todos →</Link>}
          noPadding
        >
          {topDoctors.length === 0 ? (
            <EmptyState
              title="Sin actividad todavía"
              description="Cuando tus médicos atiendan pacientes, los más activos aparecerán aquí."
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {topDoctors.slice(0, 5).map((entry, i) => {
                const d = entry.doctor;
                if (!d) return null;
                const profile = d.user?.profile;
                const name = `Dr. ${fullName(profile)}`;
                return (
                  <div key={d.id} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
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
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{entry.appointmentCount} citas</p>
                      {d.rating > 0 && <p className="text-xs text-amber-500">★ {d.rating.toFixed(1)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Recent appointments table */}
      <SectionCard
        title="Citas recientes"
        action={<Link to="/clinic/appointments" className="text-xs text-indigo-600 hover:underline font-medium">Ver todas →</Link>}
        noPadding
      >
        {apptRows.length === 0 ? (
          <EmptyState
            title="No hay citas"
            description="Las citas registradas en tu clínica aparecerán acá."
          />
        ) : (
          <DataTable
            columns={apptColumns as never}
            data={apptRows as unknown as Record<string, unknown>[]}
            emptyMessage="No hay citas para mostrar"
          />
        )}
      </SectionCard>
    </div>
  );
}
