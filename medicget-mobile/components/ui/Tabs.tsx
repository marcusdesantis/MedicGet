/**
 * Tabs — tira de pestañas horizontal. Scrolla cuando los tabs no caben.
 */

import { Pressable, ScrollView, Text } from 'react-native';

interface TabsProps {
  tabs: string[];
  active: string;
  onChange: (v: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
      {tabs.map((t) => {
        const selected = t === active;
        return (
          <Pressable
            key={t}
            onPress={() => onChange(t)}
            className={`px-4 py-2 rounded-lg mr-1 ${
              selected ? 'bg-white dark:bg-slate-900' : ''
            }`}>
            <Text
              className={`text-sm font-medium ${
                selected
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400'
              }`}>
              {t}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
