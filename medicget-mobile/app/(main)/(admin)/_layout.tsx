import { Stack } from 'expo-router';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

export default function AdminStack() {
  return (
    <ProtectedRoute allowedRole="admin">
      <Stack screenOptions={{ headerShown: false }} />
    </ProtectedRoute>
  );
}
