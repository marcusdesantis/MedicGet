/**
 * Typography — primitivas tipográficas con variantes preseteadas, para
 * dejar el resto del código sin clases de tamaño/peso repetidas.
 */

import { Text, TextProps } from 'react-native';

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'muted' | 'caption';

const styles: Record<Variant, string> = {
  h1: 'text-2xl font-bold text-slate-900 dark:text-white',
  h2: 'text-xl font-bold text-slate-900 dark:text-white',
  h3: 'text-base font-semibold text-slate-800 dark:text-slate-100',
  body: 'text-sm text-slate-700 dark:text-slate-200',
  muted: 'text-sm text-slate-500 dark:text-slate-400',
  caption: 'text-xs text-slate-400',
};

interface TypoProps extends TextProps {
  variant?: Variant;
  className?: string;
}

export function Typo({
  variant = 'body',
  className = '',
  children,
  ...rest
}: TypoProps) {
  return (
    <Text {...rest} className={`${styles[variant]} ${className}`.trim()}>
      {children}
    </Text>
  );
}
