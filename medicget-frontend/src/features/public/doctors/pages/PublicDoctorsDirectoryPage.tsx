/**
 * /medicos — public directory of doctors.
 *
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │  Encontrá tu especialista                                    │
 *  │  ┌─────────────────────────────────────────────────────────┐│
 *  │  │ 🔍 Buscar por nombre, especialidad…                     ││
 *  │  └─────────────────────────────────────────────────────────┘│
 *  ├──────────┬──────────────────────────────────────────────────┤
 *  │ FILTROS  │  256 médicos · ordenado por mejor calificación    │
 *  │          │  ┌────────┐  ┌────────┐  ┌────────┐               │
 *  │ Modalidad│  │ card 1 │  │ card 2 │  │ card 3 │               │
 *  │ □ Online │  └────────┘  └────────┘  └────────┘               │
 *  │ □ Pres.  │                                                    │
 *  │ □ Chat   │  ┌────────┐  ┌────────┐  ┌────────┐               │
 *  │          │  │ card 4 │  │ card 5 │  │ card 6 │               │
 *  │ Precio   │  └────────┘  └────────┘  └────────┘               │
 *  │ [_______]│                                                    │
 *  │          │  ‹ 1 2 3 4 ... ›                                   │
 *  └──────────┴──────────────────────────────────────────────────┘
 *
 * UX choices:
 *  • Sticky sidebar with filters on desktop, slide-up sheet on mobile.
 *  • Debounced search (300ms) so the API isn't hit on every keystroke.
 *  • URL state — filters persist on reload and are shareable.
 *  • Skeleton state while fetching, never a blank screen.
 *  • Empty state with friendly message if filters return nothing.
 *  • CTA per card: "Ver perfil →" — anonymous user goes to /medicos/:id;
 *    we don't push them to register here, the detail page handles that.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, Star, Video, Building2, MessageSquare, ArrowRight, ArrowLeft,
  Filter, X, Loader2, Activity,
} from 'lucide-react';
import { Avatar }     from '@/components/ui/Avatar';
import { useApi }     from '@/hooks/useApi';
import { doctorsApi, type DoctorDto, type PaginatedData } from '@/lib/api';

const MODALITY_OPTIONS = [
  { value: 'ONLINE',     label: 'Videollamada',  icon: Video },
  { value: 'PRESENCIAL', label: 'Presencial',    icon: Building2 },
  { value: 'CHAT',       label: 'Chat en vivo',  icon: MessageSquare },
];

const PRICE_RANGES = [
  { value: '0-25',   label: 'Hasta $25',      min: 0,   max: 25 },
  { value: '25-50',  label: '$25 a $50',      min: 25,  max: 50 },
  { value: '50-100', label: '$50 a $100',     min: 50,  max: 100 },
  { value: '100+',   label: 'Más de $100',    min: 100, max: undefined },
];

export function PublicDoctorsDirectoryPage() {
  const [params, setParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(params.get('search') ?? '');
  const [mobileFilters, setMobileFilters] = useState(false);

  // Debounce the URL param so we don't refetch on every keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(params);
      if (searchInput.trim()) next.set('search', searchInput.trim());
      else                    next.delete('search');
      setParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const search    = params.get('search')    ?? '';
  const specialty = params.get('specialty') ?? '';
  const modality  = params.get('modality')  ?? '';
  const priceRng  = params.get('price')     ?? '';

  const apiParams = useMemo(() => {
    const p: Record<string, string> = { available: 'true', pageSize: '24' };
    if (search)    p.search    = search;
    if (specialty) p.specialty = specialty;
    if (modality)  p.modality  = modality;
    if (priceRng) {
      const range = PRICE_RANGES.find((r) => r.value === priceRng);
      if (range) {
        p.priceMin = String(range.min);
        if (range.max !== undefined) p.priceMax = String(range.max);
      }
    }
    return p;
  }, [search, specialty, modality, priceRng]);

  const { state } = useApi<PaginatedData<DoctorDto>>(
    () => doctorsApi.list(apiParams),
    [apiParams.search, apiParams.specialty, apiParams.modality, apiParams.priceMin, apiParams.priceMax],
  );

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else       next.delete(key);
    setParams(next, { replace: true });
  };

  const clearAll = () => {
    setSearchInput('');
    setParams({}, { replace: true });
  };

  const activeFilters = [specialty, modality, priceRng].filter(Boolean).length;

  // Specialties extracted from the current data (could be /specialties endpoint
  // later for proper completeness). Frequency-sorted, top 12.
  const specialties = useMemo(() => {
    if (state.status !== 'ready') return [];
    const counts = new Map<string, number>();
    state.data.data.forEach((d) => counts.set(d.specialty, (counts.get(d.specialty) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s).slice(0, 12);
  }, [state]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Public header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 dark:text-slate-300">
            <ArrowLeft size={16} />
            <span className="font-bold">MedicGet</span>
          </Link>
          <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400">
            Iniciar sesión
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        {/* Hero header */}
        <div className="max-w-3xl mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Encontrá tu especialista
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-500 dark:text-slate-400">
            Reservá videollamadas, citas presenciales o consultas por chat con médicos verificados.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cardiólogo, dermatóloga, pediatra, nombre del médico…"
            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-base text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>

        {/* Mobile filter toggle */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setMobileFilters(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium"
          >
            <Filter size={14} /> Filtros {activeFilters > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">{activeFilters}</span>
            )}
          </button>
        </div>

        <div className="flex gap-8">
          {/* Sidebar — desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <FiltersPanel
              specialty={specialty}
              modality={modality}
              priceRng={priceRng}
              specialties={specialties}
              onSet={setFilter}
              onClear={clearAll}
              activeCount={activeFilters}
            />
          </aside>

          {/* Mobile filters drawer */}
          {mobileFilters && (
            <div className="lg:hidden fixed inset-0 z-40 flex">
              <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileFilters(false)} />
              <div className="ml-auto relative w-full max-w-sm bg-white dark:bg-slate-900 h-full overflow-y-auto p-6">
                <button
                  onClick={() => setMobileFilters(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
                <FiltersPanel
                  specialty={specialty}
                  modality={modality}
                  priceRng={priceRng}
                  specialties={specialties}
                  onSet={setFilter}
                  onClear={clearAll}
                  activeCount={activeFilters}
                />
              </div>
            </div>
          )}

          {/* Results */}
          <main className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-slate-500">
                {state.status === 'ready'
                  ? `${state.data.meta.total} ${state.data.meta.total === 1 ? 'médico' : 'médicos'} encontrados`
                  : 'Buscando…'}
              </p>
              {activeFilters > 0 && (
                <button onClick={clearAll} className="text-xs text-blue-600 hover:underline">
                  Limpiar filtros
                </button>
              )}
            </div>

            {state.status === 'loading' && <ResultsSkeleton />}
            {state.status === 'error' && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900 p-6 text-sm text-rose-700">
                {state.error.message}
              </div>
            )}
            {state.status === 'ready' && state.data.data.length === 0 && (
              <div className="text-center py-16 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
                <Activity size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">No encontramos médicos con esos filtros</p>
                <p className="text-sm text-slate-400 mt-1">Probá ajustando la búsqueda o limpiando los filtros.</p>
              </div>
            )}
            {state.status === 'ready' && state.data.data.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {state.data.data.map((d) => (
                  <DirectoryCard key={d.id} doctor={d} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/* ─── Sidebar filter panel ──────────────────────────────────────────── */

interface FiltersPanelProps {
  specialty:    string;
  modality:     string;
  priceRng:     string;
  specialties:  string[];
  onSet:        (key: string, value: string) => void;
  onClear:      () => void;
  activeCount:  number;
}

function FiltersPanel({ specialty, modality, priceRng, specialties, onSet, onClear, activeCount }: FiltersPanelProps) {
  return (
    <div className="lg:sticky lg:top-24 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-800 dark:text-white">Filtros</h2>
        {activeCount > 0 && (
          <button onClick={onClear} className="text-xs text-blue-600 hover:underline">Limpiar</button>
        )}
      </div>

      <FilterGroup label="Modalidad">
        {MODALITY_OPTIONS.map((m) => {
          const Icon = m.icon;
          const on = modality === m.value;
          return (
            <button
              key={m.value}
              onClick={() => onSet('modality', on ? '' : m.value)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition ${
                on
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Icon size={14} /> {m.label}
            </button>
          );
        })}
      </FilterGroup>

      <FilterGroup label="Precio por consulta">
        {PRICE_RANGES.map((r) => {
          const on = priceRng === r.value;
          return (
            <button
              key={r.value}
              onClick={() => onSet('price', on ? '' : r.value)}
              className={`flex items-center w-full px-3 py-2 rounded-lg text-sm transition ${
                on
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </FilterGroup>

      {specialties.length > 0 && (
        <FilterGroup label="Especialidad">
          <div className="flex flex-wrap gap-1.5">
            {specialties.map((s) => {
              const on = specialty === s;
              return (
                <button
                  key={s}
                  onClick={() => onSet('specialty', on ? '' : s)}
                  className={`text-xs px-2.5 py-1 rounded-full transition ${
                    on
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">{label}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

/* ─── Directory card (compact variant of landing card) ──────────────── */

function DirectoryCard({ doctor }: { doctor: DoctorDto }) {
  const profile  = doctor.user.profile;
  const initials = ((profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '')).toUpperCase() || 'DR';
  const fullName = `Dr. ${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();

  return (
    <Link
      to={`/medicos/${doctor.id}`}
      className="group block rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        <Avatar
          initials={initials}
          imageUrl={profile?.avatarUrl ?? null}
          size="lg"
          shape="rounded"
          variant="auto"
          alt={fullName}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 dark:text-white truncate">{fullName}</h3>
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium truncate">{doctor.specialty}</p>
          {doctor.reviewCount > 0 ? (
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
              <Star size={11} className="text-amber-400 fill-amber-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{doctor.rating.toFixed(1)}</span>
              <span>· {doctor.reviewCount}</span>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-1">Aún sin reseñas</p>
          )}
        </div>
      </div>

      {doctor.bio && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{doctor.bio}</p>
      )}

      <div className="mt-3 flex items-center gap-1 flex-wrap">
        {doctor.modalities.map((m) => (
          <span
            key={m}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            {m === 'ONLINE'     && <><Video size={9} /> Online</>}
            {m === 'PRESENCIAL' && <><Building2 size={9} /> Presencial</>}
            {m === 'CHAT'       && <><MessageSquare size={9} /> Chat</>}
          </span>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-base font-bold text-slate-800 dark:text-white">${doctor.pricePerConsult.toFixed(2)}</span>
        <span className="text-xs font-semibold text-blue-600 inline-flex items-center gap-1">
          Ver perfil <ArrowRight size={11} />
        </span>
      </div>
    </Link>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-2 w-5/6 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
          <div className="mt-4 h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );
}
