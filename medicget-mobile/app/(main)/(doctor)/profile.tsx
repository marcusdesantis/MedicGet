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
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  Images,
  LogOut,
  MessageSquare,
  Save,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  ShieldX,
  Trash2,
  Video,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { PolicyPanel } from '@/components/ui/PolicyPanel';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PhoneField } from '@/components/ui/PhoneField';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { AvatarUploader } from '@/components/ui/AvatarUploader';
import { CountryProvinceSelect } from '@/components/ui/CountryProvinceSelect';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { initialsFrom } from '@/lib/format';
import { DeleteAccountSheet } from '@/components/ui/DeleteAccountSheet';
import {
  doctorsApi,
  usersApi,
  type AppointmentModality,
  type DoctorDto,
  type VerificationStatus,
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
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);

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
          // licenseNumber / licenseAuthority / nationalId se guardan desde el
          // card "Verificación de tu cuenta", no acá.
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
              <PhoneField
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
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

            <Text className="text-[11px] text-slate-400">
              Tu número de licencia, autoridad emisora y cédula se gestionan en
              la sección <Text className="font-semibold">Verificación de tu cuenta</Text>, más abajo.
            </Text>

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

        {state.status === 'ready' ? (
          <DoctorVerificationCard
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
            onChanged={() => {
              refetch();
              void refreshMe();
            }}
          />
        ) : null}

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

        <Pressable
          onPress={() => setShowDeleteSheet(true)}
          className="flex-row items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-2xl py-3 active:bg-rose-50">
          <Trash2 size={16} color="#e11d48" />
          <Text className="text-rose-600 text-sm font-semibold">
            Eliminar cuenta
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/eliminar-cuenta')}
          className="items-center py-1">
          <Text className="text-xs text-slate-400 dark:text-slate-500 underline">
            Conocé más sobre la eliminación de cuenta
          </Text>
        </Pressable>

        <DeleteAccountSheet
          visible={showDeleteSheet}
          onClose={() => setShowDeleteSheet(false)}
        />
      </View>
    </Screen>
  );
}

/* ─── Verificación de licencia ──────────────────────────────────────────── */

const VERIF_META: Record<
  VerificationStatus,
  { label: string; help: string; wrap: string; text: string; iconColor: string; Icon: typeof ShieldCheck }
> = {
  VERIFIED: {
    label: 'Verificado',
    help: 'Tu perfil aparece en la búsqueda y podés recibir citas.',
    wrap: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    iconColor: '#047857',
    Icon: ShieldCheck,
  },
  PENDING_REVIEW: {
    label: 'Pendiente de revisión',
    help: 'Tu documento está en cola. Te avisamos por email apenas se revise.',
    wrap: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    iconColor: '#b45309',
    Icon: ShieldQuestion,
  },
  REJECTED: {
    label: 'Rechazado',
    help: 'Subí un documento corregido para que el admin lo revise de nuevo.',
    wrap: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-300',
    iconColor: '#e11d48',
    Icon: ShieldX,
  },
  NOT_SUBMITTED: {
    label: 'Sin verificar',
    help: 'Completá tus datos y verificá tu cuenta para empezar a recibir pacientes.',
    wrap: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    text: 'text-slate-700 dark:text-slate-300',
    iconColor: '#475569',
    Icon: ShieldAlert,
  },
};

