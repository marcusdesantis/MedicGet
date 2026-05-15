/**
 * Layout del paciente — tabs inferiores + protección de ruta.
 *
 * Replica las cinco zonas principales del portal paciente del frontend
 * web: Inicio (dashboard), Buscar (médicos), Citas, Historial, Perfil.
 */

import { Tabs } from 'expo-router';
import {
  Calendar as CalendarIcon,
  FileHeart,
  Home,
  Search,
  UserRound,
} from 'lucide-react-native';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useTabBarStyle } from '@/components/layout/useTabBarStyle';

export default function PatientLayout() {
  const tabBar = useTabBarStyle('#2563eb');
  return (
    <ProtectedRoute allowedRole="patient">
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
          name="search"
          options={{
            title: 'Buscar',
            tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
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
          name="medical-history"
          options={{
            title: 'Historial',
            tabBarIcon: ({ color, size }) => (
              <FileHeart color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => (
              <UserRound color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="doctor/[id]"
          options={{
            href: null, // Stack child — no aparece en la tab bar
          }}
        />
        <Tabs.Screen
          name="appointment/[id]/index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="appointment/[id]/chat"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="payment/return"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="payment/checkout/[id]"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}
