/**
 * Alert — banner inline con variantes. Usado para errores generales en
 * pantallas de login / registro cuando el error no puede atribuirse a un
 * único campo.
 */

import { Text, View } from 'react-native';
import { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react-native';

type Variant = 'error' | 'success' | 'info' | 'warning';

const config: Record<Variant, { bg: string; text: string; icon: ReactNode }> = {
  error: {
    bg: 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-300',
    icon: <AlertCircle size={18} color="#e11d48" />,
  },
  success: {
    bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: <CheckCircle2 size={18} color="#059669" />,
  },
  info: {
    bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    icon: <Info size={18} color="#2563eb" />,
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    icon: <TriangleAlert size={18} color="#d97706" />,
  },
};

interface AlertProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

export function Alert({ variant = 'info', children, className = '' }: AlertProps) {
  const c = config[variant];
  return (
    <View className={`flex-row items-start gap-2 rounded-xl border px-3 py-2.5 ${c.bg} ${className}`}>
      <View className="mt-0.5">{c.icon}</View>
      <View className="flex-1">
        {typeof children === 'string' ? (
          <Text className={`text-sm ${c.text}`}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}
