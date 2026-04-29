import { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'patient' | 'doctor' | 'clinic';

interface User {
  username: string;
  role: UserRole;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  isAuthenticated: boolean;
}

const MOCK_CREDENTIALS: Record<string, { password: string; user: User }> = {
  paciente: {
    password: 'paciente',
    user: { username: 'paciente', role: 'patient', name: 'Ana García' },
  },
  medico: {
    password: 'medico',
    user: { username: 'medico', role: 'doctor', name: 'Dr. Carlos López' },
  },
  clinica: {
    password: 'clinica',
    user: { username: 'clinica', role: 'clinic', name: 'Clínica Salud Plus' },
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('mg_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (username: string, password: string) => {
    const entry = MOCK_CREDENTIALS[username.toLowerCase()];
    if (!entry || entry.password !== password) {
      return { success: false, error: 'Credenciales incorrectas' };
    }
    setUser(entry.user);
    localStorage.setItem('mg_user', JSON.stringify(entry.user));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mg_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