function DoctorVerificationCard({
  doctorId,
  status,
  verifiedAt,
  rejectionReason,
  uploadedAt,
  source,
  nationalId,
  initialLicenseNumber,
  initialLicenseAuthority,
  hasDocument,
  onChanged,
}: {
  doctorId: string;
  status: VerificationStatus;
  verifiedAt: string | null;
  rejectionReason: string | null;
  uploadedAt: string | null;
  source: string | null;
  nationalId: string | null;
  initialLicenseNumber: string;
  initialLicenseAuthority: string;
  hasDocument: boolean;
  onChanged: () => void;
}) {
  const meta = VERIF_META[status];
  const Icon = meta.Icon;
  const isVerified = status === 'VERIFIED';

  const [licenseNumber, setLicenseNumber] = useState(initialLicenseNumber);
  const [licenseAuthority, setLicenseAuthority] = useState(initialLicenseAuthority);
  const [cedula, setCedula] = useState(nationalId ?? '');
  const [pickedDataUrl, setPickedDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const pickFrom = async (mode: 'camera' | 'library') => {
    setError(null);
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.6,
      allowsEditing: false,
    };
    const perm =
      mode === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Necesitamos permiso para acceder a la cámara/galería.');
      return;
    }
    const res =
      mode === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.[0]?.base64) return;
    const asset = res.assets[0];
    const mime = asset.mimeType ?? 'image/jpeg';
    setPickedDataUrl(`data:${mime};base64,${asset.base64}`);
  };

  const handleSubmit = async () => {
    setError(null);
    setInfo(null);
    if (!licenseNumber.trim()) {
      setError('Ingresá tu código de certificado / licencia.');
      return;
    }
    const ced = cedula.trim();
    if (ced && ced.length !== 10) {
      setError('La cédula debe tener 10 dígitos.');
      return;
    }
    if (!ced && !pickedDataUrl && !hasDocument) {
      setError('Ingresá tu cédula o subí una foto del documento.');
      return;
    }
    setSubmitting(true);
    try {
      await doctorsApi.update(doctorId, {
        licenseNumber: licenseNumber.trim() || undefined,
        licenseAuthority: licenseAuthority.trim() || undefined,
      } as Partial<DoctorDto>);

      if (ced) {
        const res = await doctorsApi.requestVerification(doctorId, ced);
        if (res.data.autoVerified) {
          setInfo('¡Cuenta verificada automáticamente! Ya aparecés en la búsqueda.');
          setPickedDataUrl(null);
          onChanged();
          return;
        }
      }

      if (pickedDataUrl) {
        await doctorsApi.uploadLicense(doctorId, pickedDataUrl);
        setInfo('Enviado a verificación. Te avisamos por email cuando se apruebe.');
      } else if (hasDocument) {
        setInfo('Datos actualizados. Tu documento sigue en revisión.');
      } else {
        setInfo('Guardamos tus datos. Subí tu documento para que te verifiquemos.');
      }
      setPickedDataUrl(null);
      onChanged();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Error al enviar la verificación.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SectionCard
      title="Verificación de tu cuenta"
      subtitle="Validamos tu habilitación. Hasta aprobarse, no aparecés para pacientes.">
      <View className="gap-3">
        {/* Estado actual */}
        <View className={`flex-row items-start gap-3 rounded-xl border p-3 ${meta.wrap}`}>
          <Icon size={20} color={meta.iconColor} />
          <View className="flex-1">
            <Text className={`text-sm font-semibold ${meta.text}`}>{meta.label}</Text>
            <Text className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-5">
              {meta.help}
            </Text>
            {status === 'REJECTED' && rejectionReason ? (
              <View className="mt-2 bg-white/60 dark:bg-black/20 rounded-lg p-2">
                <Text className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 mb-0.5">
                  Motivo del rechazo
                </Text>
                <Text className="text-xs text-rose-700 dark:text-rose-200">{rejectionReason}</Text>
              </View>
            ) : null}
            {isVerified && verifiedAt ? (
              <Text className="text-[11px] text-slate-500 mt-1">
                Verificado el {new Date(verifiedAt).toLocaleDateString('es-ES')}
                {source === 'ACESS_AUTO' ? ' · automático vía ACESS' : source === 'MANUAL' ? ' · revisión del equipo' : ''}.
              </Text>
            ) : null}
            {status === 'PENDING_REVIEW' && uploadedAt ? (
              <Text className="text-[11px] text-slate-500 mt-1">
                Documento enviado el {new Date(uploadedAt).toLocaleDateString('es-ES')}.
              </Text>
            ) : null}
          </View>
        </View>

        <PolicyPanel
          title="¿Cómo se aprueba mi cuenta?"
          icon={ShieldCheck}
          tone="blue"
          defaultOpen={status === 'NOT_SUBMITTED' || status === 'REJECTED'}
          steps={[
            'Completá tu código de certificado / licencia, el lugar donde la obtuviste y tu cédula.',
            'Subí una foto nítida de tu título o credencial de colegiatura, donde se lea tu nombre y el número.',
            'Tocá Enviar a verificación. Si tu cédula coincide con el registro oficial te aprobamos al instante; si no, queda en revisión manual (24-48h).',
            'Te avisamos por email y notificación. Al aprobarse, aparecés en la búsqueda y recibís citas.',
          ]}
        />

        {!isVerified ? (
          <>
            <FormField label="Código de certificado / licencia *">
              <Input value={licenseNumber} onChangeText={setLicenseNumber} placeholder="ej: CMP-12345" />
            </FormField>
            <FormField label="Lugar donde obtuviste la licencia">
              <Input
                value={licenseAuthority}
                onChangeText={setLicenseAuthority}
                placeholder="ej: MSP Ecuador, ACESS"
              />
            </FormField>
            <FormField label="Cédula (10 dígitos)" hint="Si coincide con el registro oficial, te aprobamos al instante.">
              <Input
                value={cedula}
                onChangeText={(t) => setCedula(t.replace(/\D/g, '').slice(0, 10))}
                keyboardType="numeric"
                placeholder="0102030405"
              />
            </FormField>

            <View>
              <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Documento (foto del título / credencial)
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => pickFrom('camera')}
                  className="flex-1 flex-row items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 active:bg-slate-50">
                  <Camera size={15} color="#475569" />
                  <Text className="text-slate-700 dark:text-slate-200 text-xs font-semibold">
                    Tomar foto
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => pickFrom('library')}
                  className="flex-1 flex-row items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 active:bg-slate-50">
                  <Images size={15} color="#475569" />
                  <Text className="text-slate-700 dark:text-slate-200 text-xs font-semibold">
                    Elegir de galería
                  </Text>
                </Pressable>
              </View>
              <Text className="text-[11px] text-slate-400 mt-1">
                {pickedDataUrl
                  ? '✓ Documento listo para enviar'
                  : hasDocument
                  ? 'Ya hay un documento cargado'
                  : 'JPG / PNG · máx 5 MB'}
              </Text>
            </View>

            {error ? <Alert variant="error">{error}</Alert> : null}
            {info ? <Alert variant="success">{info}</Alert> : null}

            <Button onPress={handleSubmit} loading={submitting} variant="success" fullWidth>
              <View className="flex-row items-center gap-2">
                <ShieldCheck size={16} color="#fff" />
                <Text className="text-white text-base font-semibold">Enviar a verificación</Text>
              </View>
            </Button>
          </>
        ) : info ? (
          <Alert variant="success">{info}</Alert>
        ) : null}
      </View>
    </SectionCard>
  );
}
