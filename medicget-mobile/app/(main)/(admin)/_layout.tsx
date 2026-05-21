/**
 * Layout del superadmin - tabs inferiores + ruteo protegido.
 *
 * Seis tabs principales: Inicio, Usuarios, Planes, Suscripciones,
 * Pagos, Configuracion. Notificaciones queda como hidden (se navega
 * desde el header).
 */

import { Tabs } from 'expo-router';
import {
  CreditCard,
  Home,
  Receipt,
  Settings,
  Tag,
  Users,
} from 'lucide-react-native';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useTabBarStyle } from '@/components/layout/useTabBarStyle';

export default function AdminLayout() {
  const tabBar = useTabBarStyle('#e11d48');
  return (
    <ProtectedRoute allowedRole="admin">
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
          name="users"
          options={{
            title: 'Usuarios',
            tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="plans"
          options={{
            title: 'Planes',
            tabBarIcon: ({ color, size }) => <Tag color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="subscriptions"
          options={{
            title: 'Subs',
            tabBarIcon: ({ color, size }) => (
              <CreditCard color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="payments"
          options={{
            title: 'Pagos',
            tabBarIcon: ({ color, size }) => (
              <Receipt color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Config',
            tabBarIcon: ({ color, size }) => (
              <Settings color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen name="notifications" options={{ href: null }} />
      </Tabs>
    </ProtectedRoute>
  );
}
