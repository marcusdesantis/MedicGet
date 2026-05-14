/**
 * RadioCard — tarjeta seleccionable que representa una opción de un
 * grupo de radios. Usado en el selector de tipo de perfil del registro.
 */

import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  HeartPulse,
  Stethoscope,
  Building2,
  Check,
} from 'lucide-react-native';

type CardType = 'patient' | 'specialist' | 'clinic';

interface RadioCardProps {
  title: string;
  description: string;
  type: CardType;
  selected?: boolean;
  recommended?: boolean;
  onPress: () => void;
}

function iconFor(type: CardType): ReactNode {
  // Switch en vez de Record para que TS no nos devuelva `| undefined`
  // bajo `noUncheckedIndexedAccess`.
  switch (type) {
    case 'patient':
      return <HeartPulse size={22} color="#0ea5e9" />;
    case 'specialist':
      return <Stethoscope size={22} color="#1A82FE" />;
    case 'clinic':
      return <Building2 size={22} color="#6366f1" />;
  }
}

export function RadioCard({
  title,
  description,
  type,
  selected,
  recommended,
  onPress,
}: RadioCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'flex-row items-start gap-3 rounded-2xl border p-4 bg-white dark:bg-slate-900',
        selected
          ? 'border-blue-500 dark:border-blue-400'
          : 'border-slate-200 dark:border-slate-700',
      ].join(' ')}>
      <View className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 items-center justify-center">
        {iconFor(type)}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </Text>
          {recommended ? (
            <View className="bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
              <Text className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                Recomendado
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-5">
          {description}
        </Text>
      </View>
      <View
        className={[
          'w-6 h-6 rounded-full items-center justify-center border',
          selected
            ? 'bg-blue-600 border-blue-600'
            : 'bg-white border-slate-300 dark:bg-slate-900 dark:border-slate-600',
        ].join(' ')}>
        {selected ? <Check size={14} color="#fff" /> : null}
      </View>
    </Pressable>
  );
}
