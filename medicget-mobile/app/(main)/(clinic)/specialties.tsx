/**
 * Clinic — Especialidades. Espejo del SpecialtiesPage web.
 *
 * Las especialidades se derivan del listado de médicos asociados
 * (no hay tabla `Specialty` en backend). Mostramos por cada una:
 *   - cantidad total de médicos
 *   - disponibles ahora
 *   - rating promedio
 *   - precio promedio
 */

import { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ArrowLeft, BookOpen, TrendingUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { clinicsApi, type DoctorDto } from '@/lib/api';

interface SpecialtyGroup {
  specialty: string;
  doctorCount: number;
  availableCount: number;
  avgRating: number;
  avgPrice: number;
}

function groupBySpecialty(doctors: DoctorDto[]): SpecialtyGroup[] {
  const map = new Map<string, DoctorDto[]>();
  for (const d of doctors) {
    const list = map.get(d.specialty) ?? [];
    list.push(d);
    map.set(d.specialty, list);
  }
  return Array.from(map.entries())
    .map(([specialty, list]) => {
      const ratings = list.filter((d) => d.rating > 0).map((d) => d.rating);
      const prices = list
        .filter((d) => d.pricePerConsult > 0)
        .map((d) => d.pricePerConsult);
      return {
        specialty,
        doctorCount: list.length,
        availableCount: list.filter((d) => d.available).length,
        avgRating: ratings.length
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : 0,
        avgPrice: prices.length
          ? prices.reduce((a, b) => a + b, 0) / prices.length
          : 0,
      };
    })
    .sort((a, b) => b.doctorCount - a.doctorCount);
}

export default function ClinicSpecialties() {
  const router = useRouter();
  const { user } = useAuth();
  const clinicId = user?.dto.clinic?.id ?? null;

  const { state, refetch } = useApi(
    () => clinicsApi.getDoctors(clinicId!, { pageSize: 100 }),
    [clinicId],
  );

  const groups = useMemo(
    () => (state.status === 'ready' ? groupBySpecialty(state.data.data) : []),
    [state],
  );

  const totalDoctors = state.status === 'ready' ? state.data.data.length : 0;
  const availableNow =
    state.status === 'ready'
      ? state.data.data.filter((d) => d.available).length
      : 0;

  if (!clinicId) {
    return (
      <Screen>
        <Alert variant="error">No se pudo identificar tu clínica.</Alert>
      </Screen>
    );
  }

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
            Especialidades
          </Text>
          <Text className="text-xs text-slate-500">
            Áreas cubiertas por tus médicos
          </Text>
        </View>
      </View>

      <Alert variant="info">
        <Text className="text-sm text-blue-700 dark:text-blue-300">
          Las especialidades se derivan automáticamente del perfil de cada
          médico. Para añadir una nueva, asociá un médico de esa especialidad
          desde la pestaña <Text className="font-semibold">Médicos</Text>.
        </Text>
      </Alert>

      {state.status === 'loading' && (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      )}

      {state.status === 'error' && (
        <View className="mt-4">
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
        </View>
      )}

      {state.status === 'ready' && (
        <View className="gap-4 mt-4">
          <View className="flex-row gap-3">
            <SummaryCard
              label="Especialidades"
              value={groups.length}
              tint="text-indigo-600"
            />
            <SummaryCard
              label="Médicos"
              value={totalDoctors}
              tint="text-slate-800 dark:text-white"
            />
            <SummaryCard
              label="Disponibles"
              value={availableNow}
              tint="text-emerald-600"
            />
          </View>

          <SectionCard noPadding>
            {groups.length === 0 ? (
              <EmptyState
                title="Sin especialidades"
                description="Asociá médicos a tu clínica para que sus especialidades aparezcan acá."
                icon={BookOpen}
              />
            ) : (
              <View>
                {groups.map((g) => (
                  <SpecialtyRow key={g.specialty} group={g} />
                ))}
              </View>
            )}
          </SectionCard>
        </View>
      )}
    </Screen>
  );
}

function SummaryCard({
  label,
  value,
  tint,
}: {
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 items-center">
      <Text className={`text-xl font-bold ${tint}`}>{value}</Text>
      <Text className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">
        {label}
      </Text>
    </View>
  );
}

function SpecialtyRow({ group }: { group: SpecialtyGroup }) {
  return (
    <View className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <View className="flex-row items-center justify-between mb-1">
        <Text
          numberOfLines={1}
          className="flex-1 text-sm font-semibold text-slate-800 dark:text-white">
          {group.specialty}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-300 font-medium">
          {group.doctorCount}{' '}
          {group.doctorCount === 1 ? 'médico' : 'médicos'}
        </Text>
      </View>
      <View className="flex-row items-center gap-3 mt-1.5">
        <View className="flex-row items-center gap-1">
          <TrendingUp size={11} color="#10b981" />
          <Text className="text-xs font-semibold text-emerald-600">
            {group.availableCount}/{group.doctorCount} disponibles
          </Text>
        </View>
        {group.avgRating > 0 ? (
          <Text className="text-xs text-amber-500 font-medium">
            ★ {group.avgRating.toFixed(1)}
          </Text>
        ) : null}
        {group.avgPrice > 0 ? (
          <Text className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
            ${group.avgPrice.toFixed(0)} prom.
          </Text>
        ) : null}
      </View>
    </View>
  );
}
