import { useEffect, useMemo, useRef, useState } from 'react';
import { Save, Loader2, CheckCircle2, Stethoscope, Mail, Phone, Video, Building2, MessageSquare, Eye, EyeOff, Lock, ArrowRight, ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion, Upload, FileText } from 'lucide-react';
import { Link }         from 'react-router-dom';
import { toast }        from 'sonner';
import { PageHeader }   from '@/components/ui/PageHeader';
import { SectionCard }  from '@/components/ui/SectionCard';
import { PolicyPanel }  from '@/components/ui/PolicyPanel';
import { Avatar }         from '@/components/ui/Avatar';
import { AvatarUploader } from '@/components/ui/AvatarUploader';
import { Input }          from '@/components/ui/Input';
import { FormField }    from '@/components/ui/FormField';
import { Button }       from '@/components/ui/Button';
import { Alert }        from '@/components/ui/Alert';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { SpecialtyCombobox } from '@/components/ui/SpecialtyCombobox';
import { LocationPicker, type LocationValue } from '@/components/ui/LocationPicker';
import { PhoneField } from '@/components/ui/PhoneField';
import { useAuth }      from '@/context/AuthContext';
import { useApi }       from '@/hooks/useApi';
import { doctorsApi, usersApi, type DoctorDto, type AppointmentModality, type VerificationStatus } from '@/lib/api';

/**
 * Doctor profile — edits BOTH the User.Profile (firstName, lastName, phone)
 * and the Doctor row (specialty, license, experience, price, bio,
 * consultDuration, languages).
 *
 * Save flow runs the two PATCHes in parallel; if either fails we surface an
 * error but partial saves are visible (the user can retry just the failing
 * one by clicking Save again).
 */

