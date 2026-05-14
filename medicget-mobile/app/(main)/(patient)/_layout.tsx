import { Stack } from 'expo-router';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

export default function PatientStack() {
  return (
    <ProtectedRoute allowedRole="patient">
      <Stack screenOptions={{ headerShown: false }} />
    </ProtectedRoute>
  );
}
