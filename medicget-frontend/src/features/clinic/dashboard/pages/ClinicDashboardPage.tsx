import { Users, Calendar, DollarSign, TrendingUp, UserCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { Link }           from 'react-router-dom';
import { StatCard }       from '@/components/ui/StatCard';
import { PageHeader }     from '@/components/ui/PageHeader';
import { SectionCard }    from '@/components/ui/SectionCard';
import { Avatar }         from '@/components/ui/Avatar';
import { StatusBadge }    from '@/components/ui/StatusBadge';
import { BarChart }       from '@/components/ui/BarChart';
import { DataTable }      from '@/components/ui/DataTable';
import { useAuth }        from '@/context/AuthContext';
import { appointmentStatusMap } from '@/lib/statusConfig';
import {
  clinicAppointments,
  monthlyChartData,
  type MockAppointment,
} from '@/lib/mockData';

const TOP_DOCTORS = [
  { name: 'Dr. Torres', specialty: 'Cardiología', appointments: 48, rating: 4.9, avatar: 'DT' },
  { name: 'Dra. Vega',  specialty: 'Pediatría',   appointments: 41, rating: 4.8, avatar: 'DV' },
  { name: 'Dr. Ruiz',   specialty: 'Dermatología', appointments: 36, rating: 4.7, avatar: 'DR' },
];

const todayAppointments = clinicAppointments.filter((a) =>
  a.date === '28 Abr'
);

type ApptRow = Record<string, unknown> & MockAppointment;

const appointmentColumns = [
  { key: 'time',      header: 'Hora',       render: (r: ApptRow) => <span className="font-medium text-slate-700 dark:text-slate-300">{r.time}</span> },
  { key: 'patient',   header: 'Paciente',   render: (r: ApptRow) => <span className="text-slate-800 dark:text-white">{r.patient}</span> },
  { key: 'doctor',    header: 'Médico',     render: (r: ApptRow) => <span>{r.doctor}</span> },
  { key: 'specialty', header: 'Especialidad', render: (r: ApptRow) => <span>{r.specialty}</span> },
  { key: 'status',    header: 'Estado',     render: (r: ApptRow) => <StatusBadge status={r.status} statusMap={appointmentStatusMap} /> },
];

export function ClinicDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Panel de control — ${user?.name}`}
        subtitle="Resumen de actividad de la clínica"
        action={
          <Link to="/clinic/reports" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700
                                                text-white text-sm font-medium rounded-xl transition shadow-sm">
            Ver informes <ArrowRight size={15} />
          </Link>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Médicos activos"    value={12}       icon={UserCheck}   iconBg="bg-indigo-100 dark:bg-indigo-900/30"  iconColor="text-indigo-600"  trend="+2 este mes" trendUp />
        <StatCard label="Citas hoy"          value={38}       icon={Calendar}    iconBg="bg-blue-100 dark:bg-blue-900/30"      iconColor="text-blue-600"    />
        <StatCard label="Pacientes totales"  value="1,284"    icon={Users}       iconBg="bg-violet-100 dark:bg-violet-900/30"  iconColor="text-violet-600"  trend="+64 este mes" trendUp />
        <StatCard label="Ingresos mes"       value="€21,400"  icon={DollarSign}  iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600" trend="+6.2% vs anterior" trendUp />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <SectionCard
          className="xl:col-span-2"
          title="Ingresos mensuales"
          subtitle="Últimos 7 meses"
          action={
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <TrendingUp size={14} /> +18.4% este año
            </div>
          }
        >
          <BarChart
            data={monthlyChartData}
            height={160}
            activeColor="bg-indigo-600"
            inactiveColor="bg-indigo-200 dark:bg-indigo-900/50"
          />
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
            <div>
              <p className="text-xs text-slate-400">Total Q2 2026</p>
              <p className="font-bold text-slate-800 dark:text-white">€64,200</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Citas este mes</p>
              <p className="font-bold text-slate-800 dark:text-white">148</p>
            </div>
          </div>
        </SectionCard>

        {/* Top doctors */}
        <SectionCard
          title="Top médicos"
          action={<Link to="/clinic/doctors" className="text-xs text-indigo-600 hover:underline font-medium">Ver todos →</Link>}
          noPadding
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {TOP_DOCTORS.map((doc, i) => (
              <div key={doc.name} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
                <Avatar initials={doc.avatar} size="sm" variant="indigo" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{doc.name}</p>
                  <p className="text-xs text-slate-400 truncate">{doc.specialty}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{doc.appointments} citas</p>
                  <p className="text-xs text-amber-500">★ {doc.rating}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Today's appointments table */}
      <SectionCard
        title="Citas de hoy"
        action={<Link to="/clinic/appointments" className="text-xs text-indigo-600 hover:underline font-medium">Ver todas →</Link>}
        noPadding
      >
        <DataTable
          columns={appointmentColumns as never}
          data={todayAppointments as unknown as Record<string, unknown>[]}
          emptyMessage="No hay citas para hoy"
        />
      </SectionCard>

      {/* Alert */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
        <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Recordatorio</p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
            3 médicos tienen su licencia próxima a vencer en los próximos 30 días.
            <Link to="/clinic/doctors" className="underline ml-1 font-medium">Ver detalle →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
