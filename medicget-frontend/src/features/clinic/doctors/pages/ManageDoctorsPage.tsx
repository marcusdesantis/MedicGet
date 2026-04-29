import { useState }       from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';
import { PageHeader }     from '@/components/ui/PageHeader';
import { SearchInput }    from '@/components/ui/SearchInput';
import { Avatar }         from '@/components/ui/Avatar';
import { StatusBadge }    from '@/components/ui/StatusBadge';
import { CardContainer }  from '@/components/ui/CardContainer';
import { IconButton }     from '@/components/ui/IconButton';
import { ToggleSwitch }   from '@/components/ui/ToggleSwitch';
import { availabilityStatusMap } from '@/lib/statusConfig';
import { clinicDoctors, type MockDoctor } from '@/lib/mockData';

export function ManageDoctorsPage() {
  const [search,  setSearch]  = useState('');
  const [doctors, setDoctors] = useState(clinicDoctors);

  const toggleAvailable = (id: number) =>
    setDoctors((prev) => prev.map((d) => d.id === id ? { ...d, available: !d.available } : d));

  const filtered = doctors.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.specialty.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de médicos"
        subtitle="Administra los especialistas de tu clínica"
        action={
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700
                             text-white text-sm font-medium rounded-xl transition shadow-sm">
            <Plus size={15} /> Añadir médico
          </button>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar médico o especialidad..." className="max-w-sm" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((doc) => (
          <DoctorCard key={doc.id} doctor={doc} onToggle={toggleAvailable} />
        ))}
      </div>
    </div>
  );
}

// ─── Doctor card sub-component ──────────────────────────────────────────────

interface DoctorCardProps {
  doctor:   MockDoctor;
  onToggle: (id: number) => void;
}

function DoctorCard({ doctor, onToggle }: DoctorCardProps) {
  const stats = [
    { label: 'Pacientes', value: String(doctor.patients ?? 0) },
    { label: 'Valoración', value: `★ ${doctor.rating}`, cls: 'text-amber-500' },
    { label: 'Precio',    value: `€${doctor.price}` },
  ];

  return (
    <CardContainer className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar initials={doctor.avatar} size="lg" shape="rounded" variant="indigo" />
          <div>
            <p className="font-semibold text-slate-800 dark:text-white text-sm leading-snug">{doctor.name}</p>
            <p className="text-xs text-indigo-600 font-medium">{doctor.specialty}</p>
          </div>
        </div>
        <IconButton icon={MoreHorizontal} />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        {stats.map((s) => (
          <div key={s.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl py-2">
            <p className={`text-sm font-bold ${s.cls ?? 'text-slate-800 dark:text-white'}`}>{s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <span className="text-xs text-slate-400">{doctor.experience} años de exp.</span>
        <ToggleSwitch
          checked={doctor.available}
          onChange={() => onToggle(doctor.id)}
          onLabel="Disponible"
          offLabel="No disponible"
        />
      </div>
    </CardContainer>
  );
}
