/**
 * Card — superficie blanca con borde, radius y sombra suave. Es el bloque
 * base de la mayoría de las pantallas del dashboard.
 */

import { View, ViewProps } from 'react-native';
import { ReactNode } from 'react';

interface CardProps extends ViewProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function Card({
  children,
  className = '',
  padded = true,
  ...rest
}: CardProps) {
  return (
    <View
      {...rest}
      className={[
        'bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800',
        padded ? 'p-4' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}>
      {children}
    </View>
  );
}

export function AuthCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <View
      className={[
        'bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-md w-full',
        'border border-slate-100 dark:border-slate-800',
        className,
      ]
        .filter(Boolean)
        .join(' ')}>
      {children}
    </View>
  );
}
