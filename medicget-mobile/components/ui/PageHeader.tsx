/**
 * PageHeader — título grande + subtítulo + acción opcional a la derecha.
 * Espejo del PageHeader del frontend web.
 */

import { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <View className="flex-row items-start justify-between gap-3 mb-4">
      <View className="flex-1 pr-2">
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View className="flex-shrink-0">{action}</View> : null}
    </View>
  );
}
