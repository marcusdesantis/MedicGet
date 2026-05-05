import { useMemo, useState } from 'react';
import { Phone, Mail, Loader2, Users } from 'lucide-react';
import { PageHeader }   from '@/components/ui/PageHeader';
import { SearchInput }  from '@/components/ui/SearchInput';
import { SectionCard }  from '@/components/ui/SectionCard';
import { Avatar }       from '@/components/ui/Avatar';
import { CardContainer } from '@/components/ui/CardContainer';
import { Alert }        from '@/components/ui/Alert';
import { EmptyState }   from '@/components/ui/EmptyState';
import { useApi }       from '@/hooks/useApi';
import { useAuth }      from '@/context/AuthContext';
import { patientsApi, type PatientDto, type PaginatedData } from '@/lib/api';

function fullName(p?: { firstName?: string; lastName?: string }) {
  return [p?.firstName, p?.lastName].filter(Boolean).join(' ') || '—';
}

function initials(p?: { firstName?: string; lastName?: string }) {
  return ((p?.firstName?.[0] ?? '') + (p?.lastName?.[0] ?? '')).toUpperCase() || 'PT';
}

function formatBirthDate(iso?: string): string {
  if (!iso) return '—';
  const age = Math.floor((Date.now() - new Date(iso).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${age} años`;
}

/**
 * Clinic — patients list.
 *
 * Calls `patientsApi.list({ clinicId })` so the backend filters to patients
 * who have at least one appointment at this clinic. Search matches against
 * the user's first/last name and email (server-side).
 */
export function ClinicPatientsPage() {
  const { user } = useAuth();
  const clinicId = user?.dto.clinic?.id ?? null;

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState(search);

  // Debounce search to avoid spamming the backend.
  useMemo(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { state, refetch } = useApi<PaginatedData<PatientDto>>(
    () => patientsApi.list({
      clinicId: clinicId!,
      search:   debounced || undefined,
      pageSize: 100,
    }),
    [clinicId, debounced],
  );

  if (!clinicId) {
    return <Alert variant="error">No se pudo identificar tu clínica.</Alert>;
  }

  const summary = state.status === 'ready'
    ? [
        { label: 'Total',            value: state.data.meta.total,           color: 'text-slate-800 dark:text-white' },
        { label: 'Visibles',         value: state.data.data.length,          color: 'text-indigo-600' },
        { label: 'Página',           value: `${state.data.meta.page} / ${state.data.meta.totalPages || 1}`, color: 'text-slate-600' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacientes"
        subtitle="Pacientes que se han atendido en tu clínica"
      />

      {state.status === 'ready' && (
        <div className="grid grid-cols-3 gap-4">
          {summary.map((s) => (
            <CardContainer key={s.label} className="text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </CardContainer>
          ))}
        </div>
      )}

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nombre o email..."
        className="max-w-sm"
      />

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
        <SectionCard noPadding>
          {state.data.data.length === 0 ? (
            <EmptyState
              title="Sin pacientes todavía"
              description="Cuando los pacientes se atiendan con tus médicos aparecerán aquí."
              icon={Users}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-5 py-3">Paciente</th>
                    <th className="text-left px-5 py-3">Contacto</th>
                    <th className="text-left px-5 py-3">Edad</th>
                    <th className="text-left px-5 py-3">Tipo de sangre</th>
                    <th className="text-left px-5 py-3">Alergias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {state.data.data.map((p) => {
                    const profile = p.user?.profile;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar initials={initials(profile)} size="sm" variant="indigo" />
                            <div>
                              <p className="font-medium text-slate-800 dark:text-white">{fullName(profile)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <p className="flex items-center gap-1.5 text-xs text-slate-500"><Mail size={11} /> {p.user?.email ?? '—'}</p>
                          {profile?.phone && <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5"><Phone size={11} /> {profile.phone}</p>}
                        </td>
                        <td className="px-5 py-3 text-slate-500">{formatBirthDate(p.dateOfBirth)}</td>
                        <td className="px-5 py-3 text-slate-500">{p.bloodType ?? '—'}</td>
                        <td className="px-5 py-3 text-slate-500">
                          {p.allergies && p.allergies.length > 0
                            ? p.allergies.join(', ')
                            : 'Ninguna'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
