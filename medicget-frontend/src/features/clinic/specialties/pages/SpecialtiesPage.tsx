import { useMemo } from 'react';
import { Loader2, BookOpen, TrendingUp } from 'lucide-react';
import { PageHeader }   from '@/components/ui/PageHeader';
import { CardContainer } from '@/components/ui/CardContainer';
import { SectionCard }  from '@/components/ui/SectionCard';
import { Alert }        from '@/components/ui/Alert';
import { EmptyState }   from '@/components/ui/EmptyState';
import { useApi }       from '@/hooks/useApi';
import { useAuth }      from '@/context/AuthContext';
import { clinicsApi, type DoctorDto, type PaginatedData } from '@/lib/api';

/**
 * Clinic — specialties offered.
 *
 * The backend doesn't have a `Specialty` table — specialties are free-form
 * strings on each Doctor row. We derive the list here from the doctors
 * currently associated with the clinic, grouping by `specialty`.
 *
 * If the data model later evolves to a proper Specialty table with CRUD,
 * this page would migrate to use it directly.
 */
interface SpecialtyGroup {
  specialty:        string;
  doctorCount:      number;
  availableCount:   number;
  avgRating:        number;
  avgPrice:         number;
}

function groupBySpecialty(doctors: DoctorDto[]): SpecialtyGroup[] {
  const map = new Map<string, DoctorDto[]>();
  for (const d of doctors) {
    const list = map.get(d.specialty) ?? [];
    list.push(d);
    map.set(d.specialty, list);
  }
  return Array.from(map.entries())
    .map(([specialty, list]) => {
      const ratings = list.filter((d) => d.rating > 0).map((d) => d.rating);
      const prices  = list.filter((d) => d.pricePerConsult > 0).map((d) => d.pricePerConsult);
      return {
        specialty,
        doctorCount:    list.length,
        availableCount: list.filter((d) => d.available).length,
        avgRating:      ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
        avgPrice:       prices.length  ? prices.reduce((a, b) => a + b, 0) / prices.length  : 0,
      };
    })
    .sort((a, b) => b.doctorCount - a.doctorCount);
}

export function SpecialtiesPage() {
  const { user } = useAuth();
  const clinicId = user?.dto.clinic?.id ?? null;

  const { state, refetch } = useApi<PaginatedData<DoctorDto>>(
    () => clinicsApi.getDoctors(clinicId!, { pageSize: 100 }),
    [clinicId],
  );

  const groups = useMemo(
    () => state.status === 'ready' ? groupBySpecialty(state.data.data) : [],
    [state],
  );

  const totalDoctors = state.status === 'ready' ? state.data.data.length : 0;

  if (!clinicId) {
    return <Alert variant="error">No se pudo identificar tu clínica.</Alert>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Especialidades"
        subtitle="Áreas de atención cubiertas por tus médicos asociados"
      />

      <Alert variant="info">
        <span className="text-sm">
          Las especialidades se derivan automáticamente del perfil de cada médico.
          Para añadir una nueva, asocia un médico de esa especialidad desde{' '}
          <a href="/clinic/doctors" className="font-semibold underline">Médicos</a>.
        </span>
      </Alert>

      {state.status === 'loading' && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin" size={20} />
        </div>
      )}

      {state.status === 'error' && (
        <Alert variant="error" action={
          <button onClick={refetch} className="text-sm font-medium underline">Reintentar</button>
        }>
          {state.error.message}
        </Alert>
      )}

      {state.status === 'ready' && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <CardContainer className="text-center">
              <p className="text-2xl font-bold text-indigo-600">{groups.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">Especialidades</p>
            </CardContainer>
            <CardContainer className="text-center">
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{totalDoctors}</p>
              <p className="text-xs text-slate-400 mt-0.5">Médicos en total</p>
            </CardContainer>
            <CardContainer className="text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {state.data.data.filter((d) => d.available).length}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Disponibles ahora</p>
            </CardContainer>
          </div>

          <SectionCard noPadding>
            {groups.length === 0 ? (
              <EmptyState
                title="Sin especialidades"
                description="Asocia médicos a tu clínica para que sus especialidades aparezcan aquí."
                icon={BookOpen}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-5 py-3">Especialidad</th>
                      <th className="text-left px-5 py-3">Médicos</th>
                      <th className="text-left px-5 py-3">Disponibles</th>
                      <th className="text-left px-5 py-3">Rating prom.</th>
                      <th className="text-right px-5 py-3">Precio prom.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {groups.map((g) => (
                      <tr key={g.specialty} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-5 py-3 font-medium text-slate-800 dark:text-white">{g.specialty}</td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{g.doctorCount}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <TrendingUp size={12} /> {g.availableCount}/{g.doctorCount}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-amber-500">
                          {g.avgRating > 0 ? `★ ${g.avgRating.toFixed(1)}` : '—'}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-slate-700 dark:text-slate-200">
                          {g.avgPrice > 0 ? `$${g.avgPrice.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
