/**
 * Clinic — Citas. Espejo del ClinicAppointmentsPage web.
 *
 * Vista global de todas las citas de los médicos asociados. Filtros:
 * tabs por status + búsqueda por paciente o médico. La clínica puede
 * cancelar citas (DELETE — exclusivo de su rol).
 */

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  Calendar as CalendarIcon,
  Clock,
  X,
} from 'lucide-react-native';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { SearchInput } from '@/components/ui/SearchInput';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionCard } from '@/components/ui/SectionCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { fmtShortDate, profileInitials } from '@/lib/format';
import {
  appointmentsApi,
  type AppointmentDto,
} from '@/lib/api';

const TABS = ['Todas', 'Pendientes', 'Próximas', 'Completadas', 'Canceladas'] as const;
type TabType = (typeof TABS)[number];

const TAB_STATUSES: Record<TabType, string[] | null> = {
  Todas: null,
  Pendientes: ['PENDING'],
  Próximas: ['UPCOMING', 'ONGOING'],
  Completadas: ['COMPLETED'],
  Canceladas: ['CANCELLED', 'NO_SHOW'],
};

function fullName(p?: { firstName?: string; lastName?: string }): string {
  return [p?.firstName, p?.lastName].filter(Boolean).join(' ') || '—';
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export default function ClinicAppointments() {
  const [tab, setTab] = useState<TabType>('Todas');
  const [search, setSearch] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
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
      if (!matchStatus) return false;
      if (!q) return true;
      const patient = fullName(a.patient?.user?.profile);
      const doctor = fullName(a.doctor?.user?.profile);
      return normalize(patient).includes(q) || normalize(doctor).includes(q);
    });
  }, [state, tab, search]);

  const handleCancel = (id: string) => {
    RNAlert.alert(
      'Cancelar cita',
      '¿Seguro que querés cancelar esta cita? El paciente será notificado.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(id);
            setActionError(null);
            try {
              await appointmentsApi.cancel(id);
              refetch();
            } catch (err: unknown) {
              const msg =
                (err as { response?: { data?: { error?: { message?: string } } } })
                  ?.response?.data?.error?.message ??
                'No se pudo cancelar la cita';
              setActionError(msg);
            } finally {
              setCancellingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <PageHeader
        title="Citas de la clínica"
        subtitle="Todas las citas de tus médicos asociados"
      />

      <View className="gap-3 mb-3">
        <Tabs
          tabs={[...TABS]}
          active={tab}
          onChange={(v) => setTab(v as TabType)}
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar paciente o médico..."
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
        <Alert variant="error">
          <Text className="text-rose-700 dark:text-rose-300 text-sm">
            {state.error.message}
          </Text>
          <Pressable onPress={refetch} className="mt-2">
            <Text className="text-indigo-600 text-xs font-semibold">
              Reintentar
            </Text>
          </Pressable>
        </Alert>
      )}

      {state.status === 'ready' && (
        <SectionCard noPadding>
          {visible.length === 0 ? (
            <EmptyState
              title="Sin citas"
              description="Cuando se reserven citas con los médicos de tu clínica, aparecerán aquí."
              icon={CalendarIcon}
            />
          ) : (
            <View>
              {visible.map((a) => (
                <AppointmentRow
                  key={a.id}
                  appt={a}
                  cancelling={cancellingId === a.id}
                  onCancel={() => handleCancel(a.id)}
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
  cancelling,
  onCancel,
}: {
  appt: AppointmentDto;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const patient = appt.patient?.user?.profile;
  const doctor = appt.doctor?.user?.profile;
  const cancellable = appt.status === 'PENDING' || appt.status === 'UPCOMING';

  return (
    <View className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
      <View className="flex-row items-start gap-3">
        <Avatar
          initials={profileInitials(patient, 'PT')}
          imageUrl={patient?.avatarUrl ?? null}
          size="md"
          variant="blue"
        />
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text
              numberOfLines={1}
              className="font-semibold text-slate-800 dark:text-white flex-shrink">
              {fullName(patient)}
            </Text>
            <StatusBadge
              status={appt.status.toLowerCase()}
              statusMap={appointmentStatusMap}
              size="sm"
            />
          </View>
          <Text className="text-xs text-slate-500 mt-0.5">
            Dr. {fullName(doctor)} · {appt.doctor?.specialty ?? '—'}
          </Text>
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
            <Text className="text-xs font-semibold text-slate-800 dark:text-white">
              ${appt.price.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {cancellable ? (
        <View className="flex-row justify-end mt-3">
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
        </View>
      ) : null}
    </View>
  );
}
