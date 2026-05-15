/**
 * Patient — Mis Citas. Espejo del PatientAppointmentsPage web.
 *
 * Tabs: Próximas / Pasadas / Canceladas (mapeadas a status del backend).
 * Cada item muestra el médico, la fecha+hora, status, precio y acciones
 * según modalidad (link a videollamada, recordatorio presencial, etc.).
 * El paciente cancela vía PATCH `status: CANCELLED` (mismo contrato que
 * el web).
 */

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  Linking,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  CreditCard,
  Eye,
  List,
  MapPin,
  MessageSquare,
  Plus,
  Star,
  Video,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionCard } from '@/components/ui/SectionCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { AppointmentCalendar } from '@/components/ui/AppointmentCalendar';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { fmtMedDate, profileInitials } from '@/lib/format';
import {
  appointmentsApi,
  type AppointmentDto,
} from '@/lib/api';

const TABS = ['Próximas', 'Pasadas', 'Canceladas'] as const;
type TabType = (typeof TABS)[number];

const TAB_STATUSES: Record<TabType, string[]> = {
  'Próximas': ['PENDING', 'UPCOMING', 'ONGOING'],
  'Pasadas': ['COMPLETED', 'NO_SHOW'],
  'Canceladas': ['CANCELLED'],
};

function doctorName(a: AppointmentDto): string {
  const p = a.doctor?.user?.profile;
  return `Dr. ${[p?.firstName, p?.lastName].filter(Boolean).join(' ')}`.trim();
}

