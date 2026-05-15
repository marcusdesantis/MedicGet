/**
 * Avatar — círculo o rounded con iniciales. Si se pasa `imageUrl`, muestra
 * la imagen (con fallback a iniciales si falla la carga).
 */

import { useState } from 'react';
import { Image, Text, View } from 'react-native';

type Size = 'sm' | 'md' | 'lg' | 'xl';
type Shape = 'circle' | 'rounded';
type Variant = 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';

const sizeMap: Record<Size, { box: string; text: string }> = {
  sm: { box: 'w-8 h-8', text: 'text-xs' },
  md: { box: 'w-10 h-10', text: 'text-sm' },
  lg: { box: 'w-12 h-12', text: 'text-base' },
  xl: { box: 'w-20 h-20', text: 'text-2xl' },
};

const variantMap: Record<Variant, string> = {
  blue: 'bg-blue-100 dark:bg-blue-900/40',
  indigo: 'bg-indigo-100 dark:bg-indigo-900/40',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/40',
  amber: 'bg-amber-100 dark:bg-amber-900/40',
  rose: 'bg-rose-100 dark:bg-rose-900/40',
  slate: 'bg-slate-100 dark:bg-slate-800',
};

const variantTextMap: Record<Variant, string> = {
  blue: 'text-blue-700 dark:text-blue-300',
  indigo: 'text-indigo-700 dark:text-indigo-300',
  emerald: 'text-emerald-700 dark:text-emerald-300',
  amber: 'text-amber-700 dark:text-amber-300',
  rose: 'text-rose-700 dark:text-rose-300',
  slate: 'text-slate-700 dark:text-slate-300',
};

interface AvatarProps {
  initials: string;
  imageUrl?: string | null;
  size?: Size;
  shape?: Shape;
  variant?: Variant;
}

export function Avatar({
  initials,
  imageUrl,
  size = 'md',
  shape = 'circle',
  variant = 'blue',
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const sz = sizeMap[size];
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  if (imageUrl && !failed) {
    return (
      <Image
        source={{ uri: imageUrl }}
        onError={() => setFailed(true)}
        className={`${sz.box} ${radius}`}
      />
    );
  }

  return (
    <View
      className={`${sz.box} ${radius} ${variantMap[variant]} items-center justify-center`}>
      <Text className={`${sz.text} font-bold ${variantTextMap[variant]}`}>
        {initials}
      </Text>
    </View>
  );
}
