import { Stack } from 'expo-router';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

export default function ClinicStack() {
  return (
    <ProtectedRoute allowedRole="clinic">
      <Stack screenOptions={{ headerShown: false }} />
    </ProtectedRoute>
  );
}