export default function PatientAppointments() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('Próximas');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<AppointmentDto | null>(null);

  const { state, refetch } = useApi(
    () => appointmentsApi.list({ pageSize: 100 }),
    [],
  );
  // La tab queda montada en background — sin esto, volver de crear una
  // cita no muestra la nueva porque `useApi` no se re-dispara.
  useRefetchOnFocus(refetch);

  const visible = useMemo(() => {
    if (state.status !== 'ready') return [];
    return state.data.data.filter((a) =>
      TAB_STATUSES[activeTab].includes(a.status),
    );
  }, [state, activeTab]);

  const handleCancel = (id: string) => {
    RNAlert.alert(
      'Cancelar cita',
      '¿Seguro que deseas cancelar esta cita? Si está pagada y faltan más de 24h, se reembolsará automáticamente.',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: () => doCancel(id) },
      ],
    );
  };

  const doCancel = async (id: string) => {
    setCancellingId(id);
    setActionError(null);
    try {
      await appointmentsApi.update(id, { status: 'CANCELLED' });
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo cancelar la cita';
      setActionError(msg);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <Screen>
      <PageHeader
        title="Mis citas"
        subtitle="Gestiona tus citas médicas"
        action={
          <Pressable
            onPress={() => router.push('/(main)/(patient)/search')}
            className="flex-row items-center gap-1.5 bg-blue-600 active:bg-blue-700 px-3 py-2 rounded-xl">
            <Plus size={14} color="#fff" />
            <Text className="text-white text-xs font-semibold">
              Nueva cita
            </Text>
          </Pressable>
        }
      />

      {/* Toggle Lista / Calendario */}
      <View className="flex-row bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-3">
        <Pressable
          onPress={() => setViewMode('list')}
          className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${
            viewMode === 'list' ? 'bg-white dark:bg-slate-900' : ''
          }`}>
          <List
            size={13}
            color={viewMode === 'list' ? '#2563eb' : '#94a3b8'}
          />
          <Text
            className={`text-xs font-medium ${
              viewMode === 'list'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            }`}>
            Lista
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setViewMode('calendar')}
          className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${
            viewMode === 'calendar' ? 'bg-white dark:bg-slate-900' : ''
          }`}>
          <CalendarDays
            size={13}
            color={viewMode === 'calendar' ? '#2563eb' : '#94a3b8'}
          />
          <Text
            className={`text-xs font-medium ${
              viewMode === 'calendar'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            }`}>
            Calendario
          </Text>
        </Pressable>
      </View>

      {viewMode === 'list' ? (
        <View className="mb-3">
          <Tabs
            tabs={[...TABS]}
            active={activeTab}
            onChange={(v) => setActiveTab(v as TabType)}
          />
        </View>
      ) : null}

      {actionError ? (
        <View className="mb-3">
          <Alert variant="error">{actionError}</Alert>
        </View>
      ) : null}

      {state.status === 'loading' && (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      )}

      {state.status === 'error' && (
        <Alert variant="error">
          <Text className="text-rose-700 dark:text-rose-300 text-sm">
            {state.error.message}
          </Text>
          <Pressable onPress={refetch} className="mt-2">
            <Text className="text-blue-600 text-xs font-semibold">
              Reintentar
            </Text>
          </Pressable>
        </Alert>
      )}

      {state.status === 'ready' && viewMode === 'calendar' && (
        <AppointmentCalendar
          appointments={state.data.data}
          role="patient"
          onAppointmentPress={(a) =>
            router.push(`/(main)/(patient)/appointment/${a.id}` as never)
          }
        />
      )}

      {state.status === 'ready' && viewMode === 'list' && (
        <SectionCard noPadding>
          {visible.length === 0 ? (
            <EmptyState
              title="Sin citas en esta categoría"
              description={
                activeTab === 'Próximas'
                  ? 'Cuando reserves con un especialista, lo verás acá.'
                  : 'Las citas pasadas y canceladas se mostrarán aquí.'
              }
              icon={CalendarIcon}
              action={
                activeTab === 'Próximas' ? (
                  <Pressable
                    onPress={() => router.push('/(main)/(patient)/search')}>
                    <Text className="text-sm text-blue-600 font-semibold">
                      Buscar médicos →
                    </Text>
                  </Pressable>
                ) : undefined
              }
            />
          ) : (
            <View>
              {visible.map((appt) => (
                <AppointmentRow
                  key={appt.id}
                  appt={appt}
                  cancelling={cancellingId === appt.id}
                  onCancel={() => handleCancel(appt.id)}
                  onOpenDetail={() =>
                    router.push(
                      `/(main)/(patient)/appointment/${appt.id}` as never,
                    )
                  }
                  onOpenChat={() =>
                    router.push(
                      `/(main)/(patient)/appointment/${appt.id}/chat` as never,
                    )
                  }
                  onReview={() => setReviewing(appt)}
                />
              ))}
            </View>
          )}
        </SectionCard>
      )}

      <ReviewModal
        appointment={reviewing}
        onClose={() => setReviewing(null)}
        onSaved={() => {
          setReviewing(null);
          refetch();
        }}
      />
    </Screen>
  );
}

