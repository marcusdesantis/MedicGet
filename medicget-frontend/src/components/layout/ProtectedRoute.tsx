import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '@/context/AuthContext';
import type { ReactNode } from 'react';

interface Props {
  allowedRole: UserRole;
  children: ReactNode;
}

export function ProtectedRoute({ allowedRole, children }: Props) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== allowedRole) {
    const redirects: Record<UserRole, string> = {
      patient: '/patient',
      doctor: '/doctor',
      clinic: '/clinic',
    };
    return <Navigate to={redirects[user!.role]} replace />;
  }
  return <>{children}</>;
}
