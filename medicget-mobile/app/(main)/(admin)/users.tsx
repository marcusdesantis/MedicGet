/**
 * Admin — Usuarios. Espejo del AdminUsersPage web.
 *
 * Lista con filtros (rol + búsqueda), acciones por row (impersonar,
 * suspender / reactivar, eliminar, editar) + modal de crear.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Ban,
  Copy as CopyIcon,
  Edit3,
  Eye,
  EyeOff,
  LogIn,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionCard } from '@/components/ui/SectionCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { tokenStorage } from '@/lib/storage';
import { setAuthToken } from '@/services/http';
import { useAuth } from '@/context/AuthContext';
import { profileInitials } from '@/lib/format';
import {
  adminApi,
  type AdminUserPatch,
  type UserDto,
} from '@/lib/api';

const ROLE_LABEL: Record<string, string> = {
  PATIENT: 'Paciente',
  DOCTOR: 'Médico',
  CLINIC: 'Clínica',
  ADMIN: 'Admin',
};

const ROLE_BG: Record<string, string> = {
  PATIENT: 'bg-indigo-100 dark:bg-indigo-900/40',
  DOCTOR: 'bg-teal-100 dark:bg-teal-900/40',
  CLINIC: 'bg-purple-100 dark:bg-purple-900/40',
  ADMIN: 'bg-rose-100 dark:bg-rose-900/40',
};

const ROLE_TEXT: Record<string, string> = {
  PATIENT: 'text-indigo-700 dark:text-indigo-300',
  DOCTOR: 'text-teal-700 dark:text-teal-300',
  CLINIC: 'text-purple-700 dark:text-purple-300',
  ADMIN: 'text-rose-700 dark:text-rose-300',
};

const STATUS_MAP = {
  active: {
    label: 'Activo',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  inactive: {
    label: 'Suspendido',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
  },
  deleted: {
    label: 'Eliminado',
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-300',
  },
  pending_verification: {
    label: 'Sin verificar',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-300',
  },
};

const ROLE_TABS = ['Todos', 'Pacientes', 'Médicos', 'Clínicas', 'Admins'] as const;
type RoleTab = (typeof ROLE_TABS)[number];

const ROLE_FILTER_MAP: Record<RoleTab, string | undefined> = {
  Todos: undefined,
  Pacientes: 'PATIENT',
  Médicos: 'DOCTOR',
  Clínicas: 'CLINIC',
  Admins: 'ADMIN',
};

export default function AdminUsers() {
  const router = useRouter();
  const [roleTab, setRoleTab] = useState<RoleTab>('Todos');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const role = ROLE_FILTER_MAP[roleTab];

  const { state, refetch } = useApi(
    () =>
      adminApi.users({
        role,
        search: debounced || undefined,
        pageSize: 100,
      }),
    [role, debounced],
  );
  useRefetchOnFocus(refetch);

  const handleStatus = (id: string, status: 'ACTIVE' | 'INACTIVE' | 'DELETED') => {
    const confirmMsg =
      status === 'DELETED'
        ? '¿Eliminar esta cuenta? La operación no se puede deshacer.'
        : status === 'INACTIVE'
          ? '¿Suspender este usuario?'
          : '¿Reactivar este usuario?';
    RNAlert.alert('Confirmar', confirmMsg, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí',
        style: status === 'DELETED' ? 'destructive' : 'default',
        onPress: async () => {
          setActing(id);
          setActionError(null);
          try {
            await adminApi.setUserStatus(id, status);
            refetch();
          } catch (err: unknown) {
            const msg =
              (err as { response?: { data?: { error?: { message?: string } } } })
                ?.response?.data?.error?.message ?? 'Error al actualizar';
            setActionError(msg);
          } finally {
            setActing(null);
          }
        },
      },
    ]);
  };

  const { logout: _logout } = useAuth();
  void _logout;

  const handleImpersonate = (u: UserDto) => {
    const name =
      `${u.profile?.firstName ?? ''} ${u.profile?.lastName ?? ''}`.trim() ||
      u.email;
    RNAlert.alert(
      'Impersonar',
      `¿Iniciar sesión como ${name} (${u.email})?\n\nTu sesión de admin se reemplazará. Para volver, cerrá sesión y entrá de nuevo como admin.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Entrar',
          onPress: async () => {
            setActing(u.id);
            try {
              const res = await adminApi.impersonate(u.id);
              // Reemplazamos el token. La próxima vez que la app
              // bootstrappee leerá el token nuevo y traerá al usuario
              // impersonado.
              await tokenStorage.set(res.data.token);
              setAuthToken(res.data.token);
              const targetRole = u.role.toLowerCase();
              router.replace(`/(main)/(${targetRole})` as never);
            } catch (err: unknown) {
              const msg =
                (err as { response?: { data?: { error?: { message?: string } } } })
                  ?.response?.data?.error?.message ??
                'No se pudo impersonar al usuario.';
              setActionError(msg);
            } finally {
              setActing(null);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <PageHeader
        title="Usuarios"
        subtitle="Todas las cuentas registradas"
        action={
          <Pressable
            onPress={() => setShowCreate(true)}
            className="flex-row items-center gap-1.5 bg-rose-600 active:bg-rose-700 px-3 py-2 rounded-xl">
            <UserPlus size={14} color="#fff" />
            <Text className="text-white text-xs font-semibold">Crear</Text>
          </Pressable>
        }
      />

      <View className="gap-3 mb-3">
        <Tabs
          tabs={[...ROLE_TABS]}
          active={roleTab}
          onChange={(v) => setRoleTab(v as RoleTab)}
        />
        <View className="flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 h-12">
          <Search size={14} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por email, nombre o apellido..."
            placeholderTextColor="#94a3b8"
            className="flex-1 ml-2 text-base text-slate-800 dark:text-slate-100"
          />
        </View>
      </View>

      {actionError ? (
        <View className="mb-3">
          <Alert variant="error">{actionError}</Alert>
        </View>
      ) : null}

      {state.status === 'loading' && (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      )}

      {state.status === 'error' && (
        <Alert variant="error">{state.error.message}</Alert>
      )}

      {state.status === 'ready' && (
        <SectionCard noPadding>
          {state.data.data.length === 0 ? (
            <EmptyState
              title="Sin resultados"
              description="Probá con otro término o cambiá los filtros."
            />
          ) : (
            <View>
              {state.data.data.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  acting={acting === u.id}
                  onEdit={() => setEditing(u)}
                  onImpersonate={() => handleImpersonate(u)}
                  onSuspend={() => handleStatus(u.id, 'INACTIVE')}
                  onReactivate={() => handleStatus(u.id, 'ACTIVE')}
                  onDelete={() => handleStatus(u.id, 'DELETED')}
                />
              ))}
            </View>
          )}
        </SectionCard>
      )}

      {showCreate ? (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refetch();
          }}
        />
      ) : null}

      {editing ? (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      ) : null}
    </Screen>
  );
}

function UserRow({
  user,
  acting,
  onEdit,
  onImpersonate,
  onSuspend,
  onReactivate,
  onDelete,
}: {
  user: UserDto;
  acting: boolean;
  onEdit: () => void;
  onImpersonate: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const initials = profileInitials(user.profile, '··');
  return (
    <View className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
      <View className="flex-row items-start gap-3">
        <Avatar
          initials={initials}
          imageUrl={user.profile?.avatarUrl ?? null}
          size="md"
          variant="slate"
        />
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text
              numberOfLines={1}
              className="font-semibold text-slate-800 dark:text-white flex-shrink">
              {[user.profile?.firstName, user.profile?.lastName]
                .filter(Boolean)
                .join(' ') || user.email}
            </Text>
            <View
              className={`px-2 py-0.5 rounded ${ROLE_BG[user.role] ?? 'bg-slate-100'}`}>
              <Text
                className={`text-[10px] font-semibold ${ROLE_TEXT[user.role] ?? 'text-slate-700'}`}>
                {ROLE_LABEL[user.role] ?? user.role}
              </Text>
            </View>
          </View>
          <Text numberOfLines={1} className="text-xs text-slate-500 mt-0.5">
            {user.email}
          </Text>
          <View className="mt-1">
            <StatusBadge
              status={user.status.toLowerCase()}
              statusMap={STATUS_MAP}
              size="sm"
            />
          </View>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2 mt-3">
        {user.role !== 'ADMIN' &&
        user.status !== 'DELETED' &&
        user.status !== 'INACTIVE' ? (
          <Pressable
            onPress={onImpersonate}
            disabled={acting}
            className="flex-row items-center gap-1.5 bg-violet-50 dark:bg-violet-900/20 px-3 py-2 rounded-lg">
            <LogIn size={13} color="#7c3aed" />
            <Text className="text-violet-700 text-xs font-semibold">
              Entrar
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onEdit}
          disabled={acting}
          className="flex-row items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
          <Edit3 size={13} color="#2563eb" />
          <Text className="text-blue-700 text-xs font-semibold">Editar</Text>
        </Pressable>
        {user.status === 'ACTIVE' ? (
          <Pressable
            onPress={onSuspend}
            disabled={acting}
            className="flex-row items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
            {acting ? (
              <ActivityIndicator size="small" color="#d97706" />
            ) : (
              <Ban size={13} color="#d97706" />
            )}
            <Text className="text-amber-700 text-xs font-semibold">
              Suspender
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onReactivate}
            disabled={acting}
            className="flex-row items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
            <RotateCcw size={13} color="#10b981" />
            <Text className="text-emerald-700 text-xs font-semibold">
              Reactivar
            </Text>
          </Pressable>
        )}
        {user.status !== 'DELETED' ? (
          <Pressable
            onPress={onDelete}
            disabled={acting}
            className="flex-row items-center gap-1.5 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 rounded-lg">
            <Trash2 size={13} color="#e11d48" />
            <Text className="text-rose-600 text-xs font-semibold">
              Eliminar
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

interface CreateForm {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'PATIENT' | 'DOCTOR' | 'CLINIC' | 'ADMIN';
  clinicName: string;
  specialty: string;
}

const EMPTY_CREATE: CreateForm = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  role: 'PATIENT',
  clinicName: '',
  specialty: '',
};

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<CreateForm>(EMPTY_CREATE);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    user: UserDto;
    tempPassword: string;
  } | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const valid =
    form.email.includes('@') &&
    form.firstName.trim() &&
    form.lastName.trim() &&
    (form.role !== 'CLINIC' || form.clinicName.trim()) &&
    (form.role !== 'DOCTOR' || form.specialty.trim());

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await adminApi.createUser({
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        clinicName:
          form.role === 'CLINIC' ? form.clinicName.trim() : undefined,
        specialty:
          form.role === 'DOCTOR' ? form.specialty.trim() : undefined,
      });
      setCreated(res.data);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo crear el usuario';
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
    } catch {
      /* ignore */
    }
  };

  if (created) {
    return (
      <Modal visible title="Usuario creado" onClose={onCreated}>
        <Alert variant="success">
          <Text className="text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
            {created.user.profile?.firstName} {created.user.profile?.lastName}
          </Text>
          <Text className="text-emerald-700 dark:text-emerald-300 text-xs mt-1">
            {created.user.email} · {ROLE_LABEL[created.user.role]}
          </Text>
        </Alert>
        <View className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <Text className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
            Contraseña temporal
          </Text>
          <View className="flex-row items-center justify-between mt-1">
            <Text className="text-base font-mono font-bold text-amber-800 dark:text-amber-200 flex-1">
              {showPwd ? created.tempPassword : '••••••••'}
            </Text>
            <Pressable onPress={() => setShowPwd((v) => !v)} hitSlop={4}>
              {showPwd ? (
                <EyeOff size={16} color="#d97706" />
              ) : (
                <Eye size={16} color="#d97706" />
              )}
            </Pressable>
            <Pressable
              onPress={() => copy(created.tempPassword)}
              hitSlop={4}
              className="ml-3">
              <CopyIcon size={16} color="#d97706" />
            </Pressable>
          </View>
          <Text className="text-[11px] text-amber-700/80 mt-2">
            Compartila con el usuario. También se le envió por email.
          </Text>
        </View>
        <View className="mt-4">
          <Button onPress={onCreated} fullWidth>
            Continuar
          </Button>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible
      title="Crear usuario"
      onClose={onClose}
      footer={
        <Button
          onPress={submit}
          disabled={!valid || saving}
          loading={saving}
          fullWidth>
          <View className="flex-row items-center gap-2">
            <UserPlus size={15} color="#fff" />
            <Text className="text-white font-semibold">Crear usuario</Text>
          </View>
        </Button>
      }>
      {err ? (
        <View className="mb-3">
          <Alert variant="error">{err}</Alert>
        </View>
      ) : null}

      <View className="gap-3">
        <FormField label="Rol">
          <View className="flex-row gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {(['PATIENT', 'DOCTOR', 'CLINIC', 'ADMIN'] as const).map((r) => {
              const selected = form.role === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setForm({ ...form, role: r })}
                  className={`flex-1 py-2 rounded-lg items-center ${
                    selected ? 'bg-white dark:bg-slate-900' : ''
                  }`}>
                  <Text
                    className={`text-xs font-medium ${
                      selected
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-500'
                    }`}>
                    {ROLE_LABEL[r]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FormField>
        <FormField label="Email *">
          <Input
            value={form.email}
            onChangeText={(t) => setForm({ ...form, email: t })}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="usuario@dominio.com"
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
        {form.role === 'CLINIC' ? (
          <FormField label="Nombre comercial de la clínica *">
            <Input
              value={form.clinicName}
              onChangeText={(t) => setForm({ ...form, clinicName: t })}
            />
          </FormField>
        ) : null}
        {form.role === 'DOCTOR' ? (
          <FormField label="Especialidad *">
            <Input
              value={form.specialty}
              onChangeText={(t) => setForm({ ...form, specialty: t })}
              placeholder="Cardiología, Pediatría..."
            />
          </FormField>
        ) : null}
      </View>
    </Modal>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    firstName: user.profile?.firstName ?? '',
    lastName: user.profile?.lastName ?? '',
    phone: user.profile?.phone ?? '',
    email: user.email,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setErr(null);
    try {
      const patch: AdminUserPatch = {
        email: form.email.trim() !== user.email ? form.email.trim() : undefined,
        profile: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
        },
      };
      await adminApi.updateUserFull(user.id, patch);
      onSaved();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo guardar';
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible
      title={`Editar — ${ROLE_LABEL[user.role] ?? user.role}`}
      onClose={onClose}
      footer={
        <Button onPress={submit} loading={saving} fullWidth>
          Guardar cambios
        </Button>
      }>
      {err ? (
        <View className="mb-3">
          <Alert variant="error">{err}</Alert>
        </View>
      ) : null}

      <View className="gap-3">
        <FormField label="Email">
          <Input
            value={form.email}
            onChangeText={(t) => setForm({ ...form, email: t })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </FormField>
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
            <FormField label="Apellido">
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
        <Text className="text-[11px] text-slate-400">
          Para editar campos avanzados (clínica/médico/paciente), usá el
          portal web. Esta vista cubre los datos básicos del perfil.
        </Text>
      </View>
    </Modal>
  );
}
