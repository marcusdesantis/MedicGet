/**
 * Doctor — Reportes. Espejo del DoctorReportsPage web.
 *
 * Filtros: 30d / 90d / Año / Todo. Calcula client-side desde el listado
 * completo de citas (mismo enfoque que la web):
 *   - KPIs: total, atendidas, no-shows, ingresos netos
 *   - Tendencias mensuales (citas + ingresos)
 *   - Distribución por modalidad (ONLINE / PRESENCIAL / CHAT)
 *   - Top pacientes recurrentes
 *
 * No incluye descarga CSV (requiere expo-file-system + sharing — se
 * puede agregar después). No gatea por plan; el web sí lo hace y, cuando
 * integremos suscripciones en mobile, podemos replicar el upsell.
 */

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  TriangleAlert,
  TrendingUp,
  Star,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { SectionCard } from '@/components/ui/SectionCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import {
  appointmentsApi,
  type AppointmentDto,
} from '@/lib/api';

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

export default function DoctorReports() {
  const router = useRouter();
  const [range, setRange] = useState<RangeKey>('90d');

  const { state, refetch } = useApi(
    () => appointmentsApi.list({ pageSize: 500 }),
    [],
  );
  useRefetchOnFocus(refetch);

  const data = useMemo(() => {
    if (state.status !== 'ready') return null;
    const all = state.data.data;
    const start = rangeStart(range);
    const filtered = start
      ? all.filter((a) => new Date(a.date) >= start)
      : all;

    const completed = filtered.filter((a) => a.status === 'COMPLETED').length;
    const noShows = filtered.filter((a) => a.status === 'NO_SHOW').length;
    const cancelled = filtered.filter((a) => a.status === 'CANCELLED').length;

    const grossRevenue = filtered
      .filter((a) => a.payment?.status === 'PAID')
      .reduce((s, a) => s + (a.payment?.doctorAmount ?? 0), 0);

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
        .reduce((s, a) => s + (a.payment?.doctorAmount ?? 0), 0);
      return {
        label: MONTH_LABELS[d.getMonth()] ?? '',
        count: monthAppts.length,
        revenue: monthRevenue,
      };
    });

    const byModality = {
      ONLINE: filtered.filter((a) => a.modality === 'ONLINE').length,
      PRESENCIAL: filtered.filter((a) => a.modality === 'PRESENCIAL').length,
      CHAT: filtered.filter((a) => a.modality === 'CHAT').length,
    };

    const patientMap = new Map<
      string,
      { name: string; count: number; lastDate: string }
    >();
    for (const a of filtered) {
      const id = a.patient?.id;
      if (!id) continue;
      const name =
        `${a.patient?.user?.profile?.firstName ?? ''} ${a.patient?.user?.profile?.lastName ?? ''}`.trim() ||
        'Paciente';
      const cur = patientMap.get(id) ?? {
        name,
        count: 0,
        lastDate: a.date,
      };
      cur.count += 1;
      if (new Date(a.date) > new Date(cur.lastDate)) cur.lastDate = a.date;
      patientMap.set(id, cur);
    }
    const topPatients = Array.from(patientMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: filtered.length,
      completed,
      noShows,
      cancelled,
      grossRevenue,
      monthly,
      byModality,
      topPatients,
    };
  }, [state, range]);

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
            Analítica de tu actividad clínica
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

      {state.status === 'loading' ? (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      ) : state.status === 'error' ? (
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
      ) : data && data.total === 0 ? (
        <EmptyState
          title="Sin datos en este rango"
          description="Probá con un rango más amplio."
          icon={CalendarIcon}
        />
      ) : data ? (
        <View className="gap-4">
          {/* KPIs */}
          <View className="flex-row gap-3">
            <Kpi
              icon={<CalendarIcon size={16} color="#2563eb" />}
              label="Citas totales"
              value={String(data.total)}
              tint="bg-blue-100 dark:bg-blue-900/30"
            />
            <Kpi
              icon={<TrendingUp size={16} color="#10b981" />}
              label="Atendidas"
              value={String(data.completed)}
              sub={`${data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0}% del total`}
              tint="bg-emerald-100 dark:bg-emerald-900/30"
            />
          </View>
          <View className="flex-row gap-3">
            <Kpi
              icon={<TriangleAlert size={16} color="#d97706" />}
              label="Inasistencias"
              value={String(data.noShows)}
              tint="bg-amber-100 dark:bg-amber-900/30"
            />
            <Kpi
              icon={<Star size={16} color="#7c3aed" />}
              label="Ingresos netos"
              value={`$${data.grossRevenue.toFixed(2)}`}
              sub="después de comisión"
              tint="bg-purple-100 dark:bg-purple-900/30"
            />
          </View>

          {/* Trends */}
          <SectionCard
            title="Tendencia de citas"
            subtitle="Citas por mes">
            <TrendBars
              data={data.monthly.map((m) => ({ label: m.label, value: m.count }))}
              color="#3b82f6"
            />
          </SectionCard>

          <SectionCard
            title="Tendencia de ingresos"
            subtitle="Neto recibido por mes">
            <TrendBars
              data={data.monthly.map((m) => ({ label: m.label, value: m.revenue }))}
              color="#8b5cf6"
              format={(v) => `$${v.toFixed(0)}`}
            />
          </SectionCard>

          {/* Modality distribution */}
          <SectionCard title="Distribución por modalidad">
            <View className="gap-3">
              {(Object.entries(data.byModality) as [string, number][]).map(
                ([m, count]) => {
                  const total = data.total || 1;
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
                },
              )}
            </View>
          </SectionCard>

          {/* Top patients */}
          <SectionCard
            title="Pacientes recurrentes"
            subtitle="Top 5 con más visitas">
            {data.topPatients.length === 0 ? (
              <Text className="text-sm text-slate-400 py-4 text-center">
                Sin datos suficientes todavía
              </Text>
            ) : (
              <View>
                {data.topPatients.map((p, i) => (
                  <View
                    key={i}
                    className="flex-row items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <Text className="text-sm font-medium text-slate-800 dark:text-white flex-1">
                      {p.name}
                    </Text>
                    <View className="bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                      <Text className="text-xs font-bold text-blue-600">
                        {p.count} visita{p.count === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>
        </View>
      ) : null}
    </Screen>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tint: string;
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
      {sub ? <Text className="text-[10px] text-slate-400">{sub}</Text> : null}
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
