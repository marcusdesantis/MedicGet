/**
 * Checkbox — control booleano con label opcional como children.
 */

import { Pressable, Text, View } from 'react-native';
import { ReactNode } from 'react';
import { Check } from 'lucide-react-native';

interface CheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  children?: ReactNode;
  disabled?: boolean;
}

export function Checkbox({
  checked,
  onChange,
  children,
  disabled,
}: CheckboxProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : () => onChange(!checked)}
      className="flex-row items-start gap-2"
      hitSlop={4}>
      <View
        className={[
          'w-5 h-5 rounded-md border items-center justify-center mt-0.5',
          checked
            ? 'bg-blue-600 border-blue-600'
            : 'bg-white border-slate-300 dark:bg-slate-900 dark:border-slate-600',
          disabled ? 'opacity-60' : '',
        ]
          .filter(Boolean)
          .join(' ')}>
        {checked ? <Check size={14} color="#fff" /> : null}
      </View>
      {children ? (
        <View className="flex-1">
          {typeof children === 'string' ? (
            <Text className="text-sm text-slate-700 dark:text-slate-200 leading-5">
              {children}
            </Text>
          ) : (
            children
          )}
        </View>
      ) : null}
    </Pressable>
  );
}
