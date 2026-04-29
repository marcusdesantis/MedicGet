import { useState }      from 'react';
import { ChevronRight, FileText, Calendar } from 'lucide-react';
import { PageHeader }   from '@/components/ui/PageHeader';
import { SearchInput }  from '@/components/ui/SearchInput';
import { SectionCard }  from '@/components/ui/SectionCard';
import { Avatar }       from '@/components/ui/Avatar';
import { StatusBadge }  from '@/components/ui/StatusBadge';
import { EmptyState }   from '@/components/ui/EmptyState';
import { patientStatusMap } from '@/lib/statusConfig';
import { doctorPatients, type MockPatient } from '@/lib/mockData';

interface RecentVisit {
  date:  string;
  notes: string;
  type:  string;
}

const RECENT_VISITS: RecentVisit[] = [
  { date: '',            notes: 'Revisión de seguimiento', type: 'Consulta'    },
  { date: '10 Mar 2026', notes: 'Análisis de sangre',      type: 'Laboratorio' },
  { date: '15 Ene 2026', notes: 'Primera valoración',      type: 'Consulta'    },
];

export function PatientHistoryPage() {
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<MockPatient | null>(null);

  const filtered = doctorPatients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const recentVisits = RECENT_VISITS.map((v, i) => ({
    ...v,
    date: i === 0 ? selected?.lastVisit ?? '' : v.date,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Historial de pacientes" subtitle="Consulta el historial de todos tus pacientes" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Patient list */}
        <SectionCard className="xl:col-span-2" noPadding title="Pacientes"
          action={
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar..." className="w-44" />
          }
        >
          {filtered.length === 0
            ? <EmptyState message="No se encontraron pacientes" />
            : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className={`
                      w-full flex items-center gap-4 px-5 py-4 text-left transition
                      ${selected?.id === p.id
                        ? 'bg-teal-50 dark:bg-teal-900/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                    `}
                  >
                    <Avatar initials={p.avatar} size="md" variant="indigo" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{p.name}</p>
                        <StatusBadge status={p.status} statusMap={patientStatusMap} size="sm" />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{p.condition} · {p.age} años</p>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{p.visits} visitas</p>
                      <p className="text-xs text-slate-400">Última: {p.lastVisit}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )
          }
        </SectionCard>

        {/* Detail panel */}
        <SectionCard noPadding>
          {selected ? (
            <>
              <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar initials={selected.avatar} size="lg" shape="rounded" variant="indigo" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{selected.name}</p>
                    <p className="text-xs text-slate-400">{selected.age} años · {selected.condition}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    { label: 'Visitas totales', value: selected.visits },
                    { label: 'Este año',        value: 4              },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
                      <p className="text-xs text-slate-400">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-5 space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Últimas consultas
                </h4>
                {recentVisits.map((v, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <FileText size={14} className="text-teal-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{v.notes}</p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar size={10} /> {v.date} · {v.type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={FileText} message="Selecciona un paciente para ver su historial" />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
