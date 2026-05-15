/**
 * Doctor — Mi perfil. Espejo del DoctorProfilePage web.
 *
 * Persiste en paralelo:
 *   - User.Profile (firstName, lastName, phone, avatar, dirección/país)
 *   - Doctor (especialidad, experiencia, precio, duración, bio,
 *             idiomas, modalidades, disponible)
 *
 * Toggle "Disponible" guarda al instante (PATCH `available`).
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
  Eye,
  EyeOff,
  LogOut,
  MessageSquare,
  Save,
  Video,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { AvatarUploader } from '@/components/ui/AvatarUploader';
import { CountryProvinceSelect } from '@/components/ui/CountryProvinceSelect';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { initialsFrom } from '@/lib/format';
import {
  doctorsApi,
  usersApi,
  type AppointmentModality,
  type DoctorDto,
} from '@/lib/api';

const MODALITY_LABEL: Record<
  AppointmentModality,
  { label: string; icon: typeof Video; description: string }
> = {
  ONLINE: {
    label: 'Videollamada',
    icon: Video,
    description: 'Atención remota por video',
  },
  PRESENCIAL: {
    label: 'Presencial',
    icon: Building2,
    description: 'En consultorio',
  },
  CHAT: {
    label: 'Chat',
    icon: MessageSquare,
    description: 'Mensajería en vivo',
  },
};

const ALL_MODALITIES: AppointmentModality[] = ['ONLINE', 'PRESENCIAL', 'CHAT'];

export default function DoctorProfile() {
  const router = useRouter();
  const { user, refreshMe, logout } = useAuth();
  const doctorId = user?.dto.doctor?.id ?? null;

  const { state, refetch } = useApi(
    () => doctorsApi.getById(doctorId!),
    [doctorId],
  );

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    avatarUrl: '',
    country: '',
    province: '',
    city: '',
    address: '',
    specialty: '',
    licenseNumber: '',
    experience: '',
    pricePerConsult: '',
    consultDuration: '',
    bio: '',
    languages: '',
    modalities: ['ONLINE'] as AppointmentModality[],
    available: true,
  });

  useEffect(() => {
    if (state.status !== 'ready') return;
    const d = state.data;
    const profile = d.user?.profile;
    setForm({
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      phone: profile?.phone ?? '',
      avatarUrl: profile?.avatarUrl ?? '',
      country: profile?.country ?? '',
      province: profile?.province ?? '',
      city: profile?.city ?? '',
      address: profile?.address ?? '',
      specialty: d.specialty,
      licenseNumber: d.licenseNumber ?? '',
      experience: String(d.experience ?? 0),
      pricePerConsult: String(d.pricePerConsult ?? 0),
      consultDuration: String(d.consultDuration ?? 30),
      bio: d.bio ?? '',
      languages: (d.languages ?? []).join(', '),
      modalities:
        d.modalities && d.modalities.length > 0 ? d.modalities : ['ONLINE'],
      available: d.available ?? true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status === 'ready' ? state.data : null]);

  const [saving, setSaving] = useState(false);
  const [togglingAvailable, setTogglingAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initials = initialsFrom(
    form.firstName,
    form.lastName,
    user?.email?.[0]?.toUpperCase() ?? 'D',
  );

  const toggleAvailable = async () => {
    if (!doctorId || togglingAvailable) return;
    const next = !form.available;
    setTogglingAvailable(true);
    try {
      await doctorsApi.update(doctorId, {
        available: next,
      } as Partial<DoctorDto>);
      setForm((f) => ({ ...f, available: next }));
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
        'No se pudo cambiar la visibilidad';
      setError(msg);
    } finally {
      setTogglingAvailable(false);
    }
  };

  const toggleModality = (m: AppointmentModality) => {
    setForm((f) => {
      const has = f.modalities.includes(m);
      const next = has
        ? f.modalities.filter((x) => x !== m)
        : [...f.modalities, m];
      // El backend exige al menos una modalidad.
      if (next.length === 0) return f;
      return { ...f, modalities: next };
    });
  };

  const handleSave = async () => {
    if (!user || !doctorId) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await Promise.all([
        usersApi.updateProfile(user.id, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
          avatarUrl: form.avatarUrl || undefined,
          country: form.country.trim() || undefined,
          province: form.province.trim() || undefined,
          city: form.city.trim() || undefined,
          address: form.address.trim() || undefined,
        }),
        doctorsApi.update(doctorId, {
          specialty: form.specialty.trim() || 'Médico General',
          licenseNumber: form.licenseNumber.trim() || undefined,
          experience: Number(form.experience) || 0,
          pricePerConsult: Number(form.pricePerConsult) || 0,
          consultDuration: Number(form.consultDuration) || 30,
          bio: form.bio.trim() || undefined,
          languages: form.languages
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean),
          modalities: form.modalities,
        } as Partial<DoctorDto>),
      ]);
      setSuccess(true);
      await refreshMe();
      refetch();
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

  if (!doctorId) {
    return (
      <Screen>
        <Alert variant="warning">
          No encontramos tu perfil de médico. Completá primero tu registro.
        </Alert>
      </Screen>
    );
  }

  if (state.status === 'loading') {
    return (
      <Screen>
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#0d9488" />
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

  return (
    <Screen>
      <PageHeader title="Mi perfil" subtitle="Datos personales y profesionales" />

      <View className="gap-4">
        <SectionCard>
          <View className="items-center">
            <AvatarUploader
              value={form.avatarUrl || null}
              initials={initials}
              size="xl"
              variant="emerald"
              onChange={(url) => setForm({ ...form, avatarUrl: url ?? '' })}
            />
            <Text className="mt-3 text-base font-semibold text-slate-800 dark:text-white">
              Dr. {form.firstName || 'Sin nombre'} {form.lastName}
            </Text>
            <Text className="text-sm text-teal-600 font-medium mt-0.5">
              {form.specialty || 'Médico general'}
            </Text>
            <Text className="text-xs text-slate-500 mt-1">{user?.email}</Text>
          </View>

          <View className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Pressable
              onPress={toggleAvailable}
              disabled={togglingAvailable}
              className={`flex-row items-center justify-between p-3 rounded-xl ${
                form.available
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}>
              <View className="flex-row items-center gap-2 flex-1">
                {form.available ? (
                  <Eye size={16} color="#10b981" />
                ) : (
                  <EyeOff size={16} color="#64748b" />
                )}
                <View className="flex-1">
                  <Text
                    className={`text-sm font-semibold ${
                      form.available
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}>
                    {form.available ? 'Visible en el directorio' : 'No visible'}
                  </Text>
                  <Text className="text-[11px] text-slate-500 mt-0.5">
                    {form.available
                      ? 'Los pacientes pueden encontrarte y reservar.'
                      : 'Estás oculto del buscador y no recibís reservas nuevas.'}
                  </Text>
                </View>
              </View>
              {togglingAvailable ? (
                <ActivityIndicator size="small" color="#0d9488" />
              ) : null}
            </Pressable>
          </View>
        </SectionCard>

        <SectionCard title="Datos personales">
          <View className="gap-3">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField label="Nombre">
                  <Input
                    value={form.firstName}
                    onChangeText={(t) => setForm({ ...form, firstName: t })}
                  />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label="Apellidos">
                  <Input
                    value={form.lastName}
                    onChangeText={(t) => setForm({ ...form, lastName: t })}
                  />
                </FormField>
              </View>
            </View>

            <FormField label="Correo">
              <Input value={user?.email ?? ''} editable={false} />
            </FormField>

            <FormField label="Teléfono">
              <Input
                value={form.phone}
                onChangeText={(t) => setForm({ ...form, phone: t })}
                placeholder="+593..."
                keyboardType="phone-pad"
              />
            </FormField>

            <FormField label="Dirección del consultorio">
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
          </View>
        </SectionCard>

        <SectionCard title="Datos profesionales">
          <View className="gap-3">
            <FormField label="Especialidad">
              <Input
                value={form.specialty}
                onChangeText={(t) => setForm({ ...form, specialty: t })}
                placeholder="Cardiología, Pediatría..."
              />
            </FormField>

            <FormField label="N° de licencia / Cédula profesional">
              <Input
                value={form.licenseNumber}
                onChangeText={(t) => setForm({ ...form, licenseNumber: t })}
              />
            </FormField>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField label="Experiencia (años)">
                  <Input
                    value={form.experience}
                    onChangeText={(t) => setForm({ ...form, experience: t })}
                    keyboardType="numeric"
                  />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label="Duración consulta (min)">
                  <Input
                    value={form.consultDuration}
                    onChangeText={(t) =>
                      setForm({ ...form, consultDuration: t })
                    }
                    keyboardType="numeric"
                  />
                </FormField>
              </View>
            </View>

            <FormField label="Precio por consulta (USD)">
              <Input
                value={form.pricePerConsult}
                onChangeText={(t) => setForm({ ...form, pricePerConsult: t })}
                keyboardType="numeric"
              />
            </FormField>

            <FormField
              label="Idiomas"
              hint="Separados por coma (Ej: Español, Inglés)">
              <Input
                value={form.languages}
                onChangeText={(t) => setForm({ ...form, languages: t })}
                placeholder="Español, Inglés"
              />
            </FormField>

            <FormField label="Biografía">
              <TextInput
                value={form.bio}
                onChangeText={(t) => setForm({ ...form, bio: t })}
                multiline
                numberOfLines={4}
                placeholder="Contale a tus pacientes sobre vos..."
                placeholderTextColor="#94a3b8"
                textAlignVertical="top"
                className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 min-h-[96px]"
              />
            </FormField>
          </View>
        </SectionCard>

        <SectionCard
          title="Modalidades de atención"
          subtitle="Marcá las modalidades que aceptás. Al menos una.">
          <View className="gap-2">
            {ALL_MODALITIES.map((m) => {
              const meta = MODALITY_LABEL[m];
              const Icon = meta.icon;
              const checked = form.modalities.includes(m);
              return (
                <Pressable
                  key={m}
                  onPress={() => toggleModality(m)}
                  className={`flex-row items-center gap-3 p-3 rounded-xl border ${
                    checked
                      ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-300 dark:border-teal-700'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}>
                  <Checkbox checked={checked} onChange={() => toggleModality(m)} />
                  <View
                    className={`w-9 h-9 rounded-lg items-center justify-center ${
                      checked
                        ? 'bg-teal-600'
                        : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                    <Icon size={16} color={checked ? '#fff' : '#475569'} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-sm font-semibold ${
                        checked
                          ? 'text-teal-700 dark:text-teal-300'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}>
                      {meta.label}
                    </Text>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      {meta.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

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
          disabled={saving || !form.firstName.trim() || !form.lastName.trim()}
          loading={saving}
          variant="success"
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
