/**
 * Divider — separador horizontal con texto opcional al centro.
 */

import { Text, View } from 'react-native';

export function Divider({ label }: { label?: string }) {
  if (!label) {
    return <View className="h-px bg-slate-200 dark:bg-slate-700 my-4" />;
  }
  return (
    <View className="flex-row items-center my-4">
      <View className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      <Text className="mx-3 text-xs uppercase tracking-wider text-slate-400">
        {label}
      </Text>
      <View className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
    </View>
  );
}
