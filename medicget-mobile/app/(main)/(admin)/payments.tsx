/**
 * Superadmin - Historial de pagos.
 *
 * Tres tabs (espejo del AdminPaymentsPage web):
 *   - Pacientes     -> pagos de cita (paciente -> medico/clinica)
 *   - Especialistas -> pagos de suscripcion de planes DOCTOR
 *   - Clinicas      -> pagos de suscripcion de planes CLINIC
 *
 * Cada tab pega al mismo endpoint /api/v1/payments con
 * `?audience=PATIENT|DOCTOR|CLINIC` que el backend usa para filtrar.
 */

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Building2,
  Download,
  Receipt,
  Search,
  Stethoscope,
  Users,
} from 'lucide-react-native';

import { Screen } from '@/components/ui/Screen';
import { SectionCard } from '@/components/ui/SectionCard';
import { Avatar } from '@/components/ui/Avatar';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge, type StatusMap } from '@/components/ui/StatusBadge';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import {
  paymentApi,
  type PaymentRowDto,
  type PaginatedData,
} from '@/lib/api';
import { fmtMedDate, profileInitials } from '@/lib/format';
import { matchesSearch } from '@/lib/search';

type Audience = 'PATIENT' | 'DOCTOR' | 'CLINIC';

const TABS: ReadonlyArray<{
  key: Audience;
  label: string;
  subtitle: string;
  Icon: typeof Users;
}> = [
  {
    key: 'PATIENT',
    label: 'Pacientes',
    subtitle: 'Cobros de consultas',
    Icon: Users,
  },
  {
    key: 'DOCTOR',
    label: 'Especialistas',
    subtitle: 'Suscripciones de planes profesionales',
    Icon: Stethoscope,
  },
  {
    key: 'CLINIC',
    label: 'Clinicas',
    subtitle: 'Suscripciones de planes para clinicas',
    Icon: Building2,
  },
];

