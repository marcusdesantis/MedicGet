/**
 * Patient Dashboard — espejo del PatientDashboardPage web.
 *
 * Muestra KPIs (próximas, completadas, total invertido, próxima cita),
 * citas recientes y notificaciones. Tap en "Buscar médico" lleva al tab
 * de búsqueda.
 */

import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import {
  ArrowRight,
  Bell,
  Calendar as CalendarIcon,
  Clock,
  FileText,
  Star,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { StatCard } from '@/components/ui/StatCard';
import { SectionCard } from '@/components/ui/SectionCard';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { useAuth } from '@/context/AuthContext';
import { appointmentStatusMap } from '@/lib/statusConfig';
import { fmtShortDate, profileInitials } from '@/lib/format';
import {
  dashboardApi,
  type AppointmentDto,
  type NotificationDto,
} from '@/lib/api';

export default function PatientHome() {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0] ?? 'Paciente';
  const { state, refetch } = useApi(() => dashboardApi.patient(), []);
  useRefetchOnFocus(refetch);

  return (
    <Screen>
      <DashboardHeader
        roleLabel="Portal Paciente"
        roleColor="bg-blue-600"
        notificationsHref="/(main)/(patient)/notifications"
      />

      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1 pr-3">
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">
            ¡Hola, {firstName}! 👋
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Resumen de tu actividad médica
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(main)/(patient)/search')}
          className="flex-row items-center bg-blue-600 active:bg-blue-700 px-3 py-2 rounded-xl">
          <Text className="text-white text-xs font-semibold mr-1">
            Buscar médico
          </Text>
          <ArrowRight size={14} color="#fff" />
        </Pressable>
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

      {state.status === 'ready' && (
        <DashboardBody
          stats={state.data.stats}
          nextAppointment={state.data.nextAppointment}
          recentAppointments={state.data.recentAppointments}
          notifications={state.data.notifications}
        />
      )}
    </Screen>
  );
}

interface BodyProps {
  stats: {
    upcoming: number;
    completed: number;
    cancelled: number;
    totalSpent: number;
  };
  nextAppointment: AppointmentDto | null;
  recentAppointments: AppointmentDto[];
  notifications: NotificationDto[];
}

function DashboardBody({
  stats,
  nextAppointment,
  recentAppointments,
  notifications,
}: BodyProps) {
  const router = useRouter();
  const upcoming = stats.upcoming ?? 0;
  const completed = stats.completed ?? 0;
  const totalSpent = stats.totalSpent ?? 0;

  return (
    <View className="gap-4">
      {/* KPIs */}
      <View className="flex-row gap-3">
        <StatCard
          label="Próximas citas"
          value={upcoming}
          icon={CalendarIcon}
          iconColor="#2563eb"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          label="Completadas"
          value={completed}
          icon={FileText}
          iconColor="#7c3aed"
          iconBg="bg-violet-100 dark:bg-violet-900/30"
        />
      </View>
      <View className="flex-row gap-3">
        <StatCard
          label="Total invertido"
          value={`$${totalSpent.toFixed(2)}`}
          icon={Star}
          iconColor="#f59e0b"
          iconBg="bg-amber-100 dark:bg-amber-900/30"
        />
        <StatCard
          label="Próxima cita"
          value={
            nextAppointment
              ? `${fmtShortDate(nextAppointment.date)} · ${nextAppointment.time}`
              : 'Sin programar'
          }
          icon={Clock}
          iconColor="#10b981"
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
        />
      </View>

      {/* Recent appointments */}
      <SectionCard
        title="Citas recientes"
        action={
          <Pressable
            onPress={() => router.push('/(main)/(patient)/appointments')}>
            <Text className="text-xs text-blue-600 font-semibold">
              Ver todas →
            </Text>
          </Pressable>
        }
        noPadding>
        {recentAppointments.length === 0 ? (
          <EmptyState
            title="Aún no tienes citas"
            description="Empieza buscando un especialista para agendar tu primera consulta."
            icon={CalendarIcon}
          />
        ) : (
          <View className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentAppointments.slice(0, 5).map((appt) => (
              <AppointmentRow key={appt.id} appt={appt} />
            ))}
          </View>
        )}
      </SectionCard>

      {/* Notifications */}
      <SectionCard
        title="Notificaciones"
        action={
          <Pressable
            onPress={() => router.push('/(main)/(patient)/notifications')}>
            <Text className="text-xs text-blue-600 font-semibold">
              Ver todas →
            </Text>
          </Pressable>
        }
        noPadding>
        {!notifications || notifications.length === 0 ? (
          <EmptyState
            title="Todo al día"
            description="No tienes notificaciones nuevas."
            icon={Bell}
          />
        ) : (
          <View>
            {notifications.slice(0, 5).map((n) => (
              <NotificationRow key={n.id} notif={n} />
            ))}
          </View>
        )}
      </SectionCard>
    </View>
  );
}

function AppointmentRow({ appt }: { appt: AppointmentDto }) {
  const router = useRouter();
  const profile = appt.doctor?.user?.profile;
  const initials = profileInitials(profile, 'DR');
  const docName =
    `Dr. ${[profile?.firstName, profile?.lastName].filter(Boolean).join(' ')}`.trim();

  return (
    <Pressable
      onPress={() =>
        router.push(`/(main)/(patient)/appointment/${appt.id}` as never)
      }
      className="flex-row items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-800/50">
      <Avatar
        initials={initials}
        imageUrl={profile?.avatarUrl ?? null}
        size="md"
        variant="blue"
      />
      <View className="flex-1 min-w-0">
        <Text
          numberOfLines={1}
          className="text-sm font-semibold text-slate-800 dark:text-white">
          {docName || 'Médico'}
        </Text>
        <Text numberOfLines={1} className="text-xs text-slate-400">
          {appt.doctor?.specialty ?? '—'}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-xs text-slate-600 dark:text-slate-300">
          {fmtShortDate(appt.date)} · {appt.time}
        </Text>
        <View className="mt-1">
          <StatusBadge
            status={appt.status.toLowerCase()}
            statusMap={appointmentStatusMap}
            size="sm"
          />
        </View>
      </View>
    </Pressable>
  );
}

function NotificationRow({ notif }: { notif: NotificationDto }) {
  return (
    <View className="flex-row items-start gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <Bell size={16} color={notif.isRead ? '#94a3b8' : '#2563eb'} />
      <View className="flex-1 min-w-0">
        <Text
          numberOfLines={1}
          className="text-sm font-semibold text-slate-800 dark:text-white">
          {notif.title}
        </Text>
        <Text numberOfLines={2} className="text-xs text-slate-500 mt-0.5">
          {notif.message}
        </Text>
      </View>
    </View>
  );
}
