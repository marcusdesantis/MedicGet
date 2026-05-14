/**
 * Button — botón con variantes y estado `loading`.
 *
 * Variantes:
 *  - primary   (azul, default)
 *  - secondary (gris claro / outline)
 *  - ghost     (texto, sin fondo)
 *  - success   (verde — usado en flujo paciente)
 *
 * Tamaños: sm | md | lg.
 */

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress?: () => void;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const variantContainer: Record<Variant, string> = {
  primary: 'bg-blue-600 active:bg-blue-700',
  secondary:
    'bg-white border border-slate-200 active:bg-slate-50 dark:bg-slate-900 dark:border-slate-700',
  ghost: 'bg-transparent active:bg-slate-100 dark:active:bg-slate-800',
  success: 'bg-green-600 active:bg-green-700',
};

const variantText: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-slate-800 dark:text-slate-100',
  ghost: 'text-blue-600 dark:text-blue-400',
  success: 'text-white',
};

const sizeContainer: Record<Size, string> = {
  sm: 'h-10 px-4',
  md: 'h-12 px-6',
  lg: 'h-14 px-8',
};

const sizeText: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  className = '',
}: ButtonProps) {
  const isDisabled = !!disabled || !!loading;
  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      className={[
        'rounded-2xl items-center justify-center flex-row',
        variantContainer[variant],
        sizeContainer[size],
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-60' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' || variant === 'ghost' ? '#1e40af' : '#fff'}
          size="small"
        />
      ) : (
        <View className="flex-row items-center justify-center">
          {typeof children === 'string' ? (
            <Text className={`font-semibold ${variantText[variant]} ${sizeText[size]}`}>
              {children}
            </Text>
          ) : (
            children
          )}
        </View>
      )}
    </Pressable>
  );
}
