import { useMemo, useState } from 'react';
import { Plus, Search, Loader2, X, UserPlus, Stethoscope, Copy, Check } from 'lucide-react';
import PhoneInput        from 'react-phone-input-2';
import { toast }          from 'sonner';
import { PageHeader }     from '@/components/ui/PageHeader';
import { SearchInput }    from '@/components/ui/SearchInput';
import { Avatar }         from '@/components/ui/Avatar';
import { CardContainer }  from '@/components/ui/CardContainer';
import { ToggleSwitch }   from '@/components/ui/ToggleSwitch';
import { Alert }          from '@/components/ui/Alert';
import { EmptyState }     from '@/components/ui/EmptyState';
import { Input }              from '@/components/ui/Input';
import { Button }             from '@/components/ui/Button';
import { SpecialtyCombobox }  from '@/components/ui/SpecialtyCombobox';
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
                    <Avatar
                      initials={initials(doc.user?.profile)}
                      imageUrl={doc.user?.profile?.avatarUrl ?? null}
                      size="lg"
                      shape="rounded"
                      variant="indigo"
                    />
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
          // Las especialidades ya cargadas en la clínica se ofrecen como
          // sugerencias preferentes en el combobox.
          existingSpecialties={
            state.status === 'ready'
              ? Array.from(new Set(state.data.data.map((d) => d.specialty).filter(Boolean)))
              : []
          }
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
 * Modal con dos modos:
 *   • "Buscar existente" — invita a un médico ya registrado a la clínica
 *     vía PATCH. El backend permite asociar médicos independientes; un
 *     médico que ya tiene otra clínica queda bloqueado (no robar).
 *   • "Crear nuevo"      — la clínica registra al médico desde cero,
 *     genera un usuario+contraseña temporal y se la entrega. Útil
 *     cuando la clínica quiere precargar a su staff sin pedirle a
 *     cada uno que se auto-registre.
 */
