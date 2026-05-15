/**
 * Doctor — Agenda. Espejo del DoctorAppointmentsPage web.
 *
 * Tabs: Todas / Pendientes / Próximas / Completadas / Canceladas.
 * Búsqueda por nombre de paciente. Acciones por row:
 *   - PENDING:  Confirmar (→ UPCOMING) / Rechazar (→ CANCELLED)
 *   - UPCOMING/ONGOING: Atender (→ COMPLETED)
 *   - ONLINE + meetingUrl: Unirme
 *   - CHAT: Abrir chat
 *   - PRESENCIAL: Atender (abre detalle)
 *   - Cualquiera: Ver detalle
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
  Check,
  CheckCircle,
  Clock,
  Eye,
  List,
  MapPin,
  MessageSquare,
  Video,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { SearchInput } from '@/components/ui/SearchInput';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionCard } from '@/components/ui/SectionCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { AppointmentCalendar } from '@/components/ui/AppointmentCalendar';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { fmtShortDate, profileInitials } from '@/lib/format';
import {
  appointmentsApi,
  type AppointmentDto,
} from '@/lib/api';

// El médico no ve citas PENDING (impagas) — el backend las filtra
// porque mientras el paciente no completa el pago, la cita no se
// considera confirmada. Por eso no hay tab "Pendientes" en la agenda
// del médico (a diferencia del paciente, que sí necesita verlas para
// completar el pago).
const TABS = ['Todas', 'Próximas', 'Completadas', 'Canceladas'] as const;
type TabType = (typeof TABS)[number];

const TAB_STATUSES: Record<TabType, string[] | null> = {
  Todas: null,
  Próximas: ['UPCOMING', 'ONGOING'],
  Completadas: ['COMPLETED'],
  Canceladas: ['CANCELLED', 'NO_SHOW'],
};

function patientName(a: AppointmentDto): string {
  const p = a.patient?.user?.profile;
  return [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'Paciente';
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export default function DoctorAppointments() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>('Todas');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { state, refetch } = useApi(
    () => appointmentsApi.list({ pageSize: 100 }),
    [],
  );
  useRefetchOnFocus(refetch);

  const visible = useMemo(() => {
    if (state.status !== 'ready') return [];
    const statusFilter = TAB_STATUSES[tab];
    const q = normalize(search.trim());
    return state.data.data.filter((a) => {
      const matchStatus = !statusFilter || statusFilter.includes(a.status);
      const matchSearch = !q || normalize(patientName(a)).includes(q);
      return matchStatus && matchSearch;
    });
  }, [state, tab, search]);

  const updateStatus = async (
    id: string,
    newStatus: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED',
  ) => {
    setActingId(id);
    setActionError(null);
    try {
      await appointmentsApi.update(id, { status: newStatus });
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
        'No se pudo actualizar la cita';
      setActionError(msg);
    } finally {
      setActingId(null);
    }
  };

  const confirmAction = (
    title: string,
    msg: string,
    onConfirm: () => void,
    destructive = false,
  ) => {
    RNAlert.alert(title, msg, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí',
        style: destructive ? 'destructive' : 'default',
        onPress: onConfirm,
      },
    ]);
  };

  return (
    <Screen>
      <PageHeader
        title="Citas"
        subtitle="Gestiona tus consultas programadas"
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
            color={viewMode === 'list' ? '#0d9488' : '#94a3b8'}
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
            color={viewMode === 'calendar' ? '#0d9488' : '#94a3b8'}
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

      {/* Solo en vista lista: tabs + búsqueda. El calendario muestra
          siempre todo el mes, sin filtros. */}
      {viewMode === 'list' ? (
        <View className="gap-3 mb-3">
          <Tabs
            tabs={[...TABS]}
            active={tab}
            onChange={(v) => setTab(v as TabType)}
          />
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar paciente..."
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
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      )}

      {state.status === 'error' && (
        <Alert variant="error">
          <Text className="text-rose-700 dark:text-rose-300 text-sm">
            {state.error.message}
          </Text>
          <Pressable onPress={refetch} className="mt-2">
            <Text className="text-teal-600 text-xs font-semibold">
              Reintentar
            </Text>
          </Pressable>
        </Alert>
      )}

      {state.status === 'ready' && viewMode === 'calendar' && (
        <AppointmentCalendar
          appointments={state.data.data}
          role="doctor"
          onAppointmentPress={(a) =>
            router.push(`/(main)/(doctor)/appointment/${a.id}` as never)
          }
        />
      )}

      {state.status === 'ready' && viewMode === 'list' && (
        <SectionCard noPadding>
          {visible.length === 0 ? (
            <EmptyState
              title="Sin citas para mostrar"
              description="Cuando un paciente reserve, sus citas aparecerán aquí."
              icon={CalendarIcon}
            />
          ) : (
            <View>
              {visible.map((a) => (
                <AppointmentRow
                  key={a.id}
                  appt={a}
                  acting={actingId === a.id}
                  onOpenDetail={() =>
                    router.push(
                      `/(main)/(doctor)/appointment/${a.id}` as never,
                    )
                  }
                  onOpenChat={() =>
                    router.push(
                      `/(main)/(doctor)/appointment/${a.id}/chat` as never,
                    )
                  }
                  onConfirm={() =>
                    confirmAction(
                      'Confirmar cita',
                      `¿Confirmás la cita con ${patientName(a)}?`,
                      () => updateStatus(a.id, 'UPCOMING'),
                    )
                  }
                  onReject={() =>
                    confirmAction(
                      'Rechazar cita',
                      'El paciente será notificado y la cita queda cancelada.',
                      () => updateStatus(a.id, 'CANCELLED'),
                      true,
                    )
                  }
                  onComplete={() =>
                    confirmAction(
                      'Marcar como atendida',
                      '¿Confirmás que ya atendiste a este paciente?',
                      () => updateStatus(a.id, 'COMPLETED'),
                    )
                  }
                />
              ))}
            </View>
          )}
        </SectionCard>
      )}
    </Screen>
  );
}

