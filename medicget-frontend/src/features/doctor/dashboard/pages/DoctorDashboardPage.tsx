import { Calendar, Users, Star, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard }    from '@/components/ui/StatCard';
import { PageHeader }  from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Avatar }      from '@/components/ui/Avatar';
import { BarChart }    from '@/components/ui/BarChart';
import { EmptyState }  from '@/components/ui/EmptyState';
import { DashboardLoading, DashboardError } from '@/components/ui/DashboardState';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { dashboardApi, type AppointmentDto, type ReviewDto } from '@/lib/api';

function initials(firstName?: string, lastName?: string): string {
  return ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase() || '👤';
}

export function DoctorDashboardPage() {
  const { user } = useAuth();
  const { state, refetch } = useApi(() => dashboardApi.doctor(), []);

  if (state.status === 'loading') return <DashboardLoading />;
  if (state.status === 'error')   return <DashboardError error={state.error} onRetry={refetch} role="doctor" />;

  // svc-dashboard returns the payload from getDoctorDashboard():
  //   { stats, todaySchedule, weeklyChart, recentReviews }
  // …but `doctor` itself isn't always part of the shape (depends on which
  // endpoint version is deployed), so we treat it as optional.
  const data = state.data as Record<string, unknown>;
  const stats        = (data.stats        as Record<string, number | undefined>) ?? {};
  const todaySchedule = (data.todaySchedule as AppointmentDto[]) ?? [];
  const weeklyChart  = (data.weeklyChart  as { label: string; value: number }[]) ?? [];
  const recentReviews = (data.recentReviews as ReviewDto[]) ?? [];

  const todayCount     = stats.todayCount    ?? todaySchedule.length;
  const weekCount      = stats.weekCount     ?? 0;
  const completedCount = stats.completedCount ?? 0;
  const avgRating      = stats.avgRating     ?? 0;
  const totalRevenue   = stats.totalRevenue  ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Buenos días, ${user?.name ?? 'Doctor'} 👨‍⚕️`}
        subtitle={
          todayCount > 0
            ? `Tienes ${todayCount} ${todayCount === 1 ? 'cita' : 'citas'} programada${todayCount === 1 ? '' : 's'} para hoy`
            : 'No tienes citas para hoy'
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Citas hoy"          value={todayCount}                         icon={Calendar}    iconBg="bg-blue-100 dark:bg-blue-900/30"      iconColor="text-blue-600"   />
        <StatCard label="Citas esta semana"  value={weekCount}                          icon={Users}       iconBg="bg-violet-100 dark:bg-violet-900/30"  iconColor="text-violet-600" />
        <StatCard label="Valoración media"   value={avgRating ? `${avgRating.toFixed(1)} ★` : '—'} icon={Star} iconBg="bg-amber-100 dark:bg-amber-900/30"    iconColor="text-amber-500"  />
        <StatCard label="Ingresos del mes"   value={`$${totalRevenue.toFixed(2)}`}      icon={TrendingUp}  iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Today's schedule */}
        <SectionCard
          className="xl:col-span-2"
          title="Agenda de hoy"
          action={
            <Link to="/doctor/appointments" className="text-xs text-teal-600 hover:underline font-medium">
              Ver todas →
            </Link>
          }
          noPadding
        >
          {todaySchedule.length === 0 ? (
            <EmptyState
              title="Sin citas para hoy"
              description="Cuando un paciente reserve, sus citas aparecerán aquí."
              action={
                <Link to="/doctor/calendar" className="text-sm text-teal-600 font-medium hover:underline">
                  Ver mi calendario →
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {todaySchedule.map((appt) => {
                const profile = appt.patient?.user?.profile;
                const name = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
                return (
                  <div
                    key={appt.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 w-12 text-right flex-shrink-0">
                      {appt.time}
                    </span>
                    <Avatar initials={initials(profile?.firstName, profile?.lastName)} size="sm" variant="indigo" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{name || 'Paciente'}</p>
                      <p className="text-xs text-slate-400">{appt.status.toLowerCase()}</p>
                    </div>
                    <Clock size={16} className="text-slate-300 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Weekly chart + reviews */}
        <SectionCard title="Citas esta semana" subtitle={`Total: ${weekCount} consultas`}>
          {weeklyChart.length === 0 ? (
            <EmptyState
              message="Sin datos suficientes"
              icon={Calendar}
            />
          ) : (
            <BarChart
              data={weeklyChart}
              height={128}
              activeColor="bg-teal-600"
              inactiveColor="bg-teal-200 dark:bg-teal-900/40"
              showValues
            />
          )}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Completadas</p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">{completedCount}</p>
            </div>
            <Link to="/doctor/calendar" className="flex items-center gap-1.5 text-xs text-teal-600 font-medium hover:underline">
              Ver calendario <ArrowRight size={13} />
            </Link>
          </div>
        </SectionCard>
      </div>

      {/* Recent reviews */}
      {recentReviews.length > 0 && (
        <SectionCard title="Valoraciones recientes" noPadding>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentReviews.slice(0, 5).map((r) => (
              <div key={r.id} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <div className="flex items-center gap-1 text-amber-500 text-sm">
                  {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                </div>
                {r.comment && (
                  <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{r.comment}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString('es-ES')}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
