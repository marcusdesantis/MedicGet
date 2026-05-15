/**
 * Patient — Mi Perfil. Espejo del PatientProfilePage web. Permite ver y
 * editar datos personales (nombre, apellido, teléfono, dirección, ciudad,
 * país, provincia). El correo se muestra como read-only.
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  CheckCircle2,
  Loader2,
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
import { useAuth } from '@/context/AuthContext';
import { usersApi } from '@/lib/api';
import { initialsFrom } from '@/lib/format';

export default function PatientProfile() {
  const router = useRouter();
  const { user, refreshMe, logout } = useAuth();
  const profile = user?.dto.profile;

  const [form, setForm] = useState({
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    phone: profile?.phone ?? '',
    address: profile?.address ?? '',
    city: profile?.city ?? '',
    country: profile?.country ?? '',
    province: profile?.province ?? '',
    avatarUrl: profile?.avatarUrl ?? '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? '',
        address: profile.address ?? '',
        city: profile.city ?? '',
        country: profile.country ?? '',
        province: profile.province ?? '',
        avatarUrl: profile.avatarUrl ?? '',
      });
    }
  }, [profile]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initials = initialsFrom(
    form.firstName,
    form.lastName,
    user?.email?.[0]?.toUpperCase() ?? 'U',
  );

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await usersApi.updateProfile(user.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        country: form.country.trim() || undefined,
        province: form.province.trim() || undefined,
        avatarUrl: form.avatarUrl || undefined,
      });
      setSuccess(true);
      await refreshMe();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo guardar el perfil';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (!user) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title="Mi perfil" subtitle="Edita tus datos personales" />

      <View className="gap-4">
        <SectionCard>
          <View className="items-center">
            <AvatarUploader
              value={form.avatarUrl || null}
              initials={initials}
              size="xl"
              variant="blue"
              onChange={(url) => setForm({ ...form, avatarUrl: url ?? '' })}
            />
            <Text className="mt-3 text-base font-semibold text-slate-800 dark:text-white">
              {form.firstName || 'Sin nombre'} {form.lastName}
            </Text>
            <Text className="text-sm text-slate-500">{user.email}</Text>
          </View>

          <View className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 gap-2">
            <InfoRow icon={<Mail size={14} color="#94a3b8" />} text={user.email} />
            {form.phone ? (
              <InfoRow
                icon={<Phone size={14} color="#94a3b8" />}
                text={form.phone}
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

        <SectionCard title="Datos personales">
          <View className="gap-3">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField label="Nombre">
                  <Input
                    value={form.firstName}
                    onChangeText={(t) =>
                      setForm({ ...form, firstName: t })
                    }
                    placeholder="Nombre"
                  />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label="Apellidos">
                  <Input
                    value={form.lastName}
                    onChangeText={(t) => setForm({ ...form, lastName: t })}
                    placeholder="Apellidos"
                  />
                </FormField>
              </View>
            </View>

            <FormField
              label="Correo electrónico"
              hint="El correo no se puede modificar.">
              <Input value={user.email} editable={false} />
            </FormField>

            <FormField label="Teléfono">
              <Input
                value={form.phone}
                onChangeText={(t) => setForm({ ...form, phone: t })}
                placeholder="+593 9..."
                keyboardType="phone-pad"
              />
            </FormField>

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
                placeholder="Quito"
              />
            </FormField>

            {error ? <Alert variant="error">{error}</Alert> : null}
            {success ? (
              <Alert variant="success">
                <View className="flex-row items-center gap-2">
                  <CheckCircle2 size={14} color="#10b981" />
                  <Text className="text-emerald-700 dark:text-emerald-300 text-sm">
                    Perfil actualizado correctamente.
                  </Text>
                </View>
              </Alert>
            ) : null}

            <Button
              onPress={handleSave}
              disabled={
                saving || !form.firstName.trim() || !form.lastName.trim()
              }
              loading={saving}
              fullWidth>
              <View className="flex-row items-center gap-2">
                <Save size={16} color="#fff" />
                <Text className="text-white text-base font-semibold">
                  Guardar cambios
                </Text>
              </View>
            </Button>
          </View>
        </SectionCard>

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
