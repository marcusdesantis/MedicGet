import { useMemo, useState } from 'react';
import { Plus, Search, Loader2, X, UserPlus, Stethoscope } from 'lucide-react';
import { PageHeader }     from '@/components/ui/PageHeader';
import { SearchInput }    from '@/components/ui/SearchInput';
import { Avatar }         from '@/components/ui/Avatar';
import { CardContainer }  from '@/components/ui/CardContainer';
import { ToggleSwitch }   from '@/components/ui/ToggleSwitch';
import { Alert }          from '@/components/ui/Alert';
import { EmptyState }     from '@/components/ui/EmptyState';
import { Input }          from '@/components/ui/Input';
import { Button }         from '@/components/ui/Button';
import { useApi }         from '@/hooks/useApi';
import { useAuth }        from '@/context/AuthContext';
import { clinicsApi, doctorsApi, type DoctorDto, type PaginatedData } from '@/lib/api';

function fullName(p?: { firstName?: string; lastName?: string }): string {
  return [p?.firstName, p?.lastName].filter(Boolean).join(' ') || '—';
}

function initials(p?: { firstName?: string; lastName?: string }): string {
  return ((p?.firstName?.[0] ?? '') + (p?.lastName?.[0] ?? '')).toUpperCase() || 'DR';
}

/**
 * Clinic — manage doctors associated with this clinic.
 *
 * Reads from `clinicsApi.getDoctors(clinicId)` to list current associates,
 * plus `doctorsApi.list({ clinicId: '' })` (independent doctors) for the
 * "Add doctor" modal — clinics can claim independent doctors by setting
 * `clinicId` via PATCH.
 *
 * Toggle availability calls `doctorsApi.update(id, { available })`.
 */
export function ManageDoctorsPage() {
  const { user } = useAuth();
  const clinicId = user?.dto.clinic?.id ?? null;

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { state, refetch } = useApi<PaginatedData<DoctorDto>>(
    () => clinicsApi.getDoctors(clinicId!, { pageSize: 100 }),
    [clinicId],
  );

  const visible = useMemo(() => {
    if (state.status !== 'ready') return [];
    const q = search.trim().toLowerCase();
    if (!q) return state.data.data;
    return state.data.data.filter((d) => {
      const name = fullName(d.user?.profile).toLowerCase();
      const spec = d.specialty.toLowerCase();
      return name.includes(q) || spec.includes(q);
    });
  }, [state, search]);

  const toggleAvailable = async (doctor: DoctorDto) => {
    setActingId(doctor.id);
    setActionError(null);
    try {
      await doctorsApi.update(doctor.id, { available: !doctor.available });
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo cambiar el estado';
      setActionError(msg);
    } finally {
      setActingId(null);
    }
  };

  if (!clinicId) {
    return (
      <Alert variant="error">
        No se pudo identificar tu clínica. Vuelve a iniciar sesión.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de médicos"
        subtitle="Administra los especialistas de tu clínica"
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition shadow-sm"
          >
            <Plus size={15} /> Añadir médico
          </button>
        }
      />

      {actionError && <Alert variant="error">{actionError}</Alert>}

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar médico o especialidad..." className="max-w-sm" />

      {state.status === 'loading' && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin" size={20} />
        </div>
      )}

      {state.status === 'error' && (
        <Alert variant="error">{state.error.message}</Alert>
      )}

      {state.status === 'ready' && (
        visible.length === 0 ? (
          <CardContainer>
            <EmptyState
              title="Sin médicos asociados"
              description="Añade médicos a tu clínica para que aparezcan disponibles para los pacientes."
              icon={Stethoscope}
              action={
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-sm text-indigo-600 font-medium hover:underline"
                >
                  + Añadir el primero
                </button>
              }
            />
          </CardContainer>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visible.map((doc) => (
              <CardContainer key={doc.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar initials={initials(doc.user?.profile)} size="lg" shape="rounded" variant="indigo" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white text-sm leading-snug">
                        Dr. {fullName(doc.user?.profile)}
                      </p>
                      <p className="text-xs text-indigo-600 font-medium">{doc.specialty}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <Stat label="Rating"    value={doc.rating > 0 ? `★ ${doc.rating.toFixed(1)}` : '—'} cls="text-amber-500" />
                  <Stat label="Reseñas"   value={String(doc.reviewCount)} />
                  <Stat label="Precio"    value={doc.pricePerConsult > 0 ? `$${doc.pricePerConsult.toFixed(0)}` : '—'} />
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400">{doc.experience} años exp.</span>
                  {actingId === doc.id ? (
                    <Loader2 className="animate-spin text-slate-400" size={16} />
                  ) : (
                    <ToggleSwitch
                      checked={doc.available}
                      onChange={() => toggleAvailable(doc)}
                      onLabel="Disponible"
                      offLabel="No disponible"
                    />
                  )}
                </div>
              </CardContainer>
            ))}
          </div>
        )
      )}

      {showAddModal && (
        <AddDoctorModal
          clinicId={clinicId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); refetch(); }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, cls = 'text-slate-800 dark:text-white' }: { label: string; value: string; cls?: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl py-2">
      <p className={`text-sm font-bold ${cls}`}>{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

// ─── Add Doctor Modal ────────────────────────────────────────────────────────

/**
 * Modal that lets the clinic associate an existing independent doctor (or
 * one currently with another clinic) by setting their `clinicId`. We reuse
 * `doctorsApi.list()` with a search filter — the backend filters across
 * name + specialty + bio. The PATCH then sets `clinicId` on the chosen row.
 */
function AddDoctorModal({
  clinicId, onClose, onAdded,
}: {
  clinicId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState(query);
  const [adding, setAdding] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useMemo(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { state } = useApi<PaginatedData<DoctorDto>>(
    () => doctorsApi.list({ search: debounced || undefined, pageSize: 20 }),
    [debounced],
  );

  const handleAdd = async (doctorId: string) => {
    setAdding(doctorId);
    setErr(null);
    try {
      await doctorsApi.update(doctorId, { clinicId } as Partial<DoctorDto>);
      onAdded();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo añadir';
      setErr(msg);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm overflow-y-auto p-4 pt-16">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold flex items-center gap-2">
            <UserPlus size={18} className="text-indigo-600" /> Añadir médico
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Busca un médico ya registrado en MedicGet y asígnalo a tu clínica.
            Si está asociado a otra clínica, se transferirá a la tuya.
          </p>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o especialidad..."
              className="pl-9"
            />
          </div>

          {err && <Alert variant="error">{err}</Alert>}

          <div className="max-h-80 overflow-y-auto -mx-6">
            {state.status === 'loading' && (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="animate-spin" size={18} />
              </div>
            )}
            {state.status === 'ready' && state.data.data.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">Sin resultados</p>
            )}
            {state.status === 'ready' && state.data.data.map((d) => {
              const alreadyOurs = d.clinic?.id === clinicId;
              return (
                <div
                  key={d.id}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <Avatar initials={initials(d.user?.profile)} size="sm" variant="indigo" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                      Dr. {fullName(d.user?.profile)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {d.specialty}
                      {d.clinic ? ` · ${d.clinic.name}` : ' · Independiente'}
                    </p>
                  </div>
                  {alreadyOurs ? (
                    <span className="text-xs text-emerald-600 font-medium">Ya asociado</span>
                  ) : (
                    <Button
                      onClick={() => handleAdd(d.id)}
                      disabled={adding === d.id}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      {adding === d.id ? <Loader2 size={12} className="animate-spin" /> : 'Añadir'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
