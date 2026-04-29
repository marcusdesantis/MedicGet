import { Calendar, Clock, FileText, Star, ArrowRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard }      from '@/components/ui/StatCard';
import { PageHeader }    from '@/components/ui/PageHeader';
import { SectionCard }   from '@/components/ui/SectionCard';
import { Avatar }        from '@/components/ui/Avatar';
import { StatusBadge }   from '@/components/ui/StatusBadge';
import { useAuth }       from '@/context/AuthContext';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { patientUpcomingAppointments, nearbyDoctors } from '@/lib/mockData';

export function PatientDashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0] ?? 'Paciente';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`¡Hola, ${firstName}! 👋`}
        subtitle="Aquí tienes un resumen de tu actividad médica"
        action={
          <Link
            to="/patient/search"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
                       text-white text-sm font-medium rounded-xl transition shadow-sm"
          >
            Buscar médico <ArrowRight size={15} />
          </Link>
        }
      />

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Próximas citas"  value={3}          icon={Calendar} iconBg="bg-blue-100 dark:bg-blue-900/30"    iconColor="text-blue-600"   trend="2 esta semana" trendUp />
        <StatCard label="Historial"       value={12}         icon={FileText} iconBg="bg-violet-100 dark:bg-violet-900/30" iconColor="text-violet-600" />
        <StatCard label="Médicos visitas" value={7}          icon={Star}     iconBg="bg-amber-100 dark:bg-amber-900/30"   iconColor="text-amber-500"  />
        <StatCard label="Próxima cita"    value="Hoy 15:30"  icon={Clock}    iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Upcoming appointments */}
        <SectionCard
          className="xl:col-span-2"
          title="Próximas citas"
          action={<Link to="/patient/appointments" className="text-xs text-blue-600 hover:underline font-medium">Ver todas →</Link>}
          noPadding
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {patientUpcomingAppointments.map((appt) => (
              <div key={appt.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <Avatar initials={appt.avatar} size="md" variant="blue" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{appt.doctor}</p>
                  <p className="text-xs text-slate-400 truncate">{appt.specialty}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{appt.date} · {appt.time}</p>
                  <div className="flex justify-end mt-1">
                    <StatusBadge status={appt.status} statusMap={appointmentStatusMap} size="sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Nearby doctors */}
        <SectionCard
          title="Médicos cercanos"
          action={<Link to="/patient/search" className="text-xs text-blue-600 hover:underline font-medium">Ver más →</Link>}
          noPadding
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {nearbyDoctors.map((doc) => (
              <div key={doc.id} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{doc.name}</p>
                    <p className="text-xs text-slate-400">{doc.specialty}</p>
                  </div>
                  <span className="text-sm font-bold text-blue-600 flex-shrink-0">€{doc.price}</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                    ★ {doc.rating}
                    <span className="text-slate-400 font-normal">({doc.reviews})</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin size={11} /> {doc.distance} km
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
