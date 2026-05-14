/**
 * Dashboard del paciente — esqueleto inicial que consume
 * `dashboardApi.patient()`. Las siguientes iteraciones añadirán
 * búsqueda de médicos, citas, historial, perfil.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { CalendarClock } from 'lucide-react-native';

import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { dashboardApi, PatientDashboardDto } from '@/lib/api';

export default function PatientHome() {
  const [data, setData] = useState<PatientDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await dashboardApi.patient();
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
      <DashboardHeader roleLabel="Portal Paciente" roleColor="bg-blue-600" />

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" />
      ) : error ? (
        <Card>
          <Text className="text-rose-600">{error}</Text>
        </Card>
      ) : data ? (
        <View className="gap-3">
          <View className="flex-row gap-3">
            <Card className="flex-1">
              <Text className="text-xs text-slate-500">Próximas</Text>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {data.stats.upcoming}
              </Text>
            </Card>
            <Card className="flex-1">
              <Text className="text-xs text-slate-500">Completadas</Text>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {data.stats.completed}
              </Text>
            </Card>
          </View>

          <Card>
            <View className="flex-row items-center gap-2 mb-2">
              <CalendarClock size={18} color="#2563eb" />
              <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">
                Próxima cita
              </Text>
            </View>
            {data.nextAppointment ? (
              <View>
                <Text className="text-sm text-slate-700 dark:text-slate-200">
                  {data.nextAppointment.date} · {data.nextAppointment.time}
                </Text>
                <Text className="text-xs text-slate-500 mt-1">
                  Dr. {data.nextAppointment.doctor.user.profile.firstName}{' '}
                  {data.nextAppointment.doctor.user.profile.lastName} ·{' '}
                  {data.nextAppointment.doctor.specialty}
                </Text>
              </View>
            ) : (
              <Text className="text-sm text-slate-500">
                Aún no tienes citas programadas.
              </Text>
            )}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
