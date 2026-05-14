/**
 * Panel admin — placeholder. La paridad de las pantallas de admin
 * (usuarios, planes, suscripciones, pagos, settings) se aborda en
 * el siguiente sprint del wizard de migración.
 */

import { Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

export default function AdminHome() {
  return (
    <Screen>
      <DashboardHeader roleLabel="Panel Admin" roleColor="bg-rose-600" />
      <Card>
        <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Próximamente en la app
        </Text>
        <Text className="text-sm text-slate-500 mt-2">
          La gestión de usuarios, planes, suscripciones y configuración estará
          disponible en la siguiente actualización móvil. Usa el portal web
          mientras tanto.
        </Text>
      </Card>
    </Screen>
  );
}
