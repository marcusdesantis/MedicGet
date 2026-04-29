import { useState }       from 'react';
import { Calendar, Users, Star, TrendingUp, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { Link }            from 'react-router-dom';
import { StatCard }        from '@/components/ui/StatCard';
import { PageHeader }      from '@/components/ui/PageHeader';
import { SectionCard }     from '@/components/ui/SectionCard';
import { Avatar }          from '@/components/ui/Avatar';
import { ToggleSwitch }    from '@/components/ui/ToggleSwitch';
import { BarChart }        from '@/components/ui/BarChart';
import { useAuth }         from '@/context/AuthContext';
import { todaySchedule, weeklyChartData } from '@/lib/mockData';

export function DoctorDashboardPage() {
  const { user }       = useAuth();
  const [available, setAvailable] = useState(true);

  const doneTodayCount = todaySchedule.filter((a) => a.status === 'done').length;

  return (
    <div className="space-y-6">
      {/* Header + availability toggle */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <PageHeader
          title={`Buenos días, ${user?.name} 👨‍⚕️`}
          subtitle={`Tienes ${todaySchedule.length} citas programadas para hoy`}
        />
        <div className={`
          flex items-center gap-3 px-4 py-2.5 rounded-xl border transition flex-shrink-0 self-start
          ${available
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}
        `}>
          <ToggleSwitch
            checked={available}
            onChange={setAvailable}
            onLabel="Disponible"
            offLabel="No disponible"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Citas hoy"        value={todaySchedule.length} icon={Calendar}    iconBg="bg-blue-100 dark:bg-blue-900/30"    iconColor="text-blue-600"   />
        <StatCard label="Pacientes totales" value={248}                  icon={Users}       iconBg="bg-violet-100 dark:bg-violet-900/30" iconColor="text-violet-600" trend="+12 este mes" trendUp />
        <StatCard label="Valoración media"  value="4.9 ★"               icon={Star}        iconBg="bg-amber-100 dark:bg-amber-900/30"   iconColor="text-amber-500"  />
        <StatCard label="Ingresos mes"      value="€2,840"              icon={TrendingUp}  iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600" trend="+8% vs anterior" trendUp />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Today's schedule */}
        <SectionCard
          className="xl:col-span-2"
          title="Agenda de hoy"
          action={<Link to="/doctor/appointments" className="text-xs text-teal-600 hover:underline font-medium">Ver todas →</Link>}
          noPadding
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {todaySchedule.map((appt) => (
              <div
                key={appt.id}
                className={`
                  flex items-center gap-4 px-5 py-4 transition
                  ${appt.status === 'current'
                    ? 'bg-teal-50 dark:bg-teal-900/10'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                `}
              >
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 w-12 text-right flex-shrink-0">
                  {appt.time}
                </span>
                <div className={`
                  w-1 h-10 rounded-full flex-shrink-0
                  ${appt.status === 'done'    ? 'bg-emerald-400' :
                    appt.status === 'current' ? 'bg-teal-500'    : 'bg-slate-200 dark:bg-slate-700'}
                `} />
                <Avatar initials={appt.avatar} size="sm" variant="indigo" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{appt.patient}</p>
                  <p className="text-xs text-slate-400">{appt.type} · {appt.age} años</p>
                </div>
                <div className="flex-shrink-0">
                  {appt.status === 'done' && <CheckCircle size={18} className="text-emerald-500" />}
                  {appt.status === 'current' && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-teal-600 bg-teal-100 dark:bg-teal-900/30 px-2 py-1 rounded-full">
                      <Clock size={11} /> En curso
                    </span>
                  )}
                  {appt.status === 'pending' && <Clock size={18} className="text-slate-300" />}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Weekly bar chart */}
        <SectionCard title="Citas esta semana" subtitle="Total: 56 consultas">
          <BarChart
            data={weeklyChartData}
            height={128}
            activeColor="bg-teal-600"
            inactiveColor="bg-teal-200 dark:bg-teal-900/40"
            showValues
          />
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Completadas hoy</p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {doneTodayCount} / {todaySchedule.length}
              </p>
            </div>
            <Link to="/doctor/calendar" className="flex items-center gap-1.5 text-xs text-teal-600 font-medium hover:underline">
              Ver calendario <ArrowRight size={13} />
            </Link>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
