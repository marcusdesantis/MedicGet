/**
 * Dashboard del médico — esqueleto inicial. Consume
 * `dashboardApi.doctor()` y muestra stats clave.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { dashboardApi, DoctorDashboardDto } from '@/lib/api';

export default function DoctorHome() {
  const [data, setData] = useState<DoctorDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await dashboardApi.doctor();
        if (mounted) setData(res.data);
      } catch {
        if (mounted) setError('No se pudo cargar tu información.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Screen>
      <DashboardHeader roleLabel="Portal Médico" roleColor="bg-teal-600" />

      {loading ? (
        <ActivityIndicator size="large" color="#0d9488" />
      ) : error ? (
        <Card>
          <Text className="text-rose-600">{error}</Text>
        </Card>
      ) : data ? (
        <View className="gap-3">
          <View className="flex-row gap-3">
            <Card className="flex-1">
              <Text className="text-xs text-slate-500">Hoy</Text>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {data.stats.todayCount}
              </Text>
            </Card>
            <Card className="flex-1">
              <Text className="text-xs text-slate-500">Esta semana</Text>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {data.stats.weekCount}
              </Text>
            </Card>
          </View>

          <View className="flex-row gap-3">
            <Card className="flex-1">
              <Text className="text-xs text-slate-500">Pendientes</Text>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {data.stats.pendingCount}
              </Text>
            </Card>
            <Card className="flex-1">
              <Text className="text-xs text-slate-500">Rating</Text>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {data.stats.avgRating.toFixed(1)}
              </Text>
            </Card>
          </View>

          <Card>
            <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Agenda de hoy
            </Text>
            {data.todaySchedule.length === 0 ? (
              <Text className="text-sm text-slate-500 mt-2">
                No hay citas para hoy.
              </Text>
            ) : (
              <View className="mt-3 gap-2">
                {data.todaySchedule.slice(0, 5).map((a) => (
                  <View key={a.id} className="border-l-2 border-teal-500 pl-3">
                    <Text className="text-sm text-slate-800 dark:text-slate-100">
                      {a.time} · {a.patient.user.profile.firstName}{' '}
                      {a.patient.user.profile.lastName}
                    </Text>
                    <Text className="text-xs text-slate-500">
                      {a.modality}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
