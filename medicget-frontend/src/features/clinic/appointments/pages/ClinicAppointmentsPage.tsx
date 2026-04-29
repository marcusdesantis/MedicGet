import { useState }     from 'react';
import { Plus, Calendar, Clock, MoreHorizontal } from 'lucide-react';
import { PageHeader }   from '@/components/ui/PageHeader';
import { SearchInput }  from '@/components/ui/SearchInput';
import { SectionCard }  from '@/components/ui/SectionCard';
import { DataTable }    from '@/components/ui/DataTable';
import { StatusBadge }  from '@/components/ui/StatusBadge';
import { IconButton }   from '@/components/ui/IconButton';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { clinicAppointments, type MockAppointment } from '@/lib/mockData';

const STATUS_FILTER_OPTIONS = ['Todos', 'Pendiente', 'Completada', 'En curso', 'Cancelada'];

type ApptRow = Record<string, unknown> & MockAppointment;

const columns = [
  { key: 'patient',   header: 'Paciente',    cellClass: 'font-medium text-slate-800 dark:text-white', render: (r: ApptRow) => <>{r.patient}</> },
  { key: 'doctor',    header: 'Médico',      render: (r: ApptRow) => <>{r.doctor}</> },
  { key: 'specialty', header: 'Especialidad',render: (r: ApptRow) => <span className="text-slate-500 dark:text-slate-500">{r.specialty}</span> },
  {
    key: 'date', header: 'Fecha',
    render: (r: ApptRow) => (
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <Calendar size={13} className="text-slate-400" /> {r.date}
      </span>
    ),
  },
  {
    key: 'time', header: 'Hora',
    render: (r: ApptRow) => (
      <span className="flex items-center gap-1.5">
        <Clock size={13} className="text-slate-400" /> {r.time}
      </span>
    ),
  },
  {
    key: 'status', header: 'Estado',
    render: (r: ApptRow) => <StatusBadge status={r.status} statusMap={appointmentStatusMap} />,
  },
  { key: 'actions', header: '', cellClass: 'w-10', render: () => <IconButton icon={MoreHorizontal} /> },
];

export function ClinicAppointmentsPage() {
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const filtered = clinicAppointments.filter((a) => {
    const label = appointmentStatusMap[a.status]?.label ?? a.status;
    const matchS = a.patient.toLowerCase().includes(search.toLowerCase()) || a.doctor.toLowerCase().includes(search.toLowerCase());
    const matchF = statusFilter === 'Todos' || label === statusFilter;
    return matchS && matchF;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Citas"
        subtitle="Todas las citas de la clínica"
        action={
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700
                             text-white text-sm font-medium rounded-xl transition shadow-sm">
            <Plus size={15} /> Nueva cita
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar paciente o médico..." className="flex-1 max-w-sm" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                     bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200
                     focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STATUS_FILTER_OPTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <SectionCard noPadding>
        <DataTable
          columns={columns as never}
          data={filtered as unknown as Record<string, unknown>[]}
          emptyMessage="Sin resultados para este filtro"
        />
      </SectionCard>
    </div>
  );
}
