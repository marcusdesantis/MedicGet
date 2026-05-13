import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, Star, Filter, ArrowRight, Loader2 } from 'lucide-react';
import { PageHeader }   from '@/components/ui/PageHeader';
import { SearchInput }  from '@/components/ui/SearchInput';
import { Avatar }       from '@/components/ui/Avatar';
import { CardContainer } from '@/components/ui/CardContainer';
import { EmptyState } from '@/components/ui/EmptyState';
import { useApi } from '@/hooks/useApi';
import { doctorsApi, type DoctorDto, type PaginatedData } from '@/lib/api';
// Catálogo único de especialidades para toda la app — antes esta página
// usaba la lista corta de `register/data/specialties.ts`. Ahora consumimos
// el mismo catálogo que SpecialtyCombobox usa en registro + setup, así
// el paciente filtra contra TODAS las especialidades disponibles.
import { DEFAULT_SPECIALTIES } from '@/lib/specialties';

/**
 * Fields rendered in the search filter bar. Specialty is read from the URL
 * so deep links from the dashboard or a marketing page can pre-filter.
 */
function initials(profile?: { firstName?: string; lastName?: string }): string {
  const a = profile?.firstName?.[0] ?? '';
  const b = profile?.lastName?.[0] ?? '';
  return (a + b).toUpperCase() || 'DR';
}

function fullName(d: DoctorDto): string {
  const p = d.user?.profile;
  return `Dr. ${[p?.firstName, p?.lastName].filter(Boolean).join(' ')}`.trim();
}

/**
 * Patient — search doctors with real filters backed by `doctorsApi.list()`.
 *
 * Filters:
 *   • search     → free text (matches name, specialty, bio on the backend)
 *   • specialty  → from the shared specialties list. Driven via ?specialty=
 *                  query string so dashboard cards can deep-link.
 *   • available  → boolean toggle, only shows doctors with `available = true`
 *
 * Each card links to `/patient/doctor/:id` for the full profile + booking.
 */
export function SearchDoctorsPage() {
  const [params, setParams] = useSearchParams();
  const [query,         setQuery]         = useState(params.get('search')    ?? '');
  const [specialty,     setSpecialty]     = useState(params.get('specialty') ?? '');
  const [onlyAvailable, setOnlyAvailable] = useState(params.get('available') === '1');

  // Debounce the free-text query so we don't spam the API on every keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Keep URL in sync so the filters survive refresh and are sharable.
  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedQuery) next.set('search',    debouncedQuery);
    if (specialty)      next.set('specialty', specialty);
    if (onlyAvailable)  next.set('available', '1');
    setParams(next, { replace: true });
  }, [debouncedQuery, specialty, onlyAvailable, setParams]);

  const filters = useMemo(() => ({
    search:    debouncedQuery || undefined,
    specialty: specialty       || undefined,
    available: onlyAvailable ? 'true' : undefined,
  }), [debouncedQuery, specialty, onlyAvailable]);

  const { state, refetch } = useApi<PaginatedData<DoctorDto>>(
    () => doctorsApi.list(filters),
    [debouncedQuery, specialty, onlyAvailable],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Buscar médicos" subtitle="Encuentra al especialista que necesitas" />

      {/* Filter bar */}
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
            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las especialidades</option>
            {DEFAULT_SPECIALTIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => setOnlyAvailable(!onlyAvailable)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition border ${
              onlyAvailable
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Filter size={15} /> Solo disponibles
          </button>
        </div>
      </CardContainer>

      {/* Results */}
      {state.status === 'loading' && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin" size={20} />
        </div>
      )}

      {state.status === 'error' && (
        <CardContainer>
          <p className="text-sm text-rose-600">{state.error.message}</p>
          <button onClick={refetch} className="mt-2 text-xs text-blue-600 hover:underline">Reintentar</button>
        </CardContainer>
      )}

      {state.status === 'ready' && (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {state.data.data.length} {state.data.data.length === 1 ? 'médico encontrado' : 'médicos encontrados'}
          </p>

          {state.data.data.length === 0 ? (
            <CardContainer>
              <EmptyState
                title="Sin resultados"
                description="Probá quitando filtros o buscando con otra palabra."
              />
            </CardContainer>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {state.data.data.map((doc) => (
                <CardContainer key={doc.id} className="hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex items-start gap-3">
                    <Avatar initials={initials(doc.user?.profile)} size="lg" shape="rounded" variant="blue" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-white text-sm leading-snug truncate">
                        {fullName(doc)}
                      </p>
                      <p className="text-xs text-blue-600 font-medium mt-0.5">{doc.specialty}</p>
                      {doc.clinic && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{doc.clinic.name}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Stat label="Rating" value={doc.rating > 0 ? `★ ${doc.rating.toFixed(1)}` : '—'} cls="text-amber-500" />
                    <Stat label="Precio" value={doc.pricePerConsult > 0 ? `$${doc.pricePerConsult.toFixed(0)}` : 'Consultar'} cls="text-slate-800 dark:text-white" />
                    <Stat label="Exp."   value={`${doc.experience}a`} cls="text-slate-800 dark:text-white" />
                  </div>

                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Clock size={12} /> {doc.consultDuration} min</span>
                    <span className="flex items-center gap-1"><Star size={12} /> {doc.reviewCount} reseñas</span>
                  </div>

                  <Link
                    to={`/patient/doctor/${doc.id}`}
                    className={`mt-4 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                      doc.available
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed pointer-events-none opacity-60'
                    }`}
                  >
                    {doc.available ? 'Ver perfil y reservar' : 'No disponible'}
                    {doc.available && <ArrowRight size={14} />}
                  </Link>
                </CardContainer>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-sm font-bold ${cls}`}>{value}</p>
    </div>
  );
}
