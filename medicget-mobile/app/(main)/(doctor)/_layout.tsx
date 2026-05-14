import { Stack } from 'expo-router';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

export default function DoctorStack() {
  return (
    <ProtectedRoute allowedRole="doctor">
      <Stack screenOptions={{ headerShown: false }} />
    </ProtectedRoute>
  );
}
