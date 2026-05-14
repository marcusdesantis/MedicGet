/**
 * Dashboard de la clínica — esqueleto inicial. Consume
 * `dashboardApi.clinic()` y muestra stats agregadas.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { ClinicDashboardDto, dashboardApi } from '@/lib/api';

export default function ClinicHome() {
  const [data, setData] = useState<ClinicDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await dashboardApi.clinic();
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
      <DashboardHeader roleLabel="Portal Clínica" roleColor="bg-indigo-600" />

      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" />
      ) : error ? (
        <Card>
          <Text className="text-rose-600">{error}</Text>
        </Card>
      ) : data ? (
        <View className="gap-3">
          <Card>
            <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {data.clinic.name}
            </Text>
            <Text className="text-xs text-slate-500 mt-1">
              {data.clinic.city ?? ''}
              {data.clinic.province ? `, ${data.clinic.province}` : ''}
            </Text>
          </Card>

          <View className="flex-row gap-3">
            <Card className="flex-1">
              <Text className="text-xs text-slate-500">Médicos</Text>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {data.stats.totalDoctors}
              </Text>
            </Card>
            <Card className="flex-1">
              <Text className="text-xs text-slate-500">Pacientes</Text>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {data.stats.totalPatients}
              </Text>
            </Card>
          </View>

          <View className="flex-row gap-3">
            <Card className="flex-1">
              <Text className="text-xs text-slate-500">Hoy</Text>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {data.stats.todayAppointments}
              </Text>
            </Card>
            <Card className="flex-1">
              <Text className="text-xs text-slate-500">Este mes</Text>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {data.stats.monthAppointments}
              </Text>
            </Card>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
