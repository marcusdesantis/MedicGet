/**
 * StatCard — KPI con label, valor grande, icono coloreado. Espejo del
 * StatCard del frontend web.
 */

import { Text, View } from 'react-native';
import { type LucideIcon } from 'lucide-react-native';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = '#2563eb',
  iconBg = 'bg-blue-100 dark:bg-blue-900/30',
}: StatCardProps) {
  return (
    <View className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
      <View className="flex-row items-center justify-between">
        <View className={`w-9 h-9 rounded-xl items-center justify-center ${iconBg}`}>
          <Icon size={18} color={iconColor} />
        </View>
      </View>
      <Text className="text-xs text-slate-500 dark:text-slate-400 mt-3">
        {label}
      </Text>
      <Text className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
        {value}
      </Text>
    </View>
  );
}
