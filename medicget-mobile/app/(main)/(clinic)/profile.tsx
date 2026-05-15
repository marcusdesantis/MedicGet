/**
 * Clinic — Perfil. Espejo del ClinicProfilePage web.
 *
 * Edita en paralelo los datos comerciales de la clínica (Clinic) + los
 * del representante legal (User.Profile).
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Building2,
  CheckCircle2,
  Globe,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { AvatarUploader } from '@/components/ui/AvatarUploader';
import { CountryProvinceSelect } from '@/components/ui/CountryProvinceSelect';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { clinicsApi, usersApi } from '@/lib/api';

export default function ClinicProfile() {
  const router = useRouter();
  const { user, refreshMe, logout } = useAuth();
  const clinicId = user?.dto.clinic?.id ?? null;
  const profile = user?.dto.profile;

  const { state, refetch } = useApi(
    () => clinicsApi.getById(clinicId!),
    [clinicId],
  );

  const [form, setForm] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    country: '',
    province: '',
    logoUrl: '',
    ownerFirstName: profile?.firstName ?? '',
    ownerLastName: profile?.lastName ?? '',
    ownerPhone: profile?.phone ?? '',
  });

  useEffect(() => {
    if (state.status !== 'ready') return;
    const c = state.data;
    setForm((f) => ({
      ...f,
      name: c.name ?? '',
      description: c.description ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      website: c.website ?? '',
      address: c.address ?? '',
      city: c.city ?? '',
      country: c.country ?? '',
      province: c.province ?? '',
      logoUrl: c.logoUrl ?? '',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status === 'ready' ? state.data : null]);

  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        ownerFirstName: profile.firstName ?? '',
        ownerLastName: profile.lastName ?? '',
        ownerPhone: profile.phone ?? '',
      }));
    }
  }, [profile]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!user || !clinicId) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await Promise.all([
        clinicsApi.update(clinicId, {
          name: form.name.trim() || 'Mi clínica',
          description: form.description.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          website: form.website.trim() || undefined,
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          province: form.province.trim() || undefined,
          country: form.country.trim() || undefined,
          logoUrl: form.logoUrl || undefined,
        }),
        usersApi.updateProfile(user.id, {
          firstName: form.ownerFirstName.trim(),
          lastName: form.ownerLastName.trim(),
          phone: form.ownerPhone.trim() || undefined,
        }),
      ]);
      setSuccess(true);
      await refreshMe();
      refetch();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo guardar';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (!clinicId) {
    return (
      <Screen>
        <Alert variant="error">
          No se identificó tu clínica. Volvé a iniciar sesión.
        </Alert>
      </Screen>
    );
  }

  if (state.status === 'loading') {
    return (
      <Screen>
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen>
        <Alert variant="error">{state.error.message}</Alert>
      </Screen>
    );
  }

  const initials = (form.name?.[0] ?? 'C').toUpperCase();

  return (
    <Screen>
      <PageHeader
        title="Perfil de clínica"
        subtitle="Información que verán los pacientes que reserven contigo"
      />

      <View className="gap-4">
        <SectionCard>
          <View className="items-center">
            <AvatarUploader
              value={form.logoUrl || null}
              initials={initials}
              size="xl"
              shape="rounded"
              variant="indigo"
              onChange={(url) => setForm({ ...form, logoUrl: url ?? '' })}
            />
            <Text className="mt-3 font-semibold text-slate-800 dark:text-white">
              {form.name || 'Mi clínica'}
            </Text>
            {form.description ? (
              <Text
                numberOfLines={2}
                className="text-sm text-slate-500 dark:text-slate-400 text-center mt-1">
                {form.description}
              </Text>
            ) : null}
          </View>

          <View className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 gap-2">
            {form.email ? (
              <InfoRow icon={<Mail size={14} color="#94a3b8" />} text={form.email} />
            ) : null}
            {form.phone ? (
              <InfoRow icon={<Phone size={14} color="#94a3b8" />} text={form.phone} />
            ) : null}
            {form.website ? (
              <InfoRow
                icon={<Globe size={14} color="#94a3b8" />}
                text={form.website}
              />
            ) : null}
            {form.address ? (
              <InfoRow
                icon={<MapPin size={14} color="#94a3b8" />}
                text={`${form.address}${form.city ? `, ${form.city}` : ''}`}
              />
            ) : null}
          </View>
        </SectionCard>

        <SectionCard title="Información comercial">
          <View className="gap-3">
            <FormField label="Nombre comercial *">
              <Input
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
              />
            </FormField>
            <FormField label="Descripción">
              <TextInput
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
                multiline
                numberOfLines={3}
                placeholder="Breve presentación de tu clínica..."
                placeholderTextColor="#94a3b8"
                textAlignVertical="top"
                className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 min-h-[80px]"
              />
            </FormField>
            <FormField label="Teléfono de contacto">
              <Input
                value={form.phone}
                onChangeText={(t) => setForm({ ...form, phone: t })}
                keyboardType="phone-pad"
              />
            </FormField>
            <FormField label="Email público">
              <Input
                value={form.email}
                onChangeText={(t) => setForm({ ...form, email: t })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </FormField>
            <FormField label="Sitio web">
              <Input
                value={form.website}
                onChangeText={(t) => setForm({ ...form, website: t })}
                placeholder="https://..."
                autoCapitalize="none"
              />
            </FormField>
          </View>
        </SectionCard>

        <SectionCard
          title="Ubicación"
          subtitle="Datos que aparecen en el directorio público">
          <View className="gap-3">
            <FormField label="Dirección">
              <Input
                value={form.address}
                onChangeText={(t) => setForm({ ...form, address: t })}
                placeholder="Calle y número"
              />
            </FormField>
            <CountryProvinceSelect
              country={form.country}
              province={form.province}
              onChange={(loc) =>
                setForm({
                  ...form,
                  country: loc.country ?? '',
                  province: loc.province ?? '',
                })
              }
            />
            <FormField label="Ciudad">
              <Input
                value={form.city}
                onChangeText={(t) => setForm({ ...form, city: t })}
              />
            </FormField>
          </View>
        </SectionCard>

        <SectionCard
          title="Representante legal"
          subtitle="Datos privados — no se muestran a los pacientes">
          <View className="gap-3">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField label="Nombre">
                  <Input
                    value={form.ownerFirstName}
                    onChangeText={(t) =>
                      setForm({ ...form, ownerFirstName: t })
                    }
                  />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label="Apellido">
                  <Input
                    value={form.ownerLastName}
                    onChangeText={(t) =>
                      setForm({ ...form, ownerLastName: t })
                    }
                  />
                </FormField>
              </View>
            </View>
            <FormField label="Teléfono personal">
              <Input
                value={form.ownerPhone}
                onChangeText={(t) => setForm({ ...form, ownerPhone: t })}
                keyboardType="phone-pad"
              />
            </FormField>
          </View>
        </SectionCard>

        {error ? <Alert variant="error">{error}</Alert> : null}
        {success ? (
          <Alert variant="success">
            <View className="flex-row items-center gap-2">
              <CheckCircle2 size={14} color="#10b981" />
              <Text className="text-emerald-700 dark:text-emerald-300 text-sm">
                Perfil actualizado.
              </Text>
            </View>
          </Alert>
        ) : null}

        <Button
          onPress={handleSave}
          disabled={saving || !form.name.trim()}
          loading={saving}
          fullWidth>
          <View className="flex-row items-center gap-2">
            <Save size={16} color="#fff" />
            <Text className="text-white text-base font-semibold">
              Guardar cambios
            </Text>
          </View>
        </Button>

        <Pressable
          onPress={onLogout}
          className="flex-row items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-2xl py-3 active:bg-rose-50">
          <LogOut size={16} color="#e11d48" />
          <Text className="text-rose-600 text-sm font-semibold">
            Cerrar sesión
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      {icon}
      <Text className="text-sm text-slate-700 dark:text-slate-300 flex-1">
        {text}
      </Text>
    </View>
  );
}
