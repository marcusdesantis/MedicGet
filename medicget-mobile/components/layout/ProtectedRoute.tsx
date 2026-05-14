/**
 * ProtectedRoute — bloquea el render hasta que el AuthContext termina
 * bootstrap. Si no hay usuario logueado, redirige a /(auth)/login.
 * Si `allowedRole` está definido y no coincide con el rol del usuario,
 * redirige al home de su propio rol.
 */

import { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth, UserRole } from '@/context/AuthContext';

const ROLE_HOME: Record<UserRole, string> = {
  patient: '/(main)/(patient)',
  doctor: '/(main)/(doctor)',
  clinic: '/(main)/(clinic)',
  admin: '/(main)/(admin)',
};

interface Props {
  children: ReactNode;
  allowedRole?: UserRole;
}

export function ProtectedRoute({ children, allowedRole }: Props) {
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

  if (allowedRole && user.role !== allowedRole) {
    return <Redirect href={ROLE_HOME[user.role] as any} />;
  }

  return <>{children}</>;
}
