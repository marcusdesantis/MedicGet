import { Calendar, Clock, FileText, Star, ArrowRight, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard }    from '@/components/ui/StatCard';
import { PageHeader }  from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Avatar }      from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState }  from '@/components/ui/EmptyState';
import { DashboardLoading, DashboardError } from '@/components/ui/DashboardState';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { dashboardApi, type AppointmentDto, type NotificationDto } from '@/lib/api';

/**
 * Builds the avatar initials from "Dr. Carlos López" → "CL".
 * Falls back to the first two letters of the source string when there's
 * no obvious split.
 */
function initialsOf(firstName?: string, lastName?: string): string {
  const a = firstName?.[0] ?? '';
  const b = lastName?.[0]  ?? '';
  return (a + b).toUpperCase() || '👤';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export function PatientDashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0] ?? 'Paciente';
  const { state, refetch } = useApi(() => dashboardApi.patient(), []);

  if (state.status === 'loading') return <DashboardLoading />;
  if (state.status === 'error')   return <DashboardError error={state.error} onRetry={refetch} role="patient" />;

  const { stats, nextAppointment, recentAppointments, notifications } = state.data;

  // Backend may emit either `upcoming`/`completed`/... or `upcomingCount`/...
  // Read both shapes defensively so a small rename in dashboard.repository.ts
  // doesn't break the UI silently.
  const s = stats as Record<string, number | undefined>;
  const upcoming  = s.upcoming  ?? s.upcomingCount  ?? 0;
  const completed = s.completed ?? s.completedCount ?? 0;
  const totalSpent = s.totalSpent ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`¡Hola, ${firstName}! 👋`}
        subtitle="Aquí tienes un resumen de tu actividad médica"
        action={
          <Link
            to="/patient/search"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition shadow-sm"
          >
            Buscar médico <ArrowRight size={15} />
          </Link>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Próximas citas"
          value={upcoming}
          icon={Calendar}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Consultas completadas"
          value={completed}
          icon={FileText}
          iconBg="bg-violet-100 dark:bg-violet-900/30"
          iconColor="text-violet-600"
        />
        <StatCard
          label="Total invertido"
          value={`$${totalSpent.toFixed(2)}`}
          icon={Star}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-500"
        />
        <StatCard
          label="Próxima cita"
          value={nextAppointment
            ? `${formatDate(nextAppointment.date)} · ${nextAppointment.time}`
            : 'Sin programar'}
          icon={Clock}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* RECENT APPOINTMENTS */}
        <SectionCard
          className="xl:col-span-2"
          title="Citas recientes"
          action={
            <Link to="/patient/appointments" className="text-xs text-blue-600 hover:underline font-medium">
              Ver todas →
            </Link>
          }
          noPadding
        >
          {recentAppointments.length === 0 ? (
            <EmptyState
              title="Aún no tienes citas"
              description="Empieza buscando un especialista para agendar tu primera consulta."
              action={
                <Link to="/patient/search" className="text-sm text-blue-600 font-medium hover:underline">
                  Buscar médicos →
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentAppointments.slice(0, 5).map((appt: AppointmentDto) => {
                const docProfile = appt.doctor?.user?.profile;
                const docName = `Dr. ${docProfile?.firstName ?? ''} ${docProfile?.lastName ?? ''}`.trim();
                return (
                  <div key={appt.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <Avatar initials={initialsOf(docProfile?.firstName, docProfile?.lastName)} size="md" variant="blue" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{docName || 'Médico'}</p>
                      <p className="text-xs text-slate-400 truncate">{appt.doctor?.specialty ?? '—'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {formatDate(appt.date)} · {appt.time}
                      </p>
                      <div className="flex justify-end mt-1">
                        <StatusBadge status={appt.status.toLowerCase()} statusMap={appointmentStatusMap} size="sm" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* NOTIFICATIONS */}
        <SectionCard
          title="Notificaciones"
          action={
            <Link to="/patient/profile" className="text-xs text-blue-600 hover:underline font-medium">
              Ver más →
            </Link>
          }
          noPadding
        >
          {(!notifications || notifications.length === 0) ? (
            <EmptyState
              title="Todo al día"
              description="No tienes notificaciones nuevas."
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.slice(0, 5).map((n: NotificationDto) => (
                <div key={n.id} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <div className="flex items-start gap-3">
                    <Bell size={16} className={n.isRead ? 'text-slate-400 mt-0.5' : 'text-blue-600 mt-0.5'} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{n.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
