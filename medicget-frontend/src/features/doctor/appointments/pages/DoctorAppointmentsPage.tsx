import { useState }       from 'react';
import { Calendar, Clock, MoreHorizontal } from 'lucide-react';
import { PageHeader }     from '@/components/ui/PageHeader';
import { Tabs }           from '@/components/ui/Tabs';
import { SearchInput }    from '@/components/ui/SearchInput';
import { SectionCard }    from '@/components/ui/SectionCard';
import { DataTable }      from '@/components/ui/DataTable';
import { Avatar }         from '@/components/ui/Avatar';
import { StatusBadge }    from '@/components/ui/StatusBadge';
import { IconButton }     from '@/components/ui/IconButton';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { doctorAllAppointments, type MockAppointment } from '@/lib/mockData';

const TABS = ['Todas', 'Pendientes', 'Completadas', 'Canceladas'];

const TAB_STATUS_MAP: Record<string, string[] | null> = {
  'Todas':       null,
  'Pendientes':  ['pending'],
  'Completadas': ['completed'],
  'Canceladas':  ['cancelled'],
};

const columns = [
  {
    key: 'patient',
    header: 'Paciente',
    render: (row: MockAppointment) => (
      <div className="flex items-center gap-3">
        <Avatar initials={row.avatar} size="sm" variant="indigo" />
        <div>
          <p className="font-medium text-slate-800 dark:text-white">{row.patient}</p>
          <p className="text-xs text-slate-400">{row.age} años</p>
        </div>
      </div>
    ),
  },
  {
    key: 'type',
    header: 'Tipo',
    render: (row: MockAppointment) => <span>{row.type}</span>,
  },
  {
    key: 'date',
    header: 'Fecha',
    render: (row: MockAppointment) => (
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <Calendar size={13} className="text-slate-400" /> {row.date}
      </span>
    ),
  },
  {
    key: 'time',
    header: 'Hora',
    render: (row: MockAppointment) => (
      <span className="flex items-center gap-1.5">
        <Clock size={13} className="text-slate-400" /> {row.time}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Estado',
    render: (row: MockAppointment) => (
      <StatusBadge status={row.status} statusMap={appointmentStatusMap} />
    ),
  },
  {
    key: 'actions',
    header: '',
    cellClass: 'w-10',
    render: () => <IconButton icon={MoreHorizontal} />,
  },
];

export function DoctorAppointmentsPage() {
  const [tab,    setTab]    = useState('Todas');
  const [search, setSearch] = useState('');

  const visible = (doctorAllAppointments as unknown as Record<string, unknown>[]).filter((a) => {
    const appt = a as MockAppointment;
    const allowedStatuses = TAB_STATUS_MAP[tab];
    const matchTab    = !allowedStatuses || allowedStatuses.includes(appt.status);
    const matchSearch = appt.patient.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Citas" subtitle="Gestiona todas tus consultas programadas" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar paciente..." className="w-48" />
      </div>

      <SectionCard noPadding>
        <DataTable
          columns={columns as never}
          data={visible}
          emptyMessage="Sin resultados para este filtro"
        />
      </SectionCard>
    </div>
  );
}
