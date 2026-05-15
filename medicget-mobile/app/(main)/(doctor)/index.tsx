/**
 * Doctor Dashboard — espejo del DoctorDashboardPage web.
 *
 * KPIs (hoy, semana, valoración, ingresos), agenda de hoy, gráfico de
 * citas semanales y reseñas recientes.
 */

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  ArrowRight,
  Calendar as CalendarIcon,
  Clock,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { StatCard } from '@/components/ui/StatCard';
import { SectionCard } from '@/components/ui/SectionCard';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { profileInitials } from '@/lib/format';
import {
  dashboardApi,
  type AppointmentDto,
  type ReviewDto,
} from '@/lib/api';

export default function DoctorHome() {
  const { user } = useAuth();
  const { state, refetch } = useApi(() => dashboardApi.doctor(), []);

  return (
    <Screen>
      <DashboardHeader
        roleLabel="Portal Médico"
        roleColor="bg-teal-600"
        notificationsHref="/(main)/(doctor)/notifications"
      />

      <Text className="text-xl font-bold text-slate-900 dark:text-white">
        ¡Hola, {user?.name ?? 'Doctor'}!
      </Text>
      <Text className="text-sm text-slate-500 mt-0.5 mb-4">
        Resumen de tu actividad médica
      </Text>

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

      {state.status === 'ready' ? (
        <DashboardBody
          stats={state.data.stats ?? {}}
          todaySchedule={state.data.todaySchedule ?? []}
          weeklyChart={state.data.weeklyChart ?? []}
          recentReviews={state.data.recentReviews ?? []}
        />
      ) : null}
    </Screen>
  );
}

interface BodyProps {
  stats: Partial<{
    todayCount: number;
    weekCount: number;
    monthCount: number;
    completedCount: number;
    avgRating: number;
    totalRevenue: number;
  }>;
  todaySchedule: AppointmentDto[];
  weeklyChart: { label: string; value: number }[];
  recentReviews: ReviewDto[];
}

function DashboardBody({
  stats,
  todaySchedule,
  weeklyChart,
  recentReviews,
}: BodyProps) {
  const router = useRouter();
  const todayCount = stats.todayCount ?? todaySchedule.length;
  const weekCount = stats.weekCount ?? 0;
  const avgRating = stats.avgRating ?? 0;
  const totalRevenue = stats.totalRevenue ?? 0;

  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <StatCard
          label="Citas hoy"
          value={todayCount}
          icon={CalendarIcon}
          iconColor="#0d9488"
          iconBg="bg-teal-100 dark:bg-teal-900/30"
        />
        <StatCard
          label="Esta semana"
          value={weekCount}
          icon={Users}
          iconColor="#7c3aed"
          iconBg="bg-violet-100 dark:bg-violet-900/30"
        />
      </View>
      <View className="flex-row gap-3">
        <StatCard
          label="Valoración"
          value={avgRating ? `${avgRating.toFixed(1)} ★` : '—'}
          icon={Star}
          iconColor="#f59e0b"
          iconBg="bg-amber-100 dark:bg-amber-900/30"
        />
        <StatCard
          label="Ingresos mes"
          value={`$${totalRevenue.toFixed(2)}`}
          icon={TrendingUp}
          iconColor="#10b981"
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
        />
      </View>

      <SectionCard
        title="Agenda de hoy"
        action={
          <Pressable
            onPress={() => router.push('/(main)/(doctor)/appointments')}>
            <Text className="text-xs text-teal-600 font-semibold">
              Ver todas →
            </Text>
          </Pressable>
        }
        noPadding>
        {todaySchedule.length === 0 ? (
          <EmptyState
            title="Sin citas para hoy"
            description="Cuando un paciente reserve, sus citas aparecerán acá."
            icon={CalendarIcon}
          />
        ) : (
          <View>
            {todaySchedule.map((appt) => (
              <AppointmentRow key={appt.id} appt={appt} />
            ))}
          </View>
        )}
      </SectionCard>

      {weeklyChart.length > 0 ? (
        <SectionCard
          title="Citas esta semana"
          subtitle={`Total: ${weekCount} consultas`}>
          <WeeklyChart data={weeklyChart} />
        </SectionCard>
      ) : null}

      {recentReviews.length > 0 ? (
        <SectionCard title="Valoraciones recientes" noPadding>
          <View>
            {recentReviews.slice(0, 5).map((r) => (
              <ReviewRow key={r.id} review={r} />
            ))}
          </View>
        </SectionCard>
      ) : null}

      <Pressable
        onPress={() => router.push('/(main)/(doctor)/payments')}
        className="flex-row items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-4 py-3">
        <View>
          <Text className="text-sm font-semibold text-slate-800 dark:text-white">
            Historial de pagos
          </Text>
          <Text className="text-xs text-slate-400">
            Revisá los cobros recibidos por consulta
          </Text>
        </View>
        <ArrowRight size={16} color="#94a3b8" />
      </Pressable>

      <Pressable
        onPress={() => router.push('/(main)/(doctor)/reports')}
        className="flex-row items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-4 py-3">
        <View>
          <Text className="text-sm font-semibold text-slate-800 dark:text-white">
            Reportes y analítica
          </Text>
          <Text className="text-xs text-slate-400">
            Tendencias, modalidades y pacientes recurrentes
          </Text>
        </View>
        <ArrowRight size={16} color="#94a3b8" />
      </Pressable>
    </View>
  );
}

