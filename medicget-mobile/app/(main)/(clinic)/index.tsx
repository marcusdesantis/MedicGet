/**
 * Clinic Dashboard — espejo del ClinicDashboardPage web.
 *
 * KPIs (médicos, citas hoy, pacientes, ingresos), gráfico de ingresos
 * mensuales, top médicos, citas recientes y atajos a Pagos / Reportes.
 */

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  ArrowRight,
  Calendar as CalendarIcon,
  DollarSign,
  Star,
  TrendingUp,
  UserCheck,
  Users,
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
import { profileInitials } from '@/lib/format';
import { appointmentStatusMap } from '@/lib/statusConfig';
import {
  dashboardApi,
  type AppointmentDto,
  type DoctorDto,
} from '@/lib/api';

export default function ClinicHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { state, refetch } = useApi(() => dashboardApi.clinic(), []);
  useRefetchOnFocus(refetch);

  return (
    <Screen>
      <DashboardHeader
        roleLabel="Portal Clínica"
        roleColor="bg-indigo-600"
        notificationsHref="/(main)/(clinic)/notifications"
      />

      <Text className="text-xl font-bold text-slate-900 dark:text-white">
        Panel — {user?.name ?? 'Clínica'}
      </Text>
      <Text className="text-sm text-slate-500 mt-0.5 mb-4">
        Resumen de actividad de la clínica
      </Text>

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

      {state.status === 'ready' ? (
        <DashboardBody
          stats={state.data.stats ?? {}}
          recentAppointments={state.data.recentAppointments ?? []}
          topDoctors={state.data.topDoctors ?? []}
          weeklyChart={state.data.weeklyChart ?? []}
          revenueByMonth={
            (state.data as unknown as {
              revenueByMonth?: { label: string; amount: number }[];
            }).revenueByMonth ?? []
          }
        />
      ) : null}
    </Screen>
  );
}

interface BodyProps {
  stats: Partial<{
    totalDoctors: number;
    totalPatients: number;
    todayAppointments: number;
    monthAppointments: number;
    pendingAppointments: number;
    totalRevenue: number;
    pendingRevenue: number;
  }>;
  recentAppointments: AppointmentDto[];
  topDoctors: { doctor: DoctorDto; appointmentCount: number }[];
  weeklyChart: { label: string; value: number }[];
  revenueByMonth: { label: string; amount: number }[];
}

