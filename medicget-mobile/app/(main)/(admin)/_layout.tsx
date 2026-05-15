/**
 * Layout del superadmin — tabs inferiores + ruteo protegido.
 *
 * Cinco tabs principales: Inicio, Usuarios, Planes, Suscripciones,
 * Configuración. Pagos y notificaciones quedan como hidden.
 */

import { Tabs } from 'expo-router';
import {
  CreditCard,
  Home,
  Settings,
  Tag,
  Users,
} from 'lucide-react-native';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

export default function AdminLayout() {
  return (
    <ProtectedRoute allowedRole="admin">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#e11d48',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle: { borderTopColor: '#e2e8f0' },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
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
            title: 'Suscripciones',
            tabBarIcon: ({ color, size }) => (
              <CreditCard color={color} size={size} />
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
