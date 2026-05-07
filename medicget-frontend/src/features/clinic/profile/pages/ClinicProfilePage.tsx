/**
 * /clinic/profile — datos públicos y privados de la clínica.
 *
 *  - Logo (clic para subir, redimensionado a 400x400 jpeg) → guarda en
 *    Clinic.logoUrl
 *  - Nombre comercial, descripción, teléfono, email público, sitio web
 *  - Dirección, ciudad, país (de la clínica como entidad)
 *  - Datos del representante legal (User.Profile del owner): nombre,
 *    apellido, teléfono personal
 */
import { useEffect, useState } from 'react';
import { Save, Loader2, CheckCircle2, Building2, Mail, Phone, Globe, MapPin } from 'lucide-react';
import { PageHeader }      from '@/components/ui/PageHeader';
import { SectionCard }     from '@/components/ui/SectionCard';
import { AvatarUploader }  from '@/components/ui/AvatarUploader';
import { Input }           from '@/components/ui/Input';
import { FormField }       from '@/components/ui/FormField';
import { Button }          from '@/components/ui/Button';
import { Alert }           from '@/components/ui/Alert';
import { useApi }          from '@/hooks/useApi';
import { useAuth }         from '@/context/AuthContext';
import { clinicsApi, usersApi, type ClinicDto } from '@/lib/api';

export function ClinicProfilePage() {
  const { user } = useAuth();
  const clinicId = user?.dto.clinic?.id ?? null;
  const profile  = user?.dto.profile;

  const { state, refetch } = useApi<ClinicDto>(
    () => clinicsApi.getById(clinicId!),
    [clinicId],
  );

  const [form, setForm] = useState({
    // Clinic fields
    name:        '',
    description: '',
    phone:       '',
    email:       '',
    website:     '',
    address:     '',
    city:        '',
    country:     '',
    logoUrl:     '',
    // Owner profile (for the User behind the clinic)
    ownerFirstName: profile?.firstName ?? '',
    ownerLastName:  profile?.lastName  ?? '',
    ownerPhone:     profile?.phone     ?? '',
  });

  useEffect(() => {
    if (state.status !== 'ready') return;
    const c = state.data;
    setForm((f) => ({
      ...f,
      name:        c.name        ?? '',
      description: c.description ?? '',
      phone:       c.phone       ?? '',
      email:       c.email       ?? '',
      website:     c.website     ?? '',
      address:     c.address     ?? '',
      city:        c.city        ?? '',
      country:     c.country     ?? '',
      logoUrl:     c.logoUrl     ?? '',
    }));
  }, [state.status === 'ready' ? state.data : null]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        ownerFirstName: profile.firstName ?? '',
        ownerLastName:  profile.lastName  ?? '',
        ownerPhone:     profile.phone     ?? '',
      }));
    }
  }, [profile]);

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!user || !clinicId) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await Promise.all([
        clinicsApi.update(clinicId, {
          name:        form.name.trim() || 'Mi clínica',
          description: form.description.trim() || undefined,
          phone:       form.phone.trim() || undefined,
          email:       form.email.trim() || undefined,
          website:     form.website.trim() || undefined,
          address:     form.address.trim() || undefined,
          city:        form.city.trim() || undefined,
          country:     form.country.trim() || undefined,
          logoUrl:     form.logoUrl       || undefined,
        }),
        usersApi.updateProfile(user.id, {
          firstName: form.ownerFirstName.trim(),
          lastName:  form.ownerLastName.trim(),
          phone:     form.ownerPhone.trim() || undefined,
        }),
      ]);
      setSuccess(true);
      refetch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'No se pudo guardar';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!clinicId) {
    return <Alert variant="error">No se identificó tu clínica. Volvé a iniciar sesión.</Alert>;
  }

  if (state.status === 'loading') {
    return <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="animate-spin" size={20} /></div>;
  }
  if (state.status === 'error') {
    return <Alert variant="error" action={<button onClick={refetch} className="text-sm font-medium underline">Reintentar</button>}>{state.error.message}</Alert>;
  }

  const initials = (form.name?.[0] ?? 'C').toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader title="Perfil de clínica" subtitle="Información que verán los pacientes que reserven contigo" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — preview */}
        <SectionCard className="lg:col-span-1 self-start">
          <div className="flex flex-col items-center text-center">
            <AvatarUploader
              value={form.logoUrl || null}
              initials={initials}
              variant="indigo"
              shape="rounded"
              size="xl"
              onChange={(url) => setForm({ ...form, logoUrl: url ?? '' })}
            />
            <h3 className="mt-3 font-semibold text-slate-800 dark:text-white">{form.name || 'Mi clínica'}</h3>
            {form.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-3">{form.description}</p>
            )}
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2 text-sm text-slate-500">
            {form.email   && <Row icon={<Mail size={14} />}    label={form.email} />}
            {form.phone   && <Row icon={<Phone size={14} />}   label={form.phone} />}
            {form.website && <Row icon={<Globe size={14} />}   label={form.website} />}
            {form.address && <Row icon={<MapPin size={14} />}  label={`${form.address}${form.city ? `, ${form.city}` : ''}`} />}
          </div>
        </SectionCard>

        {/* RIGHT — editable */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Información comercial">
            <div className="space-y-4">
              <FormField label="Nombre comercial *">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormField>
              <FormField label="Descripción">
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Breve presentación de tu clínica…"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </FormField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Teléfono de contacto">
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </FormField>
                <FormField label="Email público">
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </FormField>
                <FormField label="Sitio web">
                  <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" />
                </FormField>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Dirección">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Dirección">
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </FormField>
              <FormField label="Ciudad">
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </FormField>
              <FormField label="País">
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </FormField>
            </div>
          </SectionCard>

          <SectionCard title="Representante legal" subtitle="Datos privados — no se muestran a los pacientes">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Nombre">
                <Input value={form.ownerFirstName} onChange={(e) => setForm({ ...form, ownerFirstName: e.target.value })} />
              </FormField>
              <FormField label="Apellido">
                <Input value={form.ownerLastName} onChange={(e) => setForm({ ...form, ownerLastName: e.target.value })} />
              </FormField>
              <FormField label="Teléfono personal">
                <Input value={form.ownerPhone} onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })} />
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
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-slate-400 mt-0.5">{icon}</span>
      <span className="text-slate-700 dark:text-slate-300 break-all">{label}</span>
    </div>
  );
}