function DashboardBody({
  stats,
  recentAppointments,
  topDoctors,
  weeklyChart,
  revenueByMonth,
}: BodyProps) {
  const router = useRouter();

  const revenueChart =
    revenueByMonth.length > 0
      ? revenueByMonth.map((m) => ({ label: m.label, value: m.amount }))
      : weeklyChart;

  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <StatCard
          label="Médicos activos"
          value={stats.totalDoctors ?? 0}
          icon={UserCheck}
          iconColor="#4f46e5"
          iconBg="bg-indigo-100 dark:bg-indigo-900/30"
        />
        <StatCard
          label="Citas hoy"
          value={stats.todayAppointments ?? 0}
          icon={CalendarIcon}
          iconColor="#2563eb"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
        />
      </View>
      <View className="flex-row gap-3">
        <StatCard
          label="Pacientes"
          value={stats.totalPatients ?? 0}
          icon={Users}
          iconColor="#7c3aed"
          iconBg="bg-violet-100 dark:bg-violet-900/30"
        />
        <StatCard
          label="Ingresos mes"
          value={`$${(stats.totalRevenue ?? 0).toFixed(2)}`}
          icon={DollarSign}
          iconColor="#10b981"
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
        />
      </View>

      {revenueChart.length > 0 ? (
        <SectionCard
          title="Ingresos mensuales"
          subtitle={`Total: $${(stats.totalRevenue ?? 0).toFixed(0)}`}>
          <BarChart data={revenueChart} color="#4f46e5" />
          {stats.pendingRevenue ? (
            <View className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Pendiente de cobro
                </Text>
                <Text className="text-sm font-bold text-amber-600">
                  ${stats.pendingRevenue.toFixed(2)}
                </Text>
              </View>
              <TrendingUp size={16} color="#10b981" />
            </View>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard
        title="Top médicos"
        action={
          <Pressable onPress={() => router.push('/(main)/(clinic)/doctors')}>
            <Text className="text-xs text-indigo-600 font-semibold">
              Ver todos →
            </Text>
          </Pressable>
        }
        noPadding>
        {topDoctors.length === 0 ? (
          <EmptyState
            title="Sin actividad todavía"
            description="Cuando tus médicos atiendan pacientes aparecerán acá."
          />
        ) : (
          <View>
            {topDoctors.slice(0, 5).map((entry, i) => {
              const d = entry.doctor;
              if (!d) return null;
              const profile = d.user?.profile;
              return (
                <View
                  key={d.id}
                  className="flex-row items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <Text className="text-xs font-bold text-slate-400 w-5">
                    #{i + 1}
                  </Text>
                  <Avatar
                    initials={profileInitials(profile, 'DR')}
                    imageUrl={profile?.avatarUrl ?? null}
                    size="sm"
                    variant="indigo"
                  />
                  <View className="flex-1 min-w-0">
                    <Text
                      numberOfLines={1}
                      className="text-sm font-semibold text-slate-800 dark:text-white">
                      Dr.{' '}
                      {[profile?.firstName, profile?.lastName]
                        .filter(Boolean)
                        .join(' ')}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="text-xs text-slate-400">
                      {d.specialty}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {entry.appointmentCount} citas
                    </Text>
                    {d.rating > 0 ? (
                      <View className="flex-row items-center gap-0.5">
                        <Star size={10} color="#f59e0b" fill="#fbbf24" />
                        <Text className="text-xs text-amber-500">
                          {d.rating.toFixed(1)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </SectionCard>

      <SectionCard
        title="Citas recientes"
        action={
          <Pressable
            onPress={() => router.push('/(main)/(clinic)/appointments')}>
            <Text className="text-xs text-indigo-600 font-semibold">
              Ver todas →
            </Text>
          </Pressable>
        }
        noPadding>
        {recentAppointments.length === 0 ? (
          <EmptyState
            title="No hay citas"
            description="Las citas de tus médicos aparecerán acá."
            icon={CalendarIcon}
          />
        ) : (
          <View>
            {recentAppointments.slice(0, 8).map((a) => (
              <AppointmentRow key={a.id} appt={a} />
            ))}
          </View>
        )}
      </SectionCard>

      <Pressable
        onPress={() => router.push('/(main)/(clinic)/payments')}
        className="flex-row items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-4 py-3">
        <View>
          <Text className="text-sm font-semibold text-slate-800 dark:text-white">
            Pagos
          </Text>
          <Text className="text-xs text-slate-400">
            KPIs financieros e historial
          </Text>
        </View>
        <ArrowRight size={16} color="#94a3b8" />
      </Pressable>

      <Pressable
        onPress={() => router.push('/(main)/(clinic)/reports')}
        className="flex-row items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-4 py-3">
        <View>
          <Text className="text-sm font-semibold text-slate-800 dark:text-white">
            Reportes y analítica
          </Text>
          <Text className="text-xs text-slate-400">
            Tendencias y métricas por rango
          </Text>
        </View>
        <ArrowRight size={16} color="#94a3b8" />
      </Pressable>

      <Pressable
        onPress={() => router.push('/(main)/(clinic)/specialties')}
        className="flex-row items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-4 py-3">
        <View>
          <Text className="text-sm font-semibold text-slate-800 dark:text-white">
            Especialidades
          </Text>
          <Text className="text-xs text-slate-400">
            Áreas de atención cubiertas
          </Text>
        </View>
        <ArrowRight size={16} color="#94a3b8" />
      </Pressable>
    </View>
  );
}

function AppointmentRow({ appt }: { appt: AppointmentDto }) {
  const patient = appt.patient?.user?.profile;
  const doctor = appt.doctor?.user?.profile;
  return (
    <View className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <View className="flex-row items-center gap-2 flex-wrap">
        <Text className="text-sm font-semibold text-slate-800 dark:text-white flex-1">
          {[patient?.firstName, patient?.lastName].filter(Boolean).join(' ') ||
            'Paciente'}
        </Text>
        <StatusBadge
          status={appt.status.toLowerCase()}
          statusMap={appointmentStatusMap}
          size="sm"
        />
      </View>
      <Text className="text-xs text-slate-500 mt-0.5">
        Dr. {[doctor?.firstName, doctor?.lastName].filter(Boolean).join(' ')}
        {' · '}
        {appt.doctor?.specialty}
      </Text>
      <Text className="text-[11px] text-slate-400 mt-0.5">
        {new Date(appt.date).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
        })}
        {' · '}
        {appt.time}
      </Text>
    </View>
  );
}

function BarChart({
  data,
  color,
}: {
  data: { label: string; value: number }[];
  color: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View className="flex-row items-end gap-2 h-32">
      {data.map((d) => {
        const heightPct = (d.value / max) * 100;
        return (
          <View key={d.label} className="flex-1 items-center justify-end">
            <View
              className="w-full rounded-t-md"
              style={{
                height: `${Math.max(4, heightPct)}%`,
                backgroundColor: d.value > 0 ? color : '#e0e7ff',
              }}
            />
            <Text className="text-[10px] text-slate-500 mt-1">{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
