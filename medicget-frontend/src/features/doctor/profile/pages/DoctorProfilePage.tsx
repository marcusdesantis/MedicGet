import { useEffect, useState } from 'react';
import { Save, Loader2, CheckCircle2, Stethoscope, Mail, Phone } from 'lucide-react';
import { PageHeader }   from '@/components/ui/PageHeader';
import { SectionCard }  from '@/components/ui/SectionCard';
import { Avatar }       from '@/components/ui/Avatar';
import { Input }        from '@/components/ui/Input';
import { FormField }    from '@/components/ui/FormField';
import { Button }       from '@/components/ui/Button';
import { Alert }        from '@/components/ui/Alert';
import { AutocompleteSelect } from '@/components/ui/AutocompleteSelect';
import { useAuth }      from '@/context/AuthContext';
import { useApi }       from '@/hooks/useApi';
import { doctorsApi, usersApi, type DoctorDto } from '@/lib/api';
import { specialties as SPECIALTY_OPTIONS } from '@/features/auth/register/data/specialties';

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

  const [form, setForm] = useState({
    // Profile fields
    firstName: '',
    lastName:  '',
    phone:     '',
    // Doctor fields
    specialty:       '',
    licenseNumber:   '',
    experience:      '',
    pricePerConsult: '',
    consultDuration: '',
    bio:             '',
    languages:       '', // comma-separated string in form, array on backend
  });

  // Hydrate the form from the API once.
  useEffect(() => {
    if (state.status !== 'ready') return;
    const d = state.data;
    const profile = d.user?.profile;
    setForm({
      firstName:       profile?.firstName ?? '',
      lastName:        profile?.lastName  ?? '',
      phone:           profile?.phone     ?? '',
      specialty:       d.specialty,
      licenseNumber:   d.licenseNumber ?? '',
      experience:      String(d.experience ?? 0),
      pricePerConsult: String(d.pricePerConsult ?? 0),
      consultDuration: String(d.consultDuration ?? 30),
      bio:             d.bio ?? '',
      languages:       fmtLanguages(d.languages),
    });
  }, [state.status === 'ready' ? state.data : null]); // eslint-disable-line react-hooks/exhaustive-deps

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        }),
        // Doctor row
        doctorsApi.update(doctorId, {
          specialty:       form.specialty.trim() || 'Médico General',
          licenseNumber:   form.licenseNumber.trim() || undefined,
          experience:      Number(form.experience)      || 0,
          pricePerConsult: Number(form.pricePerConsult) || 0,
          consultDuration: Number(form.consultDuration) || 30,
          bio:             form.bio.trim() || undefined,
          languages:       parseLanguages(form.languages),
        }),
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
            <Avatar initials={initials} size="lg" shape="rounded" variant="blue" />
            <h3 className="mt-3 font-semibold text-slate-800 dark:text-white">
              Dr. {form.firstName} {form.lastName}
            </h3>
            <p className="text-sm text-blue-600 font-medium">{form.specialty}</p>
            {state.data.rating > 0 && (
              <p className="text-xs text-amber-500 mt-1">★ {state.data.rating.toFixed(1)} ({state.data.reviewCount} reseñas)</p>
            )}
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
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </FormField>
            </div>
          </SectionCard>

          <SectionCard title="Información profesional">
            <div className="space-y-4">
              <FormField label="Especialidad *">
                <AutocompleteSelect
                  options={SPECIALTY_OPTIONS}
                  value={form.specialty}
                  onChange={(v) => setForm({ ...form, specialty: v })}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Número de licencia / colegiatura">
                  <Input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
                </FormField>
                <FormField label="Años de experiencia">
                  <Input type="number" min="0" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Precio por consulta (USD)">
                  <Input type="number" min="0" step="0.01" value={form.pricePerConsult} onChange={(e) => setForm({ ...form, pricePerConsult: e.target.value })} />
                </FormField>
                <FormField label="Duración por consulta (min)">
                  <Input type="number" min="5" step="5" value={form.consultDuration} onChange={(e) => setForm({ ...form, consultDuration: e.target.value })} />
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

          {error   && <Alert variant="error">{error}</Alert>}
          {success && (
            <Alert variant="success">
              <CheckCircle2 size={14} className="inline mr-1.5" /> Perfil actualizado.
            </Alert>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
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

function Field({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-slate-400 mt-0.5">{icon}</span>
      <span className="text-slate-700 dark:text-slate-300 break-all">{label}</span>
    </div>
  );
}
