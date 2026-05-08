import { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { PageHeader }   from '@/components/ui/PageHeader';
import { SectionCard }  from '@/components/ui/SectionCard';
import { AvatarUploader } from '@/components/ui/AvatarUploader';
import { Input }        from '@/components/ui/Input';
import { FormField }    from '@/components/ui/FormField';
import { Button }       from '@/components/ui/Button';
import { Alert }        from '@/components/ui/Alert';
import { CountryProvinceSelect } from '@/components/ui/CountryProvinceSelect';
import { PhoneField } from '@/components/ui/PhoneField';
import { useAuth }      from '@/context/AuthContext';
import { usersApi }     from '@/lib/api';

/**
 * Patient profile — view & edit personal information.
 *
 * Reads from `useAuth().user.dto.profile` to seed the form, and PATCHes via
 * `usersApi.updateProfile(userId, fields)`. Email/role are read-only because
 * changing them implies an account-level operation we don't support yet.
 *
 * País y provincia se eligen mediante el selector compartido
 * `CountryProvinceSelect` para mantener simetría con el flujo de registro
 * y los filtros del directorio público.
 */
export function PatientProfilePage() {
  const { user } = useAuth();
  const profile = user?.dto.profile;

  const [form, setForm] = useState({
    firstName: profile?.firstName ?? '',
    lastName:  profile?.lastName  ?? '',
    phone:     profile?.phone     ?? '',
    address:   profile?.address   ?? '',
    city:      profile?.city      ?? '',
    country:   profile?.country   ?? '',
    province:  profile?.province  ?? '',
    avatarUrl: profile?.avatarUrl ?? '',
  });

  // Re-seed when the auth context finishes loading (the initial render
  // happens before the GET /auth/me round-trip resolves).
  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName ?? '',
        lastName:  profile.lastName  ?? '',
        phone:     profile.phone     ?? '',
        address:   profile.address   ?? '',
        city:      profile.city      ?? '',
        country:   profile.country   ?? '',
        province:  profile.province  ?? '',
        avatarUrl: profile.avatarUrl ?? '',
      });
    }
  }, [profile]);

  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  const initials =
    ((form.firstName?.[0] ?? '') + (form.lastName?.[0] ?? '')).toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    'U';

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await usersApi.updateProfile(user.id, {
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        phone:     form.phone.trim() || undefined,
        address:   form.address.trim() || undefined,
        city:      form.city.trim() || undefined,
        country:   form.country.trim() || undefined,
        province:  form.province.trim() || undefined,
        avatarUrl: form.avatarUrl || undefined,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo guardar el perfil';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-20 justify-center">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Mi perfil" subtitle="Edita tus datos personales" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — avatar + read-only info */}
        <SectionCard className="lg:col-span-1 self-start">
          <div className="flex flex-col items-center text-center">
            <AvatarUploader
              value={form.avatarUrl || null}
              initials={initials}
              variant="blue"
              shape="circle"
              size="xl"
              onChange={(url) => setForm({ ...form, avatarUrl: url ?? '' })}
            />
            <h3 className="mt-3 font-semibold text-slate-800 dark:text-white">
              {form.firstName || 'Sin nombre'} {form.lastName}
            </h3>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2 text-sm text-slate-500">
            <Field icon={<Mail size={14} />}    label={user.email} />
            {form.phone   && <Field icon={<Phone size={14} />}   label={form.phone}   />}
            {form.address && <Field icon={<MapPin size={14} />} label={`${form.address}${form.city ? `, ${form.city}` : ''}`} />}
          </div>
        </SectionCard>

        {/* RIGHT — editable form */}
        <SectionCard className="lg:col-span-2" title="Datos personales">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nombre">
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </FormField>
              <FormField label="Apellidos">
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </FormField>
            </div>

            <FormField label="Correo electrónico">
              <Input value={user.email} disabled />
              <p className="text-xs text-slate-400 mt-1">El correo no se puede modificar.</p>
            </FormField>

            <FormField label="Teléfono">
              <PhoneField
                value={form.phone}
                onChange={(phone) => setForm({ ...form, phone })}
              />
            </FormField>

            <FormField label="Dirección">
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Calle y número"
              />
            </FormField>

            {/* País + provincia con selector. Reemplaza los antiguos inputs
                de texto libre para mantener simetría con el resto de la app. */}
            <CountryProvinceSelect
              country={form.country}
              province={form.province}
              onChange={(loc) => setForm({
                ...form,
                country:  loc.country  ?? '',
                province: loc.province ?? '',
              })}
              size="sm"
            />

            <FormField label="Ciudad">
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </FormField>

            {error && <Alert variant="error">{error}</Alert>}
            {success && (
              <Alert variant="success">
                <CheckCircle2 size={14} className="inline mr-1.5" /> Perfil actualizado correctamente.
              </Alert>
            )}

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSave}
                disabled={saving || !form.firstName.trim() || !form.lastName.trim()}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </SectionCard>
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
