import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '@/context/AuthContext';
import type { ReactNode } from 'react';

interface Props {
  allowedRole: UserRole;
  children: ReactNode;
}

export function ProtectedRoute({ allowedRole, children }: Props) {
  const { user, isAuthenticated, loading } = useAuth();

  // While bootstrapping the session from stored token, render nothing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Verificando sesión…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.role !== allowedRole) {
    const redirects: Record<UserRole, string> = {
      patient: '/patient',
      doctor:  '/doctor',
      clinic:  '/clinic',
    };
    return <Navigate to={redirects[user!.role]} replace />;
  }

  return <>{children}</>;
}
