/**
 * Index del área autenticada — redirige al home del rol del usuario.
 * Es defensa por si alguien navega a /(main) sin un subgrupo concreto.
 */

import { Redirect } from 'expo-router';
import { useAuth, UserRole } from '@/context/AuthContext';

const ROLE_HOME: Record<UserRole, string> = {
  patient: '/(main)/(patient)',
  doctor: '/(main)/(doctor)',
  clinic: '/(main)/(clinic)',
  admin: '/(main)/(admin)',
};

export default function MainIndex() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href={ROLE_HOME[user.role] as any} />;
}