function AddDoctorModal({
  clinicId, existingSpecialties = [], onClose, onAdded,
}: {
  clinicId: string;
  existingSpecialties?: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [tab, setTab] = useState<'existing' | 'create'>('existing');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm overflow-y-auto p-4 pt-16">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-white">
            <UserPlus size={18} className="text-indigo-600" /> Añadir médico
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6">
          <TabButton active={tab === 'existing'} onClick={() => setTab('existing')}>
            Buscar existente
          </TabButton>
          <TabButton active={tab === 'create'} onClick={() => setTab('create')}>
            Crear nuevo médico
          </TabButton>
        </div>

        {tab === 'existing' && <ExistingTab clinicId={clinicId} onAdded={onAdded} />}
        {tab === 'create'   && (
          <CreateTab
            clinicId={clinicId}
            existingSpecialties={existingSpecialties}
            onAdded={onAdded}
          />
        )}

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: {
  active:   boolean;
  onClick:  () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
        active
          ? 'border-indigo-600 text-indigo-600'
          : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
      }`}
    >
      {children}
    </button>
  );
}

/* ─── "Buscar existente" tab ──────────────────────────────────────────── */

function ExistingTab({ clinicId, onAdded }: { clinicId: string; onAdded: () => void }) {
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
    <div className="px-6 py-5 space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Busca un médico ya registrado en MedicGet y asígnalo a tu clínica.
        Sólo podés agregar médicos <strong>independientes</strong> — los que
        ya tienen otra clínica deben desvincularse primero.
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
          const inAnother   = d.clinic && d.clinic.id !== clinicId;
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
              ) : inAnother ? (
                <span className="text-xs text-slate-400">En otra clínica</span>
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
  );
}

/* ─── "Crear nuevo médico" tab ────────────────────────────────────────── */

interface CreateForm {
  email:           string;
  firstName:       string;
  lastName:        string;
  phone:           string;
  specialty:       string;
  licenseNumber:   string;
  experience:      string;
  pricePerConsult: string;
  bio:             string;
}

const EMPTY_FORM: CreateForm = {
  email: '', firstName: '', lastName: '', phone: '',
  specialty: '', licenseNumber: '', experience: '', pricePerConsult: '', bio: '',
};

function CreateTab({
  clinicId, existingSpecialties = [], onAdded,
}: {
  clinicId: string;
  existingSpecialties?: string[];
  onAdded: () => void;
}) {
  const [form,    setForm]    = useState<CreateForm>(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState<string | null>(null);
  const [created, setCreated] = useState<{ doctor: DoctorDto; tempPassword: string } | null>(null);

  const valid =
    form.email.trim().length > 3 &&
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    form.specialty.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await clinicsApi.createDoctor(clinicId, {
        email:           form.email.trim(),
        firstName:       form.firstName.trim(),
        lastName:        form.lastName.trim(),
        phone:           form.phone.trim()         || undefined,
        specialty:       form.specialty.trim(),
        licenseNumber:   form.licenseNumber.trim() || undefined,
        experience:      form.experience          ? Number(form.experience)      : undefined,
        pricePerConsult: form.pricePerConsult     ? Number(form.pricePerConsult) : undefined,
        bio:             form.bio.trim()           || undefined,
      });
      setCreated(res.data);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'No se pudo crear el médico';
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <CreatedSuccess
        doctor={created.doctor}
        tempPassword={created.tempPassword}
        onContinue={() => {
          setCreated(null);
          setForm(EMPTY_FORM);
          onAdded();
        }}
        onAddAnother={() => {
          setCreated(null);
          setForm(EMPTY_FORM);
        }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Registrás al médico desde cero con datos básicos. Generamos una
        contraseña temporal y se la enviamos por email — también te la mostramos
        acá para que puedas compartirla en mano.
      </p>

      {err && <Alert variant="error">{err}</Alert>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Email *">
          <Input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="medico@dominio.com"
          />
        </Field>
        <Field label="Teléfono">
          <div className="phone-input-wrapper">
            <PhoneInput
              country={'ec'}
              value={form.phone}
              onChange={(phone) => setForm({ ...form, phone })}
              inputProps={{ name: 'phone' }}
              specialLabel=""
            />
          </div>
        </Field>
        <Field label="Nombre *">
          <Input
            required
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
        </Field>
        <Field label="Apellido *">
          <Input
            required
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
        </Field>
        <Field label="Especialidad *">
          <SpecialtyCombobox
            value={form.specialty}
            onChange={(s) => setForm({ ...form, specialty: s })}
            extraSuggestions={existingSpecialties}
            required
          />
        </Field>
        <Field label="Licencia / Reg. Profesional">
          <Input
            value={form.licenseNumber}
            onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
          />
        </Field>
        <Field label="Años de experiencia">
          <Input
            type="number"
            min={0}
            value={form.experience}
            onChange={(e) => setForm({ ...form, experience: e.target.value })}
          />
        </Field>
        <Field label="Precio por consulta (USD)">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.pricePerConsult}
            onChange={(e) => setForm({ ...form, pricePerConsult: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Bio (opcional)">
        <textarea
          rows={3}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Breve descripción profesional, áreas de interés, etc."
        />
      </Field>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-slate-400">
          Modalidad por defecto: videollamada. El médico puede ampliarla desde su perfil.
        </p>
        <Button
          type="submit"
          disabled={!valid || saving}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          Crear médico
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function CreatedSuccess({
  doctor, tempPassword, onContinue, onAddAnother,
}: {
  doctor:      DoctorDto & { user: { email?: string; profile?: { firstName?: string; lastName?: string } } };
  tempPassword: string;
  onContinue:  () => void;
  onAddAnother: () => void;
}) {
  const [copied, setCopied] = useState<'email' | 'password' | null>(null);
  const profile = doctor.user.profile;
  const email   = doctor.user.email ?? '';

  const copy = async (text: string, key: 'email' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2000);
      toast.success('Copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <div className="px-6 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Check className="text-emerald-600" size={18} />
        </div>
        <div>
          <p className="font-bold text-slate-800 dark:text-white">¡Médico creado!</p>
          <p className="text-xs text-slate-500">
            Dr. {profile?.firstName} {profile?.lastName} · {doctor.specialty}
          </p>
        </div>
      </div>

      <Alert variant="info">
        Le mandamos las credenciales por email automáticamente. Si querés
        compartirlas en mano, copialas de acá — <strong>esta es la única vez</strong> que
        verás la contraseña.
      </Alert>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-200 dark:divide-slate-700">
        {email && (
          <div className="px-4 py-3 bg-white dark:bg-slate-900 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Email</p>
              <p className="font-mono text-sm text-slate-800 dark:text-white mt-0.5 select-all">{email}</p>
            </div>
            <button
              type="button"
              onClick={() => copy(email, 'email')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
            >
              {copied === 'email' ? <Check size={13} /> : <Copy size={13} />}
              {copied === 'email' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        )}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Contraseña temporal</p>
            <p className="font-mono text-base font-bold text-slate-800 dark:text-white mt-0.5 select-all">
              {tempPassword}
            </p>
          </div>
          <button
            type="button"
            onClick={() => copy(tempPassword, 'password')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
          >
            {copied === 'password' ? <Check size={13} /> : <Copy size={13} />}
            {copied === 'password' ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
      <p className="text-[11px] text-slate-400">
        Recordale al médico que cambie la contraseña en su primer login.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={onContinue}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
        >
          Listo, ver lista
        </Button>
        <Button
          onClick={onAddAnother}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 rounded-xl"
        >
          Crear otro médico
        </Button>
      </div>
    </div>
  );
}
