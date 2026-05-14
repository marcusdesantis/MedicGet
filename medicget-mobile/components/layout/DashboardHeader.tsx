/**
 * DashboardHeader — header simple para pantallas autenticadas. Muestra el
 * label del rol, saludo al usuario y botón de logout.
 */

import { Pressable, Text, View } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

interface DashboardHeaderProps {
  roleLabel: string;
  /** Tailwind class del color del badge (p. ej. "bg-blue-600"). */
  roleColor?: string;
}

export function DashboardHeader({
  roleLabel,
  roleColor = 'bg-blue-600',
}: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View className="flex-row items-center justify-between mb-4">
      <View className="flex-1 pr-3">
        <View className={`self-start px-2.5 py-0.5 rounded-full ${roleColor}`}>
          <Text className="text-[10px] font-semibold text-white uppercase tracking-wider">
            {roleLabel}
          </Text>
        </View>
        <Text className="text-xl font-bold text-slate-900 dark:text-white mt-2">
          Hola, {user?.name ?? 'usuario'}
        </Text>
        <Text className="text-xs text-slate-400">{user?.email}</Text>
      </View>
      <Pressable
        onPress={onLogout}
        hitSlop={8}
        className="w-10 h-10 rounded-full bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700 items-center justify-center">
        <LogOut size={18} color="#475569" />
      </Pressable>
    </View>
  );
}