function fmtLanguages(arr?: string[]): string {
  return (arr ?? []).join(', ');
}
function parseLanguages(s: string): string[] {
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

export function DoctorProfilePage() {
  const { user } = useAuth();
  const doctorId = user?.dto.doctor?.id ?? null;

  const { state, refetch } = useApi<DoctorDto>(
    () => doctorsApi.getById(doctorId!),
    [doctorId],
  );

  // Modalidades — tras eliminar el sistema de planes, todos los
  // medicos pueden ofrecer cualquier modalidad sin restricciones.
  const planModules = useMemo<string[]>(
    () => ['ONLINE', 'PRESENCIAL', 'CHAT'],
    [],
  );
  const planName    = 'Cuenta gratis';
  const isFreePlan  = false;

  const [form, setForm] = useState({
    // Profile fields
    firstName: '',
    lastName:  '',
    phone:     '',
    avatarUrl: '',
    // Doctor fields
    specialty:        '',
    licenseNumber:    '',
    licenseAuthority: '',
    experience:      '',
    pricePerConsult: '',
    consultDuration: '',
    bio:             '',
    languages:       '', // comma-separated string in form, array on backend
    // Modalities the doctor accepts. Defaults to a full set so we don't
    // disable everyone on first hydrate; gets overwritten from API once
    // the data loads.
    modalities:      ['ONLINE'] as AppointmentModality[],
    /**
     * Visibilidad en el directorio público. Cuando es false, el médico
     * NO aparece en la lista pública /medicos ni puede recibir reservas.
     * El toggle queda separado del save general — cambia y persiste en
     * el momento, así el médico se "ausenta" sin tener que llenar todo
     * el formulario.
     */
    available:       true,
  });

  const [location, setLocation] = useState<LocationValue>({});

  // Hydrate the form from the API once.
  useEffect(() => {
    if (state.status !== 'ready') return;
    const d = state.data;
    const profile = d.user?.profile;
    setForm({
      firstName:       profile?.firstName ?? '',
      lastName:        profile?.lastName  ?? '',
      phone:           profile?.phone     ?? '',
      avatarUrl:       profile?.avatarUrl ?? '',
      specialty:        d.specialty,
      licenseNumber:    d.licenseNumber ?? '',
      licenseAuthority: d.licenseAuthority ?? '',
      experience:      String(d.experience ?? 0),
      pricePerConsult: String(d.pricePerConsult ?? 0),
      consultDuration: String(d.consultDuration ?? 30),
      bio:             d.bio ?? '',
      languages:       fmtLanguages(d.languages),
      modalities:      (d.modalities && d.modalities.length > 0) ? d.modalities : ['ONLINE'],
      available:       d.available ?? true,
    });
    setLocation({
      country:   profile?.country   ?? undefined,
      province:  profile?.province  ?? undefined,
      city:      profile?.city      ?? undefined,
      address:   profile?.address   ?? undefined,
      latitude:  profile?.latitude  ?? undefined,
      longitude: profile?.longitude ?? undefined,
    });
  }, [state.status === 'ready' ? state.data : null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si llegamos con #verificacion (desde el banner del dashboard), scrolleamos
  // al card de verificación una vez que los datos cargaron y se renderizó.
  useEffect(() => {
    if (state.status !== 'ready') return;
    if (window.location.hash !== '#verificacion') return;
    const el = document.getElementById('verificacion');
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [state.status]);

  const [saving,           setSaving]           = useState(false);
  const [togglingAvailable, setTogglingAvailable] = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [success,          setSuccess]          = useState(false);

  /**
   * Toggle de "disponibilidad" — guarda al instante sin pasar por
   * el botón Guardar general. Útil para cuando el médico necesita
   * "ausentarse" rápido (vacaciones, congresos, enfermedad) sin
   * tener que tocar el resto del formulario.
   */
  const toggleAvailable = async () => {
    if (!doctorId || togglingAvailable) return;
    const next = !form.available;
    setTogglingAvailable(true);
    try {
      await doctorsApi.update(doctorId, { available: next } as Partial<DoctorDto>);
      setForm((f) => ({ ...f, available: next }));
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo cambiar la visibilidad';
      setError(msg);
    } finally {
      setTogglingAvailable(false);
    }
  };

  const handleSave = async () => {
    if (!user || !doctorId) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await Promise.all([
        // Profile (User.Profile)
        usersApi.updateProfile(user.id, {
          firstName: form.firstName.trim(),
          lastName:  form.lastName.trim(),
          phone:     form.phone.trim() || undefined,
          avatarUrl: form.avatarUrl   || undefined,
          // Ubicación — opcional para médicos independientes que sólo
          // atienden online. El LocationPicker maneja todos los campos.
          country:   location.country,
          province:  location.province,
          city:      location.city,
          address:   location.address,
          latitude:  location.latitude,
          longitude: location.longitude,
        }),
        // Doctor row
        doctorsApi.update(doctorId, {
          specialty:        form.specialty.trim() || 'Médico General',
          // licenseNumber / licenseAuthority / nationalId se guardan desde la
          // sección "Verificación de tu cuenta médica" (LicenseVerificationSection),
          // no acá — para no pisarlos con un save parcial del perfil.
          experience:      Number(form.experience)      || 0,
          pricePerConsult: Number(form.pricePerConsult) || 0,
          consultDuration: Number(form.consultDuration) || 30,
          bio:             form.bio.trim() || undefined,
          languages:       parseLanguages(form.languages),
          modalities:      form.modalities,
        } as Partial<DoctorDto>),
      ]);
      setSuccess(true);
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo guardar el perfil';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!doctorId) {
    return (
      <Alert variant="warning">
        No encontramos tu perfil de médico. Completa primero tu registro en{' '}
        <a href="/doctor/setup" className="underline font-medium">/doctor/setup</a>.
      </Alert>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-20 justify-center">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <Alert variant="error" action={
        <button onClick={refetch} className="text-sm font-medium underline">Reintentar</button>
      }>
        {state.error.message}
      </Alert>
    );
  }

  const initials =
    ((form.firstName?.[0] ?? '') + (form.lastName?.[0] ?? '')).toUpperCase() || 'DR';

  return (
    <div className="space-y-6">
      <PageHeader title="Mi perfil profesional" subtitle="Datos visibles para los pacientes" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — preview */}
        <SectionCard className="lg:col-span-1 self-start">
          <div className="flex flex-col items-center text-center">
            <AvatarUploader
              value={form.avatarUrl || null}
              initials={initials}
              variant="blue"
              shape="rounded"
              size="xl"
              onChange={(url) => setForm({ ...form, avatarUrl: url ?? '' })}
            />
            <h3 className="mt-3 font-semibold text-slate-800 dark:text-white">
              Dr. {form.firstName} {form.lastName}
            </h3>
            <p className="text-sm text-blue-600 font-medium">{form.specialty}</p>
            {state.data.rating > 0 && (
              <p className="text-xs text-amber-500 mt-1">★ {state.data.rating.toFixed(1)} ({state.data.reviewCount} reseñas)</p>
            )}
            <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              form.available
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {form.available ? <Eye size={10} /> : <EyeOff size={10} />}
              {form.available ? 'Visible' : 'Pausado'}
            </span>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2 text-sm text-slate-500">
            <Field icon={<Mail size={14} />}      label={user!.email} />
            {form.phone && <Field icon={<Phone size={14} />} label={form.phone} />}
            <Field icon={<Stethoscope size={14} />} label={`${form.experience || 0} años exp.`} />
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-400">Precio por consulta</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
              ${Number(form.pricePerConsult).toFixed(2)}
            </p>
          </div>
        </SectionCard>

        {/* RIGHT — editable */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Información personal">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Nombre">
                  <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </FormField>
                <FormField label="Apellidos">
                  <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </FormField>
              </div>
              <FormField label="Teléfono">
                <PhoneField
                  value={form.phone}
                  onChange={(phone) => setForm({ ...form, phone })}
                />
              </FormField>
            </div>
          </SectionCard>

          <SectionCard title="Información profesional">
            <div className="space-y-4">
              <FormField label="Especialidad *">
                <SpecialtyCombobox
                  value={form.specialty}
                  onChange={(v) => setForm({ ...form, specialty: v })}
                />
              </FormField>

              <FormField label="Años de experiencia">
                <Input type="number" min="0" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
              </FormField>
              <p className="text-xs text-slate-400 -mt-1">
                Tu número de licencia, autoridad emisora y cédula se gestionan en la sección{' '}
                <strong>Verificación de tu cuenta médica</strong>, más abajo.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Precio por consulta (USD)">
                  <Input type="number" min="0" step="0.01" value={form.pricePerConsult} onChange={(e) => setForm({ ...form, pricePerConsult: e.target.value })} />
                </FormField>
                <FormField label="Duración por consulta (min)">
                  <DurationPicker
                    value={form.consultDuration}
                    onChange={(v) => setForm({ ...form, consultDuration: v })}
                  />
                </FormField>
              </div>

              <FormField label="Idiomas (separados por coma)">
                <Input
                  placeholder="Español, Inglés, Quechua"
                  value={form.languages}
                  onChange={(e) => setForm({ ...form, languages: e.target.value })}
                />
              </FormField>

              <FormField label="Biografía">
                <textarea
                  rows={5}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Cuéntales a tus pacientes sobre tu formación, enfoque clínico y experiencia..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                />
              </FormField>
            </div>
          </SectionCard>

          {/* Verificación de licencia — bloqueante para aparecer en búsqueda */}
          <LicenseVerificationSection
            doctorId={doctorId}
            status={state.data.licenseVerificationStatus ?? 'NOT_SUBMITTED'}
            verifiedAt={state.data.licenseVerifiedAt ?? null}
            rejectionReason={state.data.licenseRejectionReason ?? null}
            uploadedAt={state.data.licenseDocumentUploadedAt ?? null}
            source={state.data.licenseVerificationSource ?? null}
            nationalId={state.data.nationalId ?? null}
            initialLicenseNumber={state.data.licenseNumber ?? ''}
            initialLicenseAuthority={state.data.licenseAuthority ?? ''}
            hasDocument={!!state.data.licenseDocumentUploadedAt}
            onChanged={refetch}
          />

          {/* Visibilidad pública */}
          <SectionCard
            title="Visibilidad en el directorio"
            subtitle="Controla si los pacientes pueden encontrarte y reservarte"
          >
            <div className="flex items-start gap-4">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                form.available
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>
                {form.available ? <Eye size={18} /> : <EyeOff size={18} />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 dark:text-white">
                  {form.available ? 'Visible y aceptando pacientes' : 'No visible · pausado'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {form.available
                    ? 'Apareces en /medicos y los pacientes pueden reservar contigo. Tus citas existentes no se ven afectadas.'
                    : 'No apareces en el directorio público y no podés recibir nuevas reservas. Tus citas ya confirmadas siguen activas.'}
                </p>
              </div>
              {togglingAvailable ? (
                <Loader2 className="animate-spin text-slate-400 mt-1" size={18} />
              ) : (
                <ToggleSwitch
                  checked={form.available}
                  onChange={toggleAvailable}
                  onLabel="Visible"
                  offLabel="Pausado"
                />
              )}
            </div>
          </SectionCard>

          {/* Ubicación del consultorio (opcional para independientes) */}
          <SectionCard
            title="Ubicación del consultorio"
            subtitle="Opcional. Sólo necesario si atendés en consultorio físico — permite que los pacientes te encuentren con filtros geográficos."
          >
            <LocationPicker value={location} onChange={setLocation} />
          </SectionCard>

          {/* Modalidades de atención */}
          <SectionCard
            title="Modalidades de atención"
            subtitle="Elige cómo quieres atender a tus pacientes"
          >
            {isFreePlan && (
              <Alert variant="info">
                <span className="text-sm">
                  Estás en <strong>{planName}</strong>. Las modalidades <strong>Presencial</strong> y <strong>Chat en vivo</strong> requieren plan Pro o superior.{' '}
                  <Link to="/doctor" className="font-semibold underline">Ir al panel →</Link>
                </span>
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <ModalityToggle
                value="ONLINE"
                form={form}
                setForm={setForm}
                icon={<Video size={18} />}
                label="Videollamada"
                description="Atiende a tus pacientes desde donde estés"
                locked={!planModules.includes('ONLINE')}
              />
              <ModalityToggle
                value="PRESENCIAL"
                form={form}
                setForm={setForm}
                icon={<Building2 size={18} />}
                label="Presencial"
                description="Recibí a los pacientes en consultorio"
                locked={!planModules.includes('PRESENCIAL')}
              />
              <ModalityToggle
                value="CHAT"
                form={form}
                setForm={setForm}
                icon={<MessageSquare size={18} />}
                label="Chat en vivo"
                description="Consulta por mensajería en tiempo real"
                locked={!planModules.includes('CHAT')}
              />
            </div>
            {form.modalities.length === 0 && (
              <p className="text-xs text-rose-600 mt-3">
                Debes habilitar al menos una modalidad para recibir reservas.
              </p>
            )}
          </SectionCard>

          {error   && <Alert variant="error">{error}</Alert>}
          {success && (
            <Alert variant="success">
              <CheckCircle2 size={14} className="inline mr-1.5" /> Perfil actualizado.
            </Alert>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving || form.modalities.length === 0}
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * DurationPicker — chips de presets típicos (15/20/30/45/60) + input
 * custom para cualquier valor desde 5 min en pasos de 5. El backend
 * usa este número para generar slots cuando un paciente busca horarios
 * disponibles del día.
 */
const DURATION_PRESETS = [15, 20, 30, 45, 60, 90];

function DurationPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const numeric = Number(value);
  const isPreset = DURATION_PRESETS.includes(numeric);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {DURATION_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(String(p))}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              numeric === p
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {p} min
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="5"
          step="5"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24"
        />
        <span className="text-xs text-slate-500">
          minutos {isPreset ? '· preset' : '· custom'}
        </span>
      </div>
      <p className="text-[11px] text-slate-400">
        Cada slot que mostramos a los pacientes durará este tiempo. Cambialo si tus consultas
        son más largas o más cortas.
      </p>
    </div>
  );
}

function Field({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-slate-400 mt-0.5">{icon}</span>
      <span className="text-slate-700 dark:text-slate-300 break-all">{label}</span>
    </div>
  );
}

/**
 * Sección "Verificación de licencia" — sube el documento, ve el estado.
 *
 * Flujo:
 *   1. Médico clickea "Subir documento" → file picker (JPG/PNG/WebP/PDF, max 5MB).
 *   2. Archivo se convierte a dataURL en el browser y se POSTea al backend.
 *   3. Backend valida, guarda, transiciona status → PENDING_REVIEW, notifica admin.
 *   4. Médico ve el badge "Pendiente de revisión".
 *   5. Admin aprueba/rechaza desde /admin/verifications → notif + email al médico.
 *   6. Si rechaza: motivo aparece acá; médico puede subir uno nuevo.
 *
 * Mientras el status no sea VERIFIED, el médico NO aparece en /medicos
 * ni puede recibir reservas. El bloqueo lo enforce el backend (svc-doctor.list
 * filtra por VERIFIED y svc-appointment.create también).
 */
const STATUS_META: Record<VerificationStatus, { label: string; icon: typeof ShieldQuestion; tone: string; help: string }> = {
  VERIFIED: {
    label: 'Verificado',
    icon:  ShieldCheck,
    tone:  'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
    help:  'Tu perfil aparece en búsqueda y podés recibir citas. Si subís un documento nuevo, el status vuelve a "pendiente" hasta que el admin lo revise de nuevo.',
  },
  PENDING_REVIEW: {
    label: 'Pendiente de revisión',
    icon:  ShieldQuestion,
    tone:  'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    help:  'Tu documento está en cola. El admin lo revisa y te avisamos por email apenas haya respuesta. Mientras tanto no aparecés en búsqueda.',
  },
  REJECTED: {
    label: 'Rechazado',
    icon:  ShieldX,
    tone:  'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
    help:  'Subí un documento corregido para que el admin lo revise nuevamente.',
  },
  NOT_SUBMITTED: {
    label: 'Sin enviar',
    icon:  ShieldAlert,
    tone:  'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300',
    help:  'Para empezar a recibir pacientes, subí una foto o PDF de tu título profesional / colegiatura.',
  },
};

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,application/pdf';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

function LicenseVerificationSection({
  doctorId, status, verifiedAt, rejectionReason, uploadedAt, source, nationalId,
  initialLicenseNumber, initialLicenseAuthority, hasDocument, onChanged,
}: {
  doctorId:       string;
  status:         VerificationStatus;
  verifiedAt:     string | null;
  rejectionReason: string | null;
  uploadedAt:     string | null;
  source:         string | null;
  nationalId:     string | null;
  initialLicenseNumber:    string;
  initialLicenseAuthority: string;
  hasDocument:    boolean;
  onChanged:      () => void;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Estado local del card — todo lo de verificación vive acá, no en el form
  // general del perfil. Un solo submit lo persiste y lo manda a revisión.
  const [licenseNumber, setLicenseNumber]       = useState(initialLicenseNumber);
  const [licenseAuthority, setLicenseAuthority] = useState(initialLicenseAuthority);
  const [cedula, setCedula]                     = useState(nationalId ?? '');
  const [file, setFile]                         = useState<File | null>(null);
  const [submitting, setSubmitting]             = useState(false);

  const isVerified = status === 'VERIFIED';

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      toast.error('El archivo supera los 5 MB. Reducí su tamaño y volvé a intentar.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(f.type)) {
      toast.error('Formato no soportado. Aceptamos JPG, PNG, WebP o PDF.');
      return;
    }
    setFile(f);
  };

  /**
   * Un solo flujo: guarda los datos + intenta verificación automática por
   * cédula (ACESS) + si no, sube el documento para revisión manual.
   */
  const handleSubmit = async () => {
    if (!licenseNumber.trim()) {
      toast.error('Ingresá tu código de certificado / licencia.');
      return;
    }
    const ced = cedula.trim();
    if (ced && ced.length !== 10) {
      toast.error('La cédula debe tener 10 dígitos.');
      return;
    }
    // Necesitamos AL MENOS un medio de verificación: cédula (para ACESS) o
    // un documento (para revisión manual). Si ya hay documento cargado de
    // antes, también vale.
    if (!ced && !file && !hasDocument) {
      toast.error('Ingresá tu cédula o subí tu documento para que podamos verificarte.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Guardar código de licencia + autoridad emisora.
      await doctorsApi.update(doctorId, {
        licenseNumber:    licenseNumber.trim() || undefined,
        licenseAuthority: licenseAuthority.trim() || undefined,
      } as Partial<DoctorDto>);

      // 2. Si hay cédula, intentar verificación automática (guarda la cédula
      //    y, si ACESS está habilitado y coincide, deja la cuenta VERIFIED).
      if (ced) {
        const res = await doctorsApi.requestVerification(doctorId, ced);
        if (res.data.autoVerified) {
          toast.success('¡Cuenta verificada automáticamente! Ya aparecés en la búsqueda.');
          setFile(null);
          onChanged();
          return;
        }
      }

      // 3. No hubo verificación automática → si subió documento, mandarlo a
      //    revisión manual (queda PENDING_REVIEW).
      if (file) {
        const dataUrl = await fileToDataUrl(file);
        await doctorsApi.uploadLicense(doctorId, dataUrl);
        toast.success('Enviado a verificación. Te avisamos por email cuando se apruebe.');
      } else if (hasDocument) {
        toast.success('Datos actualizados. Tu documento sigue en revisión.');
      } else {
        toast.info('Guardamos tus datos. Subí tu documento para que el equipo te verifique.');
      }
      setFile(null);
      onChanged();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Error al enviar la verificación.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div id="verificacion">
      <SectionCard
        title="Verificación de tu cuenta médica"
        subtitle="Completá estos datos para que validemos tu habilitación. Hasta aprobarse, tu perfil no es visible para pacientes."
      >
        {/* Estado actual */}
        <div className={`flex items-start gap-3 rounded-xl border p-4 ${meta.tone}`}>
          <Icon size={22} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{meta.label}</p>
            <p className="text-xs mt-1 opacity-90">{meta.help}</p>

            {status === 'REJECTED' && rejectionReason && (
              <div className="mt-3 p-3 bg-white/60 dark:bg-black/20 rounded-lg border border-current/20">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1">Motivo del rechazo</p>
                <p className="text-sm">{rejectionReason}</p>
              </div>
            )}
            {status === 'VERIFIED' && verifiedAt && (
              <p className="text-xs mt-2 opacity-80">
                Verificado el {new Date(verifiedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                {source === 'ACESS_AUTO' && ' · automáticamente vía ACESS'}
                {source === 'MANUAL' && ' · revisión del equipo'}.
              </p>
            )}
            {status === 'PENDING_REVIEW' && uploadedAt && (
              <p className="text-xs mt-2 opacity-80">
                Documento enviado el {new Date(uploadedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}. Estamos revisándolo.
              </p>
            )}
          </div>
        </div>

        {/* Política — cómo se aprueba */}
        <div className="mt-4">
          <PolicyPanel
            title="¿Cómo se aprueba mi cuenta?"
            icon={ShieldCheck}
            tone="blue"
            defaultOpen={status === 'NOT_SUBMITTED' || status === 'REJECTED'}
            steps={[
              <>Completá tu <strong>código de certificado / licencia</strong>, el <strong>lugar donde la obtuviste</strong> y tu <strong>cédula</strong>.</>,
              <>Subí una foto nítida o PDF de tu <strong>título o credencial de colegiatura</strong> (máx 5 MB), donde se lea tu nombre y el número.</>,
              <>Tocá <strong>Enviar a verificación</strong>. Si tu cédula coincide con el registro oficial, te aprobamos al instante; si no, queda en <strong>revisión manual</strong> (24-48h hábiles).</>,
              <>Te avisamos por <strong>email y notificación</strong>. Al aprobarse, aparecés en la búsqueda y podés recibir citas.</>,
            ]}
          >
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mientras no estés verificado, <strong>no aparecés en el directorio</strong> ni los pacientes pueden reservarte.
            </p>
          </PolicyPanel>
        </div>

        {/* Formulario unificado */}
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Código de certificado / licencia *">
              <Input
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="ej: CMP-12345"
                disabled={isVerified}
              />
            </FormField>
            <FormField label="Lugar donde obtuviste la licencia">
              <Input
                value={licenseAuthority}
                onChange={(e) => setLicenseAuthority(e.target.value)}
                placeholder="ej: MSP Ecuador, ACESS"
                disabled={isVerified}
              />
            </FormField>
          </div>

          <FormField label="Cédula (10 dígitos)">
            <Input
              value={cedula}
              onChange={(e) => setCedula(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="0102030405"
              inputMode="numeric"
              disabled={isVerified}
            />
            {!isVerified && (
              <p className="text-[11px] text-slate-400 mt-1">
                La usamos para validar tu habilitación contra el registro oficial. Si coincide, te aprobamos al instante.
              </p>
            )}
          </FormField>

          {!isVerified && (
            <FormField label="Documento (título / credencial)">
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={(e) => pickFile(e.target.files?.[0])}
                className="hidden"
              />
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition"
                >
                  <Upload size={14} />
                  {hasDocument ? 'Reemplazar documento' : 'Seleccionar documento'}
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 truncate">
                  <FileText size={12} className="flex-shrink-0" />
                  {file ? file.name : hasDocument ? 'Ya hay un documento cargado' : 'JPG, PNG, WebP o PDF · máx 5 MB'}
                </p>
              </div>
            </FormField>
          )}

          {!isVerified && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                Enviar a verificación
              </button>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

/**
 * ModalityToggle — checkbox-card hybrid for the doctor's modalities. Acts
 * like a toggle (click to add/remove) but displays as a tinted card with
 * icon + description so the doctor understands what each modality means.
 */
function ModalityToggle({
  value, form, setForm, icon, label, description, locked = false,
}: {
  value:       AppointmentModality;
  form:        { modalities: AppointmentModality[] } & Record<string, unknown>;
  setForm:     (next: { modalities: AppointmentModality[] } & Record<string, unknown>) => void;
  icon:        React.ReactNode;
  label:       string;
  description: string;
  /** Si true, el plan no incluye esta modalidad — render como upsell. */
  locked?:     boolean;
}) {
  const isOn = form.modalities.includes(value);
  const toggle = () => {
    if (locked) return;
    const next = isOn
      ? form.modalities.filter((m) => m !== value)
      : [...form.modalities, value];
    setForm({ ...form, modalities: next });
  };

  if (locked) {
    return (
      <Link
        to="/doctor"
        className="block text-left p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition group relative"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-400">
            {icon}
          </span>
          <Lock size={14} className="text-amber-500" />
        </div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-xs text-slate-400 leading-tight mt-0.5">{description}</p>
        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-2 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          Mejorar plan <ArrowRight size={10} />
        </p>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`text-left p-4 rounded-xl border-2 transition ${
        isOn
          ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/30 shadow-sm'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${
          isOn ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
        }`}>
          {icon}
        </span>
        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-2 ${
          isOn ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 dark:border-slate-600'
        }`}>
          {isOn && <CheckCircle2 size={12} strokeWidth={3} />}
        </span>
      </div>
      <p className={`text-sm font-semibold ${isOn ? 'text-teal-700 dark:text-teal-300' : 'text-slate-800 dark:text-slate-200'}`}>
        {label}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
        {description}
      </p>
    </button>
  );
}