function AppointmentRow({
  appt,
  acting,
  onOpenDetail,
  onOpenChat,
  onConfirm,
  onReject,
  onComplete,
}: {
  appt: AppointmentDto;
  acting: boolean;
  onOpenDetail: () => void;
  onOpenChat: () => void;
  onConfirm: () => void;
  onReject: () => void;
  onComplete: () => void;
}) {
  const profile = appt.patient?.user?.profile;
  const showJoinBtn =
    appt.modality === 'ONLINE' &&
    !!appt.meetingUrl &&
    appt.status !== 'CANCELLED' &&
    appt.status !== 'COMPLETED' &&
    appt.status !== 'NO_SHOW';

  return (
    <View className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
      <View className="flex-row items-start gap-3">
        <Avatar
          initials={profileInitials(profile, 'PT')}
          imageUrl={profile?.avatarUrl ?? null}
          size="md"
          variant="indigo"
        />
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text
              numberOfLines={1}
              className="font-semibold text-slate-800 dark:text-white flex-shrink">
              {patientName(appt)}
            </Text>
            <StatusBadge
              status={appt.status.toLowerCase()}
              statusMap={appointmentStatusMap}
              size="sm"
            />
          </View>
          {appt.notes ? (
            <Text
              numberOfLines={1}
              className="text-xs text-slate-400 mt-0.5">
              {appt.notes}
            </Text>
          ) : null}
          <View className="flex-row items-center gap-3 mt-1">
            <View className="flex-row items-center gap-1">
              <CalendarIcon size={11} color="#94a3b8" />
              <Text className="text-xs text-slate-500">
                {fmtShortDate(appt.date)}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Clock size={11} color="#94a3b8" />
              <Text className="text-xs text-slate-500">{appt.time}</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2 mt-3">
        {showJoinBtn ? (
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
            <Text className="text-white text-xs font-semibold">Atender</Text>
          </Pressable>
        ) : null}
        {appt.status === 'PENDING' ? (
          <>
            <Pressable
              onPress={onConfirm}
              disabled={acting}
              className="flex-row items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
              {acting ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <Check size={13} color="#10b981" />
              )}
              <Text className="text-emerald-700 text-xs font-semibold">
                Confirmar
              </Text>
            </Pressable>
            <Pressable
              onPress={onReject}
              disabled={acting}
              className="flex-row items-center gap-1.5 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 rounded-lg">
              <X size={13} color="#e11d48" />
              <Text className="text-rose-600 text-xs font-semibold">
                Rechazar
              </Text>
            </Pressable>
          </>
        ) : null}
        {(appt.status === 'UPCOMING' || appt.status === 'ONGOING') ? (
          <Pressable
            onPress={onComplete}
            disabled={acting}
            className="flex-row items-center gap-1.5 bg-emerald-600 active:bg-emerald-700 px-3 py-2 rounded-lg">
            {acting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <CheckCircle size={13} color="#fff" />
            )}
            <Text className="text-white text-xs font-semibold">Atender</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onOpenDetail}
          className="flex-row items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg">
          <Eye size={13} color="#475569" />
          <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold">
            Detalle
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