function AppointmentRow({ appt }: { appt: AppointmentDto }) {
  const router = useRouter();
  const profile = appt.patient?.user?.profile;
  const name =
    `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() ||
    'Paciente';

  return (
    <Pressable
      onPress={() =>
        router.push(`/(main)/(doctor)/appointment/${appt.id}` as never)
      }
      className="flex-row items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-800/50">
      <Text className="text-sm font-bold text-slate-700 dark:text-slate-200 w-12 text-right">
        {appt.time}
      </Text>
      <Avatar
        initials={profileInitials(profile, 'PT')}
        imageUrl={profile?.avatarUrl ?? null}
        size="sm"
        variant="indigo"
      />
      <View className="flex-1 min-w-0">
        <Text
          numberOfLines={1}
          className="text-sm font-semibold text-slate-800 dark:text-white">
          {name}
        </Text>
        <Text className="text-xs text-slate-400 capitalize">
          {appt.status.toLowerCase()}
        </Text>
      </View>
      <Clock size={14} color="#cbd5e1" />
    </Pressable>
  );
}

function WeeklyChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View className="flex-row items-end gap-2 h-32">
      {data.map((d) => {
        const heightPct = (d.value / max) * 100;
        return (
          <View key={d.label} className="flex-1 items-center justify-end">
            <View
              className={`w-full rounded-t-md ${
                d.value > 0
                  ? 'bg-teal-600'
                  : 'bg-teal-100 dark:bg-teal-900/30'
              }`}
              style={{ height: `${Math.max(4, heightPct)}%` }}
            />
            <Text className="text-[10px] text-slate-500 mt-1">{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function ReviewRow({ review }: { review: ReviewDto }) {
  return (
    <View className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
      <View className="flex-row items-center gap-1">
        {Array.from({ length: review.rating }).map((_, i) => (
          <Star key={i} size={12} color="#f59e0b" fill="#fbbf24" />
        ))}
      </View>
      {review.comment ? (
        <Text
          numberOfLines={2}
          className="mt-1 text-sm text-slate-700 dark:text-slate-300">
          {review.comment}
        </Text>
      ) : null}
      <Text className="mt-1 text-[10px] text-slate-400">
        {new Date(review.createdAt).toLocaleDateString('es-ES')}
      </Text>
    </View>
  );
}
