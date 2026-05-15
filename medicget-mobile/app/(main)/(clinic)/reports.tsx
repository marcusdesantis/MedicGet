/**
 * Clinic — Reportes. Espejo del ReportsPage web.
 *
 * Filtros: 30d / 90d / Año / Todo. KPIs (ingresos, citas, médicos
 * activos, pacientes únicos), tendencias mensuales (ingresos + citas),
 * top médicos y distribución por modalidad.
 */

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  DollarSign,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { SectionCard } from '@/components/ui/SectionCard';
import { Avatar } from '@/components/ui/Avatar';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { useApi } from '@/hooks/useApi';
import {
  appointmentsApi,
  dashboardApi,
  type AppointmentDto,
  type DoctorDto,
} from '@/lib/api';
import { profileInitials } from '@/lib/format';

const MONTH_LABELS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

type RangeKey = '30d' | '90d' | 'ytd' | 'all';

const RANGE_LABELS: Record<RangeKey, string> = {
  '30d': '30 días',
  '90d': '90 días',
  ytd: 'Año',
  all: 'Todo',
};

function rangeStart(range: RangeKey): Date | null {
  const now = new Date();
  if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (range === '90d') return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  if (range === 'ytd') return new Date(now.getFullYear(), 0, 1);
  return null;
}

