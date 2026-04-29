import { useState }     from 'react';
import { Plus, MoreHorizontal, Phone, Mail } from 'lucide-react';
import { PageHeader }   from '@/components/ui/PageHeader';
import { SearchInput }  from '@/components/ui/SearchInput';
import { SectionCard }  from '@/components/ui/SectionCard';
import { DataTable }    from '@/components/ui/DataTable';
import { Avatar }       from '@/components/ui/Avatar';
import { StatusBadge }  from '@/components/ui/StatusBadge';
import { IconButton }   from '@/components/ui/IconButton';
import { CardContainer } from '@/components/ui/CardContainer';
import { patientStatusMap } from '@/lib/statusConfig';
import { clinicPatients, type MockPatient } from '@/lib/mockData';

type PatientRow = Record<string, unknown> & MockPatient;

const columns = [
  {
    key: 'patient', header: 'Paciente',
    render: (r: PatientRow) => (
      <div className="flex items-center gap-3">
        <Avatar initials={r.avatar} size="sm" variant="indigo" />
        <div>
          <p className="font-medium text-slate-800 dark:text-white">{r.name}</p>
          <p className="text-xs text-slate-400">{r.age} años</p>
        </div>
      </div>
    ),
  },
  {
    key: 'contact', header: 'Contacto',
    render: (r: PatientRow) => (
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><Mail size={11} /> {r.email}</p>
        <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><Phone size={11} /> {r.phone}</p>
      </div>
    ),
  },
  { key: 'doctor',    header: 'Médico asignado', render: (r: PatientRow) => <span>{r.doctor}</span> },
  { key: 'lastVisit', header: 'Última visita',   render: (r: PatientRow) => <span className="text-slate-500 dark:text-slate-500">{r.lastVisit}</span> },
  {
    key: 'status', header: 'Estado',
    render: (r: PatientRow) => <StatusBadge status={r.status} statusMap={patientStatusMap} />,
  },
  { key: 'actions', header: '', cellClass: 'w-10', render: () => <IconButton icon={MoreHorizontal} /> },
];

const SUMMARY_STATS = (data: MockPatient[]) => [
  { label: 'Total',           value: data.length,                                    color: 'text-slate-800 dark:text-white' },
  { label: 'Activos',         value: data.filter((p) => p.status === 'active').length,  color: 'text-emerald-600' },
  { label: 'Nuevos este mes', value: data.filter((p) => p.status === 'new').length,    color: 'text-blue-600'    },
];

export function ClinicPatientsPage() {
  const [search, setSearch] = useState('');

  const filtered = clinicPatients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacientes"
        subtitle="Gestiona el registro de pacientes de la clínica"
        action={
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700
                             text-white text-sm font-medium rounded-xl transition shadow-sm">
            <Plus size={15} /> Nuevo paciente
          </button>
        }
      />

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {SUMMARY_STATS(clinicPatients).map((s) => (
          <CardContainer key={s.label} className="text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </CardContainer>
        ))}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o email..." className="max-w-sm" />

      <SectionCard noPadding>
        <DataTable
          columns={columns as never}
          data={filtered as unknown as Record<string, unknown>[]}
          emptyMessage="No se encontraron pacientes"
        />
      </SectionCard>
    </div>
  );
}
