/**
 * Admin Dashboard — espejo del AdminDashboardPage web.
 *
 * KPIs globales de la plataforma: usuarios por rol, actividad y revenue.
 */

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  BadgeCheck,
  Building2,
  Calendar as CalendarIcon,
  DollarSign,
  Percent,
  Stethoscope,
  UserCheck,
  Users,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert } from '@/components/ui/Alert';
import { useApi } from '@/hooks/useApi';
import { adminApi } from '@/lib/api';

function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function AdminHome() {
  const router = useRouter();
  const { state, refetch } = useApi(() => adminApi.stats(), []);

  return (
    <Screen>
      <DashboardHeader
        roleLabel="Panel Admin"
        roleColor="bg-rose-600"
        notificationsHref="/(main)/(admin)/notifications"
      />

      <Text className="text-xl font-bold text-slate-900 dark:text-white">
        Panel general
      </Text>
      <Text className="text-sm text-slate-500 mt-0.5 mb-4">
        Visión global de la plataforma MedicGet
      </Text>

      {state.status === 'loading' && (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      )}

      {state.status === 'error' && (
        <Alert variant="error">
          <Text className="text-rose-700 dark:text-rose-300 text-sm">
            {state.error.message}
          </Text>
          <Pressable onPress={refetch} className="mt-2">
            <Text className="text-rose-600 text-xs font-semibold">
              Reintentar
            </Text>
          </Pressable>
        </Alert>
      )}

      {state.status === 'ready' ? (
        <View className="gap-4">
          <SectionTitle>Usuarios</SectionTitle>
          <View className="flex-row gap-3">
            <Kpi
              icon={<Users size={16} color="#2563eb" />}
              tint="bg-blue-100 dark:bg-blue-900/30"
              label="Total activos"
              value={state.data.users.total}
            />
            <Kpi
              icon={<UserCheck size={16} color="#4f46e5" />}
              tint="bg-indigo-100 dark:bg-indigo-900/30"
              label="Pacientes"
              value={state.data.users.patients}
            />
          </View>
          <View className="flex-row gap-3">
            <Kpi
              icon={<Stethoscope size={16} color="#0d9488" />}
              tint="bg-teal-100 dark:bg-teal-900/30"
              label="Médicos"
              value={state.data.users.doctors}
            />
            <Kpi
              icon={<Building2 size={16} color="#7c3aed" />}
              tint="bg-purple-100 dark:bg-purple-900/30"
              label="Clínicas"
              value={state.data.users.clinics}
            />
          </View>

          <SectionTitle>Actividad</SectionTitle>
          <View className="flex-row gap-3">
            <Kpi
              icon={<CalendarIcon size={16} color="#4f46e5" />}
              tint="bg-indigo-100 dark:bg-indigo-900/30"
              label="Citas totales"
              value={state.data.appointments.total}
            />
            <Kpi
              icon={<DollarSign size={16} color="#10b981" />}
              tint="bg-emerald-100 dark:bg-emerald-900/30"
              label="Volumen pagado"
              value={fmtMoney(state.data.revenue.gross)}
            />
          </View>
          <View className="flex-row gap-3">
            <Kpi
              icon={<Percent size={16} color="#7c3aed" />}
              tint="bg-purple-100 dark:bg-purple-900/30"
              label="Comisión retenida"
              value={fmtMoney(state.data.revenue.platformFees)}
            />
            <Kpi
              icon={<BadgeCheck size={16} color="#d97706" />}
              tint="bg-amber-100 dark:bg-amber-900/30"
              label="Suscripciones"
              value={state.data.subscriptions.active}
            />
          </View>

          <SectionCard title="Atajos del superadmin">
            <Shortcut
              title="Usuarios"
              desc="Ver, suspender o eliminar cualquier cuenta. Impersonar para soporte."
              onPress={() => router.push('/(main)/(admin)/users')}
            />
            <Shortcut
              title="Planes"
              desc="Crear, editar y desactivar planes para médicos y clínicas."
              onPress={() => router.push('/(main)/(admin)/plans')}
            />
            <Shortcut
              title="Suscripciones"
              desc="Auditar pagos y extender períodos manualmente."
              onPress={() => router.push('/(main)/(admin)/subscriptions')}
            />
            <Shortcut
              title="Configuración"
              desc="SMTP, PayPhone, Jitsi, comisión y branding sin redeploy."
              onPress={() => router.push('/(main)/(admin)/settings')}
              last
            />
          </SectionCard>
        </View>
      ) : null}
    </Screen>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">
      {children}
    </Text>
  );
}

function Kpi({
  icon,
  tint,
  label,
  value,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: number | string;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <View
        className={`w-9 h-9 rounded-xl items-center justify-center ${tint}`}>
        {icon}
      </View>
      <Text className="text-[10px] text-slate-400 mt-2 uppercase tracking-wider">
        {label}
      </Text>
      <Text className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">
        {value}
      </Text>
    </View>
  );
}

function Shortcut({
  title,
  desc,
  onPress,
  last,
}: {
  title: string;
  desc: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`py-3 ${
        last ? '' : 'border-b border-slate-100 dark:border-slate-800'
      } active:bg-slate-50 dark:active:bg-slate-800/50 -mx-1 px-1`}>
      <Text className="text-sm font-semibold text-slate-800 dark:text-white">
        · {title}
      </Text>
      <Text className="text-xs text-slate-500 mt-0.5">{desc}</Text>
    </Pressable>
  );
}
