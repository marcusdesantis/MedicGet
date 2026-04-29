import { useState } from 'react';
import { Clock, Star, MapPin, Filter } from 'lucide-react';
import { PageHeader }   from '@/components/ui/PageHeader';
import { SearchInput }  from '@/components/ui/SearchInput';
import { Avatar }       from '@/components/ui/Avatar';
import { StatusBadge }  from '@/components/ui/StatusBadge';
import { CardContainer } from '@/components/ui/CardContainer';
import { availabilityStatusMap } from '@/lib/statusConfig';
import { searchDoctors, MEDICAL_SPECIALTIES } from '@/lib/mockData';

const ALL_SPECIALTIES = ['Todas', ...MEDICAL_SPECIALTIES];

export function SearchDoctorsPage() {
  const [query,         setQuery]         = useState('');
  const [specialty,     setSpecialty]     = useState('Todas');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const filtered = searchDoctors.filter((d) => {
    const matchQuery = d.name.toLowerCase().includes(query.toLowerCase()) || d.specialty.toLowerCase().includes(query.toLowerCase());
    const matchSpec  = specialty === 'Todas' || d.specialty === specialty;
    const matchAvail = !onlyAvailable || d.available;
    return matchQuery && matchSpec && matchAvail;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Buscar médicos" subtitle="Encuentra al especialista que necesitas cerca de ti" />

      {/* Filters */}
      <CardContainer>
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Nombre o especialidad..."
            className="flex-1"
          />
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                       bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ALL_SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button
            onClick={() => setOnlyAvailable(!onlyAvailable)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition border
              ${onlyAvailable
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }
            `}
          >
            <Filter size={15} /> Solo disponibles
          </button>
        </div>
      </CardContainer>

      <p className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} médicos encontrados</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((doc) => (
          <CardContainer key={doc.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <Avatar initials={doc.avatar} size="lg" shape="rounded" variant="blue" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <p className="font-semibold text-slate-800 dark:text-white text-sm leading-snug truncate">{doc.name}</p>
                  <StatusBadge
                    status={doc.available ? 'available' : 'unavailable'}
                    statusMap={availabilityStatusMap}
                    size="sm"
                  />
                </div>
                <p className="text-xs text-blue-600 font-medium mt-0.5">{doc.specialty}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Rating',   value: `★ ${doc.rating}`,    cls: 'text-amber-500'  },
                { label: 'Precio',   value: `€${doc.price}`,       cls: 'text-slate-800 dark:text-white' },
                { label: 'Distancia',value: `${doc.distance} km`,  cls: 'text-slate-800 dark:text-white' },
              ].map((stat) => (
                <div key={stat.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl py-2">
                  <p className="text-xs text-slate-400">{stat.label}</p>
                  <p className={`text-sm font-bold ${stat.cls}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-4">
              <span className="flex items-center gap-1 text-xs text-slate-400"><Clock size={12} /> {doc.experience} años exp.</span>
              <span className="flex items-center gap-1 text-xs text-slate-400"><Star size={12} /> {doc.reviews} reseñas</span>
              <span className="flex items-center gap-1 text-xs text-slate-400"><MapPin size={12} /> {doc.distance} km</span>
            </div>

            <button
              disabled={!doc.available}
              className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition
                         bg-blue-600 hover:bg-blue-700 text-white shadow-sm
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Pedir cita
            </button>
          </CardContainer>
        ))}
      </div>
    </div>
  );
}
