/**
 * StatusBadge — píldora coloreada con label. La configuración de colores
 * vive en `lib/statusConfig`.
 */

import { Text, View } from 'react-native';

export interface StatusConfig {
  label: string;
  bg: string;
  text: string;
}

export type StatusMap = Record<string, StatusConfig>;

interface StatusBadgeProps {
  status: string;
  statusMap: StatusMap;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, statusMap, size = 'md' }: StatusBadgeProps) {
  const config =
    statusMap[status] ?? {
      label: status,
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-500 dark:text-slate-400',
    };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <View className={`self-start rounded-full ${sizeClass} ${config.bg}`}>
      <Text className={`${textSize} font-medium ${config.text}`}>
        {config.label}
      </Text>
    </View>
  );
}
