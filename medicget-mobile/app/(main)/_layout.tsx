/**
 * Stack raíz del área autenticada. Protege todo lo que cuelga debajo —
 * si no hay sesión, redirige a /(auth)/login.
 */

import { Stack } from 'expo-router';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

export default function MainLayout() {
  return (
    <ProtectedRoute>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(patient)" />
        <Stack.Screen name="(doctor)" />
        <Stack.Screen name="(clinic)" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </ProtectedRoute>
  );
}