export default function ClinicReports() {
  const router = useRouter();
  const [range, setRange] = useState<RangeKey>('90d');

  const dash = useApi(() => dashboardApi.clinic(), []);
  const appts = useApi(
    () => appointmentsApi.list({ pageSize: 500 }),
    [],
  );

  const dashData =
    dash.state.status === 'ready'
      ? {
          stats: dash.state.data.stats ?? ({} as Record<string, number | undefined>),
          topDoctors: dash.state.data.topDoctors ?? [],
        }
      : null;

  const aggregated = useMemo(() => {
    if (appts.state.status !== 'ready') return null;
    const all = appts.state.data.data;
    const start = rangeStart(range);
    const filtered = start
      ? all.filter((a) => new Date(a.date) >= start)
      : all;

    const monthsCount =
      range === '30d'
        ? 1
        : range === '90d'
          ? 3
          : range === 'ytd'
            ? new Date().getMonth() + 1
            : 12;
    const limit = Math.max(monthsCount, 6);
    const monthly = new Array(limit).fill(0).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (limit - 1 - i));
      const ym = `${d.getFullYear()}-${d.getMonth()}`;
      const monthAppts = filtered.filter((a) => {
        const ad = new Date(a.date);
        return `${ad.getFullYear()}-${ad.getMonth()}` === ym;
      });
      const monthRevenue = monthAppts
        .filter((a) => a.payment?.status === 'PAID')
        .reduce((s, a) => s + (a.payment?.amount ?? 0), 0);
      return {
        label: MONTH_LABELS[d.getMonth()] ?? '',
        count: monthAppts.length,
        revenue: monthRevenue,
      };
    });

    const uniquePatients = new Set<string>();
    for (const a of filtered) {
      if (a.patient?.id) uniquePatients.add(a.patient.id);
    }

    const byModality = {
      ONLINE: filtered.filter((a) => a.modality === 'ONLINE').length,
      PRESENCIAL: filtered.filter((a) => a.modality === 'PRESENCIAL').length,
      CHAT: filtered.filter((a) => a.modality === 'CHAT').length,
    };

    const grossRevenue = filtered
      .filter((a) => a.payment?.status === 'PAID')
      .reduce((s, a) => s + (a.payment?.amount ?? 0), 0);

    return {
      total: filtered.length,
      uniquePatients: uniquePatients.size,
      grossRevenue,
      monthly,
      byModality,
    };
  }, [appts.state, range]);

  return (
    <Screen>
      <View className="flex-row items-center gap-2 mb-4">
        <Pressable
          onPress={() => router.back()}
          hitSlop={6}
          className="w-9 h-9 rounded-lg items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <ArrowLeft size={16} color="#475569" />
        </Pressable>
        <View>
          <Text className="text-xl font-bold text-slate-800 dark:text-white">
            Reportes
          </Text>
          <Text className="text-xs text-slate-500">
            Analítica operativa y financiera
          </Text>
        </View>
      </View>

      <View className="flex-row gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-3">
        {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => {
          const selected = range === k;
          return (
            <Pressable
              key={k}
              onPress={() => setRange(k)}
              className={`flex-1 py-2 rounded-lg items-center ${
                selected ? 'bg-white dark:bg-slate-900' : ''
              }`}>
              <Text
                className={`text-xs font-medium ${
                  selected
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}>
                {RANGE_LABELS[k]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {appts.state.status === 'loading' ||
      dash.state.status === 'loading' ? (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : appts.state.status === 'error' ? (
        <Alert variant="error">{appts.state.error.message}</Alert>
      ) : aggregated ? (
        <View className="gap-4">
          {/* KPIs */}
          <View className="flex-row gap-3">
            <Kpi
              icon={<DollarSign size={16} color="#10b981" />}
              tint="bg-emerald-100 dark:bg-emerald-900/30"
              label="Ingresos"
              value={`$${aggregated.grossRevenue.toFixed(2)}`}
            />
            <Kpi
              icon={<CalendarIcon size={16} color="#2563eb" />}
              tint="bg-blue-100 dark:bg-blue-900/30"
              label="Citas"
              value={String(aggregated.total)}
            />
          </View>
          <View className="flex-row gap-3">
            <Kpi
              icon={<UserCheck size={16} color="#4f46e5" />}
              tint="bg-indigo-100 dark:bg-indigo-900/30"
              label="Médicos"
              value={String(dashData?.stats.totalDoctors ?? 0)}
            />
            <Kpi
              icon={<Users size={16} color="#7c3aed" />}
              tint="bg-violet-100 dark:bg-violet-900/30"
              label="Pacientes únicos"
              value={String(aggregated.uniquePatients)}
            />
          </View>

          <SectionCard
            title="Tendencia de citas"
            subtitle="Citas por mes">
            <TrendBars
              data={aggregated.monthly.map((m) => ({
                label: m.label,
                value: m.count,
              }))}
              color="#3b82f6"
            />
          </SectionCard>

          <SectionCard
            title="Tendencia de ingresos"
            subtitle="Cobrado por mes">
            <TrendBars
              data={aggregated.monthly.map((m) => ({
                label: m.label,
                value: m.revenue,
              }))}
              color="#10b981"
              format={(v) => `$${v.toFixed(0)}`}
            />
          </SectionCard>

          <SectionCard title="Distribución por modalidad">
            <View className="gap-3">
              {(
                Object.entries(aggregated.byModality) as [string, number][]
              ).map(([m, count]) => {
                const total = aggregated.total || 1;
                const pct = (count / total) * 100;
                const barColor =
                  m === 'ONLINE'
                    ? 'bg-blue-500'
                    : m === 'PRESENCIAL'
                      ? 'bg-rose-500'
                      : 'bg-emerald-500';
                return (
                  <View key={m}>
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-xs text-slate-600 dark:text-slate-300 font-medium capitalize">
                        {m.toLowerCase()}
                      </Text>
                      <Text className="text-xs text-slate-500">
                        {count} · {pct.toFixed(0)}%
                      </Text>
                    </View>
                    <View className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <View
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </SectionCard>

          {dashData?.topDoctors && dashData.topDoctors.length > 0 ? (
            <SectionCard
              title="Top médicos"
              subtitle="Más citas en el periodo"
              noPadding>
              <View>
                {dashData.topDoctors.slice(0, 5).map((entry, i) => {
                  const d = entry.doctor as DoctorDto | null;
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
                      <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {entry.appointmentCount}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </SectionCard>
          ) : null}
        </View>
      ) : (
        <EmptyState
          title="Sin datos"
          description="Probá con un rango más amplio."
        />
      )}
    </Screen>
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
  value: string;
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

function TrendBars({
  data,
  color,
  format,
}: {
  data: { label: string; value: number }[];
  color: string;
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <View>
      <View className="flex-row items-end gap-2 h-32">
        {data.map((d, i) => {
          const heightPct = (d.value / max) * 100;
          return (
            <View key={i} className="flex-1 items-center justify-end">
              <View
                className="w-full rounded-t-md"
                style={{
                  height: `${Math.max(4, heightPct)}%`,
                  backgroundColor: d.value > 0 ? color : '#e2e8f0',
                }}
              />
              <Text className="text-[10px] text-slate-500 mt-1">{d.label}</Text>
            </View>
          );
        })}
      </View>
      <Text className="text-[10px] text-slate-400 mt-2 text-right">
        Total: {format ? format(total) : total}
      </Text>
    </View>
  );
}
