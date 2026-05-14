/**
 * Input — TextInput con estilos base. Soporta `error` (cambia el borde),
 * `rightIcon` (botón clickable, p. ej. eye-toggle) y `leftIcon` (decorativo).
 *
 * Si necesitas label + error como bloque completo, usa `FormField`
 * envolviendo este componente.
 */

import { forwardRef, ReactNode } from 'react';
import {
  Pressable,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

export interface InputProps extends TextInputProps {
  error?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onRightIconPress?: () => void;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    error,
    leftIcon,
    rightIcon,
    onRightIconPress,
    containerClassName = '',
    className,
    placeholderTextColor,
    ...rest
  },
  ref,
) {
  return (
    <View
      className={[
        'flex-row items-center rounded-2xl border bg-white dark:bg-slate-900',
        error
          ? 'border-rose-400'
          : 'border-slate-200 dark:border-slate-700',
        leftIcon ? 'pl-3' : 'pl-4',
        rightIcon ? 'pr-2' : 'pr-4',
        'h-12',
        containerClassName,
      ]
        .filter(Boolean)
        .join(' ')}>
      {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={placeholderTextColor ?? '#94a3b8'}
        className={[
          'flex-1 text-base text-slate-800 dark:text-slate-100',
          // Android requiere paddingVertical 0 para que el TextInput respete la altura
          'py-0',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {rightIcon ? (
        <Pressable
          onPress={onRightIconPress}
          hitSlop={8}
          className="ml-2 p-2 items-center justify-center">
          {rightIcon}
        </Pressable>
      ) : null}
    </View>
  );
});
