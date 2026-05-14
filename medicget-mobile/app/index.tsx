/**
 * Splash / arranque — espera a que el AuthContext termine su bootstrap
 * (lectura de SecureStore + /auth/me) y redirige:
 *   - autenticado → /(main)/<role>
 *   - sin sesión  → /(auth)/login
 */

import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth, UserRole } from '@/context/AuthContext';

const ROLE_HOME: Record<UserRole, string> = {
  patient: '/(main)/(patient)',
  doctor: '/(main)/(doctor)',
  clinic: '/(main)/(clinic)',
  admin: '/(main)/(admin)',
};

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href={ROLE_HOME[user.role] as any} />;
}
