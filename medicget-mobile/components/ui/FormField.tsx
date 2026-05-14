/**
 * FormField — wrapper estandarizado de label + control + helper/error.
 * No conoce el tipo de input — sólo envuelve children.
 */

import { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface FormFieldProps {
  label?: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  hint,
  error,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <View className={`${className}`}>
      {label ? (
        <Text className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          {label}
        </Text>
      ) : null}
      {children}
      {error ? (
        <Text className="text-xs text-rose-600 dark:text-rose-400 mt-1">
          {error}
        </Text>
      ) : hint ? (
        <Text className="text-xs text-slate-400 mt-1">{hint}</Text>
      ) : null}
    </View>
  );
}