const STATUS_MAP: StatusMap = {
  paid: {
    label: 'Pagado',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  refunded: {
    label: 'Reembolsado',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
  },
  pending: {
    label: 'Pendiente',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
  },
  failed: {
    label: 'Fallido',
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-300',
  },
};

export default function AdminPayments() {
  const router = useRouter();
  const [tab, setTab] = useState<Audience>('PATIENT');
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <Screen>
      <View className="flex-row items-center gap-2 mb-4">
        <Pressable
          onPress={() => router.back()}
          hitSlop={6}
          className="w-9 h-9 rounded-lg items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <ArrowLeft size={16} color="#475569" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold text-slate-900 dark:text-white">
            Historial de pagos
          </Text>
          <Text className="text-xs text-slate-500">
            Cobros procesados por la plataforma
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-slate-200 dark:border-slate-800 mb-3">
        {TABS.map((t) => {
          const Icon = t.Icon;
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 border-b-2 ${
                active ? 'border-rose-600' : 'border-transparent'
              }`}>
              <Icon
                size={14}
                color={active ? '#e11d48' : '#94a3b8'}
              />
              <Text
                className={`text-xs font-medium ${
                  active
                    ? 'text-rose-700 dark:text-rose-300'
                    : 'text-slate-500 dark:text-slate-400'
                }`}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="text-[11px] text-slate-400 mb-3">{current.subtitle}</Text>

      {/* Forzamos remount con `key` para que cada tab arranque limpio (search,
          paginacion) - igual que en el web. */}
      {tab === 'PATIENT' ? (
        <AppointmentsList key="patient" audience="PATIENT" />
      ) : tab === 'DOCTOR' ? (
        <SubscriptionsList
          key="doctor"
          audience="DOCTOR"
          subjectLabel="especialista"
        />
      ) : (
        <SubscriptionsList
          key="clinic"
          audience="CLINIC"
          subjectLabel="clinica"
        />
      )}
    </Screen>
  );
}

// ============================================================================
// Tab "Pacientes" - pagos de citas
// ============================================================================

function AppointmentsList({ audience }: { audience: 'PATIENT' }) {
  const [search, setSearch] = useState('');
  const { state, refetch } = useApi<PaginatedData<PaymentRowDto>>(
    () => paymentApi.list({ audience, pageSize: 200 }),
    [audience],
  );
  useRefetchOnFocus(refetch);

  const rows = useMemo(() => {
    if (state.status !== 'ready') return [];
    const all = state.data.data.filter((p) => p.appointment != null);
    if (!search.trim()) return all;
    return all.filter((p) => {
      const a = p.appointment!;
      return matchesSearch(
        search,
        a.patient.user.email,
        a.patient.user.profile?.firstName,
        a.patient.user.profile?.lastName,
        a.doctor.user.profile?.firstName,
        a.doctor.user.profile?.lastName,
        a.doctor.specialty,
        a.clinic?.name,
        p.transactionId,
      );
    });
  }, [state, search]);

  const totalAll = state.status === 'ready' ? state.data.meta.total : 0;

  return (
    <View className="gap-3">
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar paciente, medico, clinica..."
        count={
          state.status === 'ready'
            ? search.trim()
              ? `${rows.length} de ${totalAll}`
              : `${totalAll} pago${totalAll === 1 ? '' : 's'}`
            : '-'
        }
      />

      {state.status === 'loading' ? (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      ) : state.status === 'error' ? (
        <Alert variant="error">
          <Text className="text-rose-700 text-sm">{state.error.message}</Text>
          <Pressable onPress={refetch} className="mt-2">
            <Text className="text-rose-600 text-xs font-semibold">
              Reintentar
            </Text>
          </Pressable>
        </Alert>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={search.trim() ? 'Sin coincidencias' : 'Sin pagos todavia'}
          description={
            search.trim()
              ? `No encontramos pagos para "${search}".`
              : 'Cuando los pacientes paguen sus citas, los registros apareceran aca.'
          }
        />
      ) : (
        <SectionCard noPadding>
          {rows.map((p) => (
            <AppointmentRow key={p.id} payment={p} />
          ))}
        </SectionCard>
      )}
    </View>
  );
}

function AppointmentRow({ payment }: { payment: PaymentRowDto }) {
  const appt = payment.appointment!;
  const patProfile = appt.patient.user.profile;
  const docProfile = appt.doctor.user.profile;
  const patientName =
    `${patProfile?.firstName ?? ''} ${patProfile?.lastName ?? ''}`.trim() ||
    appt.patient.user.email;
  const doctorName =
    `${docProfile?.firstName ?? ''} ${docProfile?.lastName ?? ''}`.trim() ||
    'Sin nombre';

  return (
    <View className="flex-row items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <Avatar
        initials={profileInitials(patProfile, 'PT')}
        imageUrl={patProfile?.avatarUrl ?? null}
        size="md"
        variant="indigo"
      />
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text
            numberOfLines={1}
            className="text-sm font-semibold text-slate-800 dark:text-white flex-1">
            {patientName}
          </Text>
          <StatusBadge
            status={payment.status.toLowerCase()}
            statusMap={STATUS_MAP}
            size="sm"
          />
        </View>
        <Text className="text-[11px] text-slate-500 mt-0.5">
          Dr. {doctorName} - {appt.doctor.specialty}
        </Text>
        <Text className="text-[11px] text-slate-400 mt-0.5">
          {fmtMedDate(appt.date)} - {appt.time}
          {payment.paidAt
            ? ` - pagado ${fmtMedDate(payment.paidAt)}`
            : ''}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-sm font-bold text-slate-800 dark:text-white">
          ${payment.amount.toFixed(2)}
        </Text>
        {payment.platformFee != null ? (
          <Text className="text-[10px] text-slate-400">
            comision ${payment.platformFee.toFixed(2)}
          </Text>
        ) : null}
        <ReceiptLink payment={payment} />
      </View>
    </View>
  );
}

// ============================================================================
// Tab "Especialistas" / "Clinicas" - pagos de suscripcion
// ============================================================================

function SubscriptionsList({
  audience,
  subjectLabel,
}: {
  audience: 'DOCTOR' | 'CLINIC';
  subjectLabel: string;
}) {
  const [search, setSearch] = useState('');
  const { state, refetch } = useApi<PaginatedData<PaymentRowDto>>(
    () => paymentApi.list({ audience, pageSize: 200 }),
    [audience],
  );
  useRefetchOnFocus(refetch);

  const rows = useMemo(() => {
    if (state.status !== 'ready') return [];
    const all = state.data.data.filter((p) => p.subscription != null);
    if (!search.trim()) return all;
    return all.filter((p) => {
      const s = p.subscription!;
      return matchesSearch(
        search,
        s.user.email,
        s.user.profile?.firstName,
        s.user.profile?.lastName,
        s.plan.name,
        s.plan.code,
        p.transactionId,
      );
    });
  }, [state, search]);

  const totalAll = state.status === 'ready' ? state.data.meta.total : 0;

  return (
    <View className="gap-3">
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={`Buscar ${subjectLabel}, plan o transaccion...`}
        count={
          state.status === 'ready'
            ? search.trim()
              ? `${rows.length} de ${totalAll}`
              : `${totalAll} pago${totalAll === 1 ? '' : 's'}`
            : '-'
        }
      />

      {state.status === 'loading' ? (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      ) : state.status === 'error' ? (
        <Alert variant="error">
          <Text className="text-rose-700 text-sm">{state.error.message}</Text>
          <Pressable onPress={refetch} className="mt-2">
            <Text className="text-rose-600 text-xs font-semibold">
              Reintentar
            </Text>
          </Pressable>
        </Alert>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={
            search.trim()
              ? 'Sin coincidencias'
              : 'Sin pagos de suscripcion'
          }
          description={
            search.trim()
              ? `No encontramos pagos para "${search}".`
              : `Cuando ${
                  audience === 'CLINIC' ? 'las clinicas' : 'los especialistas'
                } paguen su plan, apareceran aca.`
          }
        />
      ) : (
        <SectionCard noPadding>
          {rows.map((p) => (
            <SubscriptionRow key={p.id} payment={p} />
          ))}
        </SectionCard>
      )}
    </View>
  );
}

function SubscriptionRow({ payment }: { payment: PaymentRowDto }) {
  const sub = payment.subscription!;
  const profile = sub.user.profile;
  const subjectName =
    `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() ||
    sub.user.email;
  const expiresAt = fmtMedDate(sub.expiresAt);
  const paidAt = payment.paidAt ? fmtMedDate(payment.paidAt) : '-';

  return (
    <View className="flex-row items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <Avatar
        initials={profileInitials(profile, '··')}
        imageUrl={profile?.avatarUrl ?? null}
        size="md"
        variant="slate"
      />
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text
            numberOfLines={1}
            className="text-sm font-semibold text-slate-800 dark:text-white flex-1">
            {subjectName}
          </Text>
          <StatusBadge
            status={payment.status.toLowerCase()}
            statusMap={STATUS_MAP}
            size="sm"
          />
        </View>
        <Text className="text-[11px] text-slate-500 mt-0.5">
          Plan {sub.plan.name} ({sub.plan.code})
        </Text>
        <Text className="text-[11px] text-slate-400 mt-0.5">
          Pagado {paidAt} - vigencia hasta {expiresAt}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-sm font-bold text-slate-800 dark:text-white">
          ${payment.amount.toFixed(2)}
        </Text>
        <Text className="text-[10px] text-slate-400">cada 30 dias</Text>
        <ReceiptLink payment={payment} />
      </View>
    </View>
  );
}

// ============================================================================
// Compartido
// ============================================================================

function SearchBar({
  value,
  onChange,
  placeholder,
  count,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  count: string;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <Search size={14} color="#94a3b8" />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          className="flex-1 text-sm text-slate-800 dark:text-white"
        />
      </View>
      <Text className="text-[11px] text-slate-400">{count}</Text>
    </View>
  );
}

/**
 * "Link" a recibo - en mobile abrimos el HTML del recibo en una WebView
 * via router.push hacia una ruta interna o, mas simple, lo abrimos en
 * Linking.openURL. Como el endpoint requiere Authorization header, no
 * podemos usar openURL directo; mostramos el boton solo para pagos
 * PAID/REFUNDED y, al tocar, navegamos a una pantalla intermedia (no
 * implementada todavia). Por ahora ocultamos el boton si no esta PAID.
 *
 * TODO: implementar /admin/payments/receipt/[id] que abra el HTML en
 * WebView con el header de auth, igual que el web (window.open).
 */
function ReceiptLink({ payment }: { payment: PaymentRowDto }) {
  const enabled = payment.status === 'PAID' || payment.status === 'REFUNDED';
  if (!enabled) return null;
  // Por ahora dejamos el icono como recordatorio visual. Cuando se
  // implemente la WebView del recibo, conectar el onPress aca.
  return (
    <View className="flex-row items-center gap-1 mt-1 opacity-60">
      <Download size={10} color="#94a3b8" />
      <Text className="text-[10px] text-slate-400">Recibo</Text>
    </View>
  );
}
