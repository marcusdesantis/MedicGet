/**
 * Layout de la clínica — tabs inferiores + ruteo protegido.
 *
 * Cinco tabs principales: Inicio, Agenda, Médicos, Pacientes, Perfil.
 * Pagos, reportes y notificaciones viven como hidden.
 */

import { Tabs } from 'expo-router';
import {
  Building2,
  Calendar as CalendarIcon,
  Home,
  Stethoscope,
  Users,
} from 'lucide-react-native';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useTabBarStyle } from '@/components/layout/useTabBarStyle';

export default function ClinicLayout() {
  const tabBar = useTabBarStyle('#4f46e5');
  return (
    <ProtectedRoute allowedRole="clinic">
      <Tabs
        screenOptions={{
          headerShown: false,
          ...tabBar,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="appointments"
          options={{
            title: 'Citas',
            tabBarIcon: ({ color, size }) => (
              <CalendarIcon color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="doctors"
          options={{
            title: 'Médicos',
            tabBarIcon: ({ color, size }) => (
              <Stethoscope color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="patients"
          options={{
            title: 'Pacientes',
            tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => (
              <Building2 color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen name="payments" options={{ href: null }} />
        <Tabs.Screen name="reports" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="specialties" options={{ href: null }} />
      </Tabs>
    </ProtectedRoute>
  );
}
