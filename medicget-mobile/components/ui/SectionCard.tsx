/**
 * SectionCard — card con título/subtítulo + acción opcional, contenedor de
 * bloques de contenido. Análogo a SectionCard en el frontend web.
 */

import { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Si true, no aplica padding al body (útil para listas con dividers). */
  noPadding?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = '',
  noPadding = false,
}: SectionCardProps) {
  const hasHeader = !!title || !!subtitle || !!action;
  return (
    <View
      className={[
        'bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}>
      {hasHeader && (
        <View className="flex-row items-start justify-between px-5 pt-4 pb-3 gap-3">
          <View className="flex-1">
            {title ? (
              <Text className="text-base font-semibold text-slate-800 dark:text-white">
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text className="text-xs text-slate-400 mt-0.5">{subtitle}</Text>
            ) : null}
          </View>
          {action ? <View>{action}</View> : null}
        </View>
      )}
      <View className={noPadding ? '' : hasHeader ? 'px-5 pb-4' : 'p-4'}>
        {children}
      </View>
    </View>
  );
}
