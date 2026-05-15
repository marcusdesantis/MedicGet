/**
 * Clinic — Gestión de médicos. Espejo del ManageDoctorsPage web.
 *
 * Lista los médicos asociados (clinicsApi.getDoctors) con su rating /
 * reseñas / precio / experiencia, permite togglear disponibilidad y
 * abrir un modal para agregar médicos (existente o nuevo).
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Copy as CopyIcon,
  Loader2,
  Plus,
  Search,
  Stethoscope,
  UserPlus,
} from 'lucide-react-native';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { Avatar } from '@/components/ui/Avatar';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Checkbox } from '@/components/ui/Checkbox';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { useAuth } from '@/context/AuthContext';
import {
  clinicsApi,
  doctorsApi,
  type DoctorDto,
} from '@/lib/api';
import { profileInitials } from '@/lib/format';

function fullName(p?: { firstName?: string; lastName?: string }): string {
  return [p?.firstName, p?.lastName].filter(Boolean).join(' ') || '—';
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export default function ClinicDoctors() {
  const { user } = useAuth();
  const clinicId = user?.dto.clinic?.id ?? null;

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { state, refetch } = useApi(
    () => clinicsApi.getDoctors(clinicId!, { pageSize: 100 }),
    [clinicId],
  );
  useRefetchOnFocus(refetch);

  const visible = useMemo(() => {
    if (state.status !== 'ready') return [];
    const q = normalize(search.trim());
    if (!q) return state.data.data;
    return state.data.data.filter((d) => {
      const name = fullName(d.user?.profile);
      return (
        normalize(name).includes(q) || normalize(d.specialty).includes(q)
      );
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
          ?.response?.data?.error?.message ??
        'No se pudo cambiar el estado';
      setActionError(msg);
    } finally {
      setActingId(null);
    }
  };

  if (!clinicId) {
    return (
      <Screen>
        <Alert variant="error">
          No se pudo identificar tu clínica. Volvé a iniciar sesión.
        </Alert>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader
        title="Médicos"
        subtitle="Administra los especialistas de tu clínica"
        action={
          <Pressable
            onPress={() => setShowAddModal(true)}
            className="flex-row items-center gap-1.5 bg-indigo-600 active:bg-indigo-700 px-3 py-2 rounded-xl">
            <Plus size={14} color="#fff" />
            <Text className="text-white text-xs font-semibold">Añadir</Text>
          </Pressable>
        }
      />

      <View className="mb-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar médico o especialidad..."
        />
      </View>

      {actionError ? (
        <View className="mb-3">
          <Alert variant="error">{actionError}</Alert>
        </View>
      ) : null}

      {state.status === 'loading' && (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      )}

      {state.status === 'error' && (
        <Alert variant="error">{state.error.message}</Alert>
      )}

      {state.status === 'ready' &&
        (visible.length === 0 ? (
          <EmptyState
            title="Sin médicos asociados"
            description="Añadí médicos para que aparezcan en el buscador de pacientes."
            icon={Stethoscope}
            action={
              <Pressable onPress={() => setShowAddModal(true)}>
                <Text className="text-sm text-indigo-600 font-semibold">
                  + Añadir el primero
                </Text>
              </Pressable>
            }
          />
        ) : (
          <View className="gap-3">
            {visible.map((doc) => (
              <DoctorCard
                key={doc.id}
                doctor={doc}
                acting={actingId === doc.id}
                onToggle={() => toggleAvailable(doc)}
              />
            ))}
          </View>
        ))}

      {showAddModal ? (
        <AddDoctorModal
          clinicId={clinicId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            refetch();
          }}
        />
      ) : null}
    </Screen>
  );
}

function DoctorCard({
  doctor,
  acting,
  onToggle,
}: {
  doctor: DoctorDto;
  acting: boolean;
  onToggle: () => void;
}) {
  const profile = doctor.user?.profile;
  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
      <View className="flex-row items-start gap-3">
        <Avatar
          initials={profileInitials(profile, 'DR')}
          imageUrl={profile?.avatarUrl ?? null}
          size="lg"
          shape="rounded"
          variant="indigo"
        />
        <View className="flex-1 min-w-0">
          <Text
            numberOfLines={1}
            className="font-semibold text-slate-800 dark:text-white">
            Dr. {fullName(profile)}
          </Text>
          <Text
            numberOfLines={1}
            className="text-xs text-indigo-600 font-medium mt-0.5">
            {doctor.specialty}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2 mt-3">
        <Stat
          label="Rating"
          value={doctor.rating > 0 ? `★ ${doctor.rating.toFixed(1)}` : '—'}
          tint="text-amber-500"
        />
        <Stat label="Reseñas" value={String(doctor.reviewCount)} />
        <Stat
          label="Precio"
          value={
            doctor.pricePerConsult > 0
              ? `$${doctor.pricePerConsult.toFixed(0)}`
              : '—'
          }
        />
      </View>

      <View className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
        <Text className="text-xs text-slate-400">
          {doctor.experience} años exp.
        </Text>
        {acting ? (
          <ActivityIndicator size="small" color="#94a3b8" />
        ) : (
          <Pressable onPress={onToggle} className="flex-row items-center gap-2">
            <View
              className={`w-9 h-5 rounded-full p-0.5 ${
                doctor.available
                  ? 'bg-emerald-500'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}>
              <View
                className={`w-4 h-4 rounded-full bg-white ${
                  doctor.available ? 'translate-x-4' : ''
                }`}
              />
            </View>
            <Text
              className={`text-xs font-semibold ${
                doctor.available ? 'text-emerald-600' : 'text-slate-500'
              }`}>
              {doctor.available ? 'Disponible' : 'No disponible'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint?: string;
}) {
  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl py-2 items-center">
      <Text
        className={`text-sm font-bold ${
          tint ?? 'text-slate-800 dark:text-white'
        }`}>
        {value}
      </Text>
      <Text className="text-[10px] text-slate-400">{label}</Text>
    </View>
  );
}

function AddDoctorModal({
  clinicId,
  onClose,
  onAdded,
}: {
  clinicId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [tab, setTab] = useState<'existing' | 'create'>('existing');

  return (
    <Modal visible title="Añadir médico" onClose={onClose}>
      <View className="flex-row border-b border-slate-100 dark:border-slate-800 -mt-2 mb-3">
        <Pressable
          onPress={() => setTab('existing')}
          className={`flex-1 py-2 items-center border-b-2 ${
            tab === 'existing'
              ? 'border-indigo-600'
              : 'border-transparent'
          }`}>
          <Text
            className={`text-sm font-medium ${
              tab === 'existing'
                ? 'text-indigo-600'
                : 'text-slate-500'
            }`}>
            Buscar existente
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('create')}
          className={`flex-1 py-2 items-center border-b-2 ${
            tab === 'create' ? 'border-indigo-600' : 'border-transparent'
          }`}>
          <Text
            className={`text-sm font-medium ${
              tab === 'create' ? 'text-indigo-600' : 'text-slate-500'
            }`}>
            Crear nuevo
          </Text>
        </Pressable>
      </View>

      {tab === 'existing' ? (
        <ExistingTab clinicId={clinicId} onAdded={onAdded} />
      ) : (
        <CreateTab clinicId={clinicId} onAdded={onAdded} />
      )}
    </Modal>
  );
}

function ExistingTab({
  clinicId,
  onAdded,
}: {
  clinicId: string;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { state } = useApi(
    () =>
      doctorsApi.list({ search: debounced || undefined, pageSize: 20 }),
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
    <View>
      <Text className="text-xs text-slate-500 mb-3">
        Buscá un médico ya registrado y asociálo a tu clínica. Sólo se pueden
        agregar médicos <Text className="font-semibold">independientes</Text>.
      </Text>

      <View className="flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 h-11 mb-3">
        <Search size={14} color="#94a3b8" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Nombre o especialidad..."
          placeholderTextColor="#94a3b8"
          className="flex-1 ml-2 text-sm text-slate-800 dark:text-slate-100"
        />
      </View>

      {err ? (
        <View className="mb-3">
          <Alert variant="error">{err}</Alert>
        </View>
      ) : null}

      <ScrollView className="max-h-[40vh]">
        {state.status === 'loading' && (
          <View className="py-6 items-center">
            <ActivityIndicator size="small" color="#4f46e5" />
          </View>
        )}
        {state.status === 'ready' && state.data.data.length === 0 ? (
          <Text className="text-sm text-slate-400 text-center py-6">
            Sin resultados
          </Text>
        ) : null}
        {state.status === 'ready' &&
          state.data.data.map((d) => {
            const alreadyOurs = d.clinic?.id === clinicId;
            const inAnother = d.clinic && d.clinic.id !== clinicId;
            return (
              <View
                key={d.id}
                className="flex-row items-center gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <Avatar
                  initials={profileInitials(d.user?.profile, 'DR')}
                  size="sm"
                  variant="indigo"
                />
                <View className="flex-1 min-w-0">
                  <Text
                    numberOfLines={1}
                    className="text-sm font-semibold text-slate-800 dark:text-white">
                    Dr. {fullName(d.user?.profile)}
                  </Text>
                  <Text numberOfLines={1} className="text-xs text-slate-400">
                    {d.specialty}
                    {d.clinic ? ` · ${d.clinic.name}` : ' · Independiente'}
                  </Text>
                </View>
                {alreadyOurs ? (
                  <Text className="text-xs text-emerald-600 font-semibold">
                    Asociado
                  </Text>
                ) : inAnother ? (
                  <Text className="text-xs text-slate-400">En otra clínica</Text>
                ) : (
                  <Pressable
                    onPress={() => handleAdd(d.id)}
                    disabled={adding === d.id}
                    className="bg-indigo-600 active:bg-indigo-700 px-3 py-1.5 rounded-lg">
                    {adding === d.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text className="text-xs text-white font-semibold">
                        Añadir
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}
      </ScrollView>
    </View>
  );
}

interface CreateForm {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  specialty: string;
  licenseNumber: string;
  experience: string;
  pricePerConsult: string;
  bio: string;
}

const EMPTY_FORM: CreateForm = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  specialty: '',
  licenseNumber: '',
  experience: '',
  pricePerConsult: '',
  bio: '',
};

function CreateTab({
  clinicId,
  onAdded,
}: {
  clinicId: string;
  onAdded: () => void;
}) {
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    doctor: DoctorDto;
    tempPassword: string;
  } | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const valid =
    form.email.trim().length > 3 &&
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    form.specialty.trim().length > 0;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await clinicsApi.createDoctor(clinicId, {
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        specialty: form.specialty.trim(),
        licenseNumber: form.licenseNumber.trim() || undefined,
        experience: form.experience ? Number(form.experience) : undefined,
        pricePerConsult: form.pricePerConsult
          ? Number(form.pricePerConsult)
          : undefined,
        bio: form.bio.trim() || undefined,
      });
      setCreated(res.data);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo crear el médico';
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    const docProfile = created.doctor.user?.profile;
    return (
      <View>
        <Alert variant="success">
          <Text className="text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
            Médico creado exitosamente
          </Text>
          <Text className="text-emerald-700 dark:text-emerald-300 text-xs mt-1">
            Dr. {fullName(docProfile)} fue agregado a tu clínica.
          </Text>
        </Alert>
        <View className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <Text className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
            Contraseña temporal
          </Text>
          <View className="flex-row items-center justify-between mt-1">
            <Text className="text-base font-mono font-bold text-amber-800 dark:text-amber-200">
              {showPwd ? created.tempPassword : '••••••••'}
            </Text>
            <View className="flex-row gap-2">
              <Pressable onPress={() => setShowPwd((v) => !v)}>
                <Text className="text-xs text-amber-700 font-semibold">
                  {showPwd ? 'Ocultar' : 'Ver'}
                </Text>
              </Pressable>
            </View>
          </View>
          <Text className="text-[11px] text-amber-700/80 mt-2">
            Compartila con el médico. También se la enviamos por email.
          </Text>
        </View>
        <View className="mt-4 gap-2">
          <Button
            onPress={() => {
              setCreated(null);
              setForm(EMPTY_FORM);
              onAdded();
            }}
            fullWidth>
            Continuar
          </Button>
          <Pressable
            onPress={() => {
              setCreated(null);
              setForm(EMPTY_FORM);
            }}
            className="py-2 items-center">
            <Text className="text-sm text-slate-500 font-medium">
              Crear otro
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text className="text-xs text-slate-500 mb-3">
        Registrás al médico desde cero. Generamos una contraseña temporal y se
        la enviamos por email.
      </Text>

      {err ? (
        <View className="mb-3">
          <Alert variant="error">{err}</Alert>
        </View>
      ) : null}

      <View className="gap-3">
        <FormField label="Email *">
          <Input
            value={form.email}
            onChangeText={(t) => setForm({ ...form, email: t })}
            placeholder="medico@dominio.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </FormField>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField label="Nombre *">
              <Input
                value={form.firstName}
                onChangeText={(t) => setForm({ ...form, firstName: t })}
              />
            </FormField>
          </View>
          <View className="flex-1">
            <FormField label="Apellido *">
              <Input
                value={form.lastName}
                onChangeText={(t) => setForm({ ...form, lastName: t })}
              />
            </FormField>
          </View>
        </View>
        <FormField label="Teléfono">
          <Input
            value={form.phone}
            onChangeText={(t) => setForm({ ...form, phone: t })}
            keyboardType="phone-pad"
          />
        </FormField>
        <FormField label="Especialidad *">
          <Input
            value={form.specialty}
            onChangeText={(t) => setForm({ ...form, specialty: t })}
            placeholder="Cardiología, Pediatría..."
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
            <FormField label="Precio (USD)">
              <Input
                value={form.pricePerConsult}
                onChangeText={(t) =>
                  setForm({ ...form, pricePerConsult: t })
                }
                keyboardType="numeric"
              />
            </FormField>
          </View>
        </View>
        <FormField label="N° de licencia">
          <Input
            value={form.licenseNumber}
            onChangeText={(t) => setForm({ ...form, licenseNumber: t })}
          />
        </FormField>

        <Button
          onPress={submit}
          disabled={!valid || saving}
          loading={saving}
          fullWidth>
          <View className="flex-row items-center gap-2">
            <UserPlus size={15} color="#fff" />
            <Text className="text-white font-semibold">Crear médico</Text>
          </View>
        </Button>
      </View>
    </View>
  );
}
