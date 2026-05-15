/**
 * Layout del médico — tabs inferiores + ruteo protegido.
 *
 * Cinco tabs principales: Inicio (dashboard), Agenda (citas), Horarios
 * (disponibilidad), Pacientes (historial), Perfil. Detalle/chat/payments
 * viven como rutas hidden.
 */

import { Tabs } from 'expo-router';
import {
  Calendar as CalendarIcon,
  CalendarClock,
  Home,
  UserRound,
  Users,
} from 'lucide-react-native';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

export default function DoctorLayout() {
  return (
    <ProtectedRoute allowedRole="doctor">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#0d9488',
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
          name="appointments"
          options={{
            title: 'Agenda',
            tabBarIcon: ({ color, size }) => (
              <CalendarIcon color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Horarios',
            tabBarIcon: ({ color, size }) => (
              <CalendarClock color={color} size={size} />
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
              <UserRound color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="appointment/[id]/index"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="appointment/[id]/chat"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="payments"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="notifications"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="reports"
          options={{ href: null }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}
