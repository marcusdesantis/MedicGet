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
  Linking,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  List,
  MapPin,
  MessageSquare,
  Plus,
  RotateCcw,
  Star,
  Video,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { PolicyPanel } from '@/components/ui/PolicyPanel';
import { Tabs } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionCard } from '@/components/ui/SectionCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
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

const REFUND_HOURS_THRESHOLD = 24;

/** Replica la elegibilidad de reembolso del backend (Ecuador UTC-5). */
function hoursUntilAppointment(appt: AppointmentDto): number {
  const slot = new Date(`${appt.date.slice(0, 10)}T${appt.time}:00-05:00`);
  return (slot.getTime() - Date.now()) / (60 * 60 * 1000);
}
function appointmentQualifiesForRefund(appt: AppointmentDto): boolean {
  if (!appt.payment || appt.payment.status !== 'PAID') return false;
  return hoursUntilAppointment(appt) >= REFUND_HOURS_THRESHOLD;
}

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
  const [pendingCancel, setPendingCancel] = useState<AppointmentDto | null>(null);

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

  const doCancel = async (appt: AppointmentDto, reason: string) => {
    setCancellingId(appt.id);
    setActionError(null);
    try {
      await appointmentsApi.update(appt.id, {
        status: 'CANCELLED',
        cancelReason: reason.trim() || undefined,
      });
      setPendingCancel(null);
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

      <View className="mb-3">
        <PolicyPanel
          title="Política de cancelación y reembolsos"
          icon={RotateCcw}
          tone="blue"
          steps={[
            'Podés cancelar una cita cuando quieras con el botón Cancelar.',
            'Si está pagada y la cancelás con 24h o más de anticipación, se te reembolsa el 100%.',
            'Con menos de 24h, la cancelación se hace igual pero no aplica reembolso.',
            'Cuando aplica, el reembolso llega al mismo medio de pago en 3 a 5 días hábiles.',
          ]}
        />
      </View>

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
                  onCancel={() => setPendingCancel(appt)}
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

      <CancelAppointmentModal
        appointment={pendingCancel}
        submitting={!!pendingCancel && cancellingId === pendingCancel.id}
        onClose={() => setPendingCancel(null)}
        onConfirm={(reason) => pendingCancel && doCancel(pendingCancel, reason)}
      />
    </Screen>
  );
}

/**
 * Modal de confirmación de cancelación con la política de reembolso visible
 * ANTES de confirmar (espejo del web). Pide un motivo opcional.
 */
function CancelAppointmentModal({
  appointment,
  submitting,
  onClose,
  onConfirm,
}: {
  appointment: AppointmentDto | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  if (!appointment) return null;

  const refundable = appointmentQualifiesForRefund(appointment);
  const hours = Math.max(0, Math.floor(hoursUntilAppointment(appointment)));
  const hasPaid = appointment.payment?.status === 'PAID';

  return (
    <Modal
      visible={!!appointment}
      onClose={onClose}
      title="Cancelar cita"
      footer={
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button variant="secondary" onPress={onClose} disabled={submitting} fullWidth>
              Volver
            </Button>
          </View>
          <View className="flex-1">
            <Pressable
              onPress={() => onConfirm(reason)}
              disabled={submitting}
              className={`h-12 rounded-2xl items-center justify-center flex-row bg-rose-600 active:bg-rose-700 ${
                submitting ? 'opacity-60' : ''
              }`}>
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Confirmar</Text>
              )}
            </Pressable>
          </View>
        </View>
      }>
      <Text className="text-xs text-slate-500 mb-3">
        {doctorName(appointment)} · {fmtMedDate(appointment.date)} {appointment.time}
      </Text>

      {hasPaid ? (
        refundable ? (
          <View className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 mb-4">
            <View className="flex-row items-center gap-2">
              <CheckCircle2 size={15} color="#047857" />
              <Text className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Reembolso aplicable
              </Text>
            </View>
            <Text className="text-xs text-emerald-700 dark:text-emerald-200 mt-1.5 leading-5">
              Faltan {hours}h para tu cita. Se devolverán $
              {appointment.payment?.amount.toFixed(2)} al mismo medio de pago en 3-5 días hábiles.
            </Text>
          </View>
        ) : (
          <View className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 mb-4">
            <View className="flex-row items-center gap-2">
              <AlertTriangle size={15} color="#b45309" />
              <Text className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Sin reembolso
              </Text>
            </View>
            <Text className="text-xs text-amber-700 dark:text-amber-200 mt-1.5 leading-5">
              Tu cita es en menos de {REFUND_HOURS_THRESHOLD}h ({hours}h restantes). Las
              cancelaciones con menos de {REFUND_HOURS_THRESHOLD}h de anticipación no son
              reembolsables.
            </Text>
          </View>
        )
      ) : (
        <View className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 mb-4">
          <Text className="text-xs text-slate-600 dark:text-slate-300 leading-5">
            Esta cita todavía no está pagada — al cancelarla solo liberás el horario.
          </Text>
        </View>
      )}

      <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
        Motivo (opcional)
      </Text>
      <TextInput
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={3}
        maxLength={300}
        placeholder="ej: Surgió un imprevisto."
        placeholderTextColor="#94a3b8"
        textAlignVertical="top"
        className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 min-h-[72px]"
      />
    </Modal>
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
          {appt.payment?.status === 'PENDING_REFUND' ? (
            <View className="flex-row items-center gap-1 mt-1 self-start bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-md">
              <Clock size={10} color="#b45309" />
              <Text className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                Reembolso en proceso
              </Text>
            </View>
          ) : null}
          {appt.payment?.status === 'REFUNDED' ? (
            <View className="flex-row items-center gap-1 mt-1 self-start bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md">
              <CheckCircle2 size={10} color="#047857" />
              <Text className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                Reembolsado
              </Text>
            </View>
          ) : null}
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
