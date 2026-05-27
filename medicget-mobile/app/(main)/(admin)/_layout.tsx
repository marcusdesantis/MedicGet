/**
 * Layout del superadmin - tabs inferiores + ruteo protegido.
 *
 * Tras eliminar el sistema de planes/suscripciones, los tabs son:
 * Inicio, Usuarios, Pagos, Configuracion. Las pantallas viejas de
 * plans/subscriptions/notifications quedan como rutas hidden con
 * stub que redirige.
 */

import { Tabs } from 'expo-router';
import { Home, Receipt, Settings, Users } from 'lucide-react-native';
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
        {/* Rutas accesibles desde los atajos del home (no en el tab bar
            para no saturarlo). */}
        <Tabs.Screen name="verifications" options={{ href: null }} />
        <Tabs.Screen name="refunds"       options={{ href: null }} />
        <Tabs.Screen name="plans"         options={{ href: null }} />
        <Tabs.Screen name="subscriptions" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
      </Tabs>
    </ProtectedRoute>
  );
}