function AppointmentRow({
  appt,
  cancelling,
  onCancel,
  onOpenDetail,
  onOpenChat,
  onReview,
}: {
  appt: AppointmentDto;
  cancelling: boolean;
  onCancel: () => void;
  onOpenDetail: () => void;
  onOpenChat: () => void;
  onReview: () => void;
}) {
  const profile = appt.doctor?.user?.profile;
  const initials = profileInitials(profile, 'DR');
  const cancellable =
    appt.status === 'PENDING' || appt.status === 'UPCOMING';
  const showJoinBtn =
    appt.modality === 'ONLINE' &&
    !!appt.meetingUrl &&
    appt.status !== 'CANCELLED' &&
    appt.status !== 'COMPLETED' &&
    appt.status !== 'NO_SHOW';
  const needsPayment =
    appt.status === 'PENDING' &&
    (!appt.payment || appt.payment.status === 'PENDING');

  return (
    <View className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
      <View className="flex-row items-start gap-3">
        <Avatar
          initials={initials}
          imageUrl={profile?.avatarUrl ?? null}
          size="lg"
          shape="rounded"
          variant="blue"
        />
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text
              numberOfLines={1}
              className="font-semibold text-slate-800 dark:text-white flex-shrink">
              {doctorName(appt)}
            </Text>
            <StatusBadge
              status={appt.status.toLowerCase()}
              statusMap={appointmentStatusMap}
              size="sm"
            />
          </View>
          <Text className="text-xs text-blue-600 font-medium mt-0.5">
            {appt.doctor?.specialty ?? '—'}
          </Text>
          {appt.clinic ? (
            <Text className="text-[11px] text-slate-400 mt-0.5">
              {appt.clinic.name}
            </Text>
          ) : null}
          <View className="flex-row items-center gap-3 mt-2">
            <View className="flex-row items-center gap-1">
              <CalendarIcon size={11} color="#94a3b8" />
              <Text className="text-xs text-slate-500">
                {fmtMedDate(appt.date)}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Clock size={11} color="#94a3b8" />
              <Text className="text-xs text-slate-500">{appt.time}</Text>
            </View>
            <Text className="text-xs font-semibold text-slate-800 dark:text-white">
              ${appt.price.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2 mt-3">
        {needsPayment ? (
          <Pressable
            onPress={onOpenDetail}
            className="flex-row items-center gap-1.5 bg-amber-500 active:bg-amber-600 px-3 py-2 rounded-lg">
            <CreditCard size={13} color="#fff" />
            <Text className="text-white text-xs font-semibold">
              Pagar ${appt.price.toFixed(2)}
            </Text>
          </Pressable>
        ) : null}
        {showJoinBtn && !needsPayment ? (
          <Pressable
            onPress={() =>
              appt.meetingUrl && Linking.openURL(appt.meetingUrl)
            }
            className="flex-row items-center gap-1.5 bg-blue-600 active:bg-blue-700 px-3 py-2 rounded-lg">
            <Video size={13} color="#fff" />
            <Text className="text-white text-xs font-semibold">Unirme</Text>
          </Pressable>
        ) : null}
        {appt.modality === 'CHAT' &&
        appt.status !== 'CANCELLED' &&
        appt.status !== 'COMPLETED' &&
        appt.status !== 'NO_SHOW' ? (
          <Pressable
            onPress={onOpenChat}
            className="flex-row items-center gap-1.5 bg-emerald-600 active:bg-emerald-700 px-3 py-2 rounded-lg">
            <MessageSquare size={13} color="#fff" />
            <Text className="text-white text-xs font-semibold">Chat</Text>
          </Pressable>
        ) : null}
        {appt.modality === 'PRESENCIAL' &&
        appt.status !== 'CANCELLED' &&
        appt.status !== 'COMPLETED' &&
        appt.status !== 'NO_SHOW' ? (
          <Pressable
            onPress={onOpenDetail}
            className="flex-row items-center gap-1.5 bg-rose-600 active:bg-rose-700 px-3 py-2 rounded-lg">
            <MapPin size={13} color="#fff" />
            <Text className="text-white text-xs font-semibold">Asistir</Text>
          </Pressable>
        ) : null}
        {appt.status === 'COMPLETED' && !appt.review ? (
          <Pressable
            onPress={onReview}
            className="flex-row items-center gap-1.5 bg-amber-500 active:bg-amber-600 px-3 py-2 rounded-lg">
            <Star size={13} color="#fff" />
            <Text className="text-white text-xs font-semibold">Calificar</Text>
          </Pressable>
        ) : null}
        {appt.status === 'COMPLETED' && appt.review ? (
          <View className="flex-row items-center gap-1 bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1.5 rounded-lg">
            <Star size={12} color="#f59e0b" fill="#fbbf24" />
            <Text className="text-amber-700 dark:text-amber-300 text-xs font-semibold">
              {appt.review.rating}/5
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={onOpenDetail}
          className="flex-row items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg">
          <Eye size={13} color="#475569" />
          <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold">
            Detalle
          </Text>
        </Pressable>
        {cancellable ? (
          <Pressable
            onPress={onCancel}
            disabled={cancelling}
            className="flex-row items-center gap-1.5 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 rounded-lg">
            {cancelling ? (
              <ActivityIndicator size="small" color="#e11d48" />
            ) : (
              <X size={13} color="#e11d48" />
            )}
            <Text className="text-rose-600 text-xs font-semibold">
              Cancelar
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
