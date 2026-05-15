/**
 * EmptyState — placeholder cuando una lista o sección no tiene resultados.
 */

import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Inbox, type LucideIcon } from 'lucide-react-native';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: EmptyStateProps) {
  return (
    <View className="items-center justify-center py-10 px-6">
      <View className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center mb-3">
        <Icon size={22} color="#94a3b8" />
      </View>
      <Text className="text-base font-semibold text-slate-800 dark:text-white text-center">
        {title}
      </Text>
      {description ? (
        <Text className="text-sm text-slate-500 dark:text-slate-400 text-center mt-1">
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-4">{action}</View> : null}
    </View>
  );
}
