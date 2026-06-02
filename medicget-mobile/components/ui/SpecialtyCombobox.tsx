/**
 * SpecialtyCombobox (móvil) — input de especialidad con autocompletar
 * y entrada libre. Espejo simplificado del web SpecialtyCombobox.
 *
 *  • Mientras el usuario tipea, debajo aparece una lista filtrada de
 *    especialidades (catálogo DEFAULT_SPECIALTIES).
 *  • Si el texto no coincide con ninguna, igual se acepta como entrada
 *    libre (el médico puede tener una sub-especialidad que no esté en
 *    el catálogo).
 *  • Tap en una opción → la elige y cierra la lista.
 *  • Búsqueda case + accent insensitive.
 */

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ChevronDown, Search, Sparkles } from 'lucide-react-native';

import { DEFAULT_SPECIALTIES } from '@/lib/specialties';

interface Props {
  value:    string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function SpecialtyCombobox({
  value, onChange,
  placeholder = 'Buscar o escribir especialidad…',
  invalid = false,
}: Props) {
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = normalize(value.trim());
    if (!q) return DEFAULT_SPECIALTIES.slice(0, 50);
    return DEFAULT_SPECIALTIES.filter((s) => normalize(s).includes(q)).slice(0, 50);
  }, [value]);

  const exact = useMemo(() => {
    const q = normalize(value.trim());
    return !q || DEFAULT_SPECIALTIES.some((s) => normalize(s) === q);
  }, [value]);

  const showFreeFormHint = !exact && value.trim().length > 0;

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const borderClass = invalid
    ? 'border-rose-400 dark:border-rose-700'
    : 'border-slate-200 dark:border-slate-700';

  return (
    <View>
      {/* Input + chevron */}
      <View className={`flex-row items-center gap-2 bg-white dark:bg-slate-900 rounded-xl border px-3 ${borderClass}`}>
        <Search size={14} color="#94a3b8" />
        <TextInput
          value={value}
          onChangeText={(v) => { onChange(v); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          className="flex-1 py-2.5 text-sm text-slate-800 dark:text-slate-100"
        />
        <Pressable onPress={() => setOpen((o) => !o)} hitSlop={8}>
          <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
            <ChevronDown size={16} color="#94a3b8" />
          </View>
        </Pressable>
      </View>

      {/* Dropdown */}
      {open ? (
        <View className="mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 220 }}>
            {showFreeFormHint ? (
              <Pressable
                onPress={() => commit(value.trim())}
                className="flex-row items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-amber-50/60 dark:bg-amber-900/10">
                <Sparkles size={14} color="#d97706" />
                <Text className="text-sm text-amber-700 dark:text-amber-300">
                  Usar "{value.trim()}" como nueva especialidad
                </Text>
              </Pressable>
            ) : null}
            {filtered.length === 0 && !showFreeFormHint ? (
              <View className="px-3 py-4 items-center">
                <Text className="text-xs text-slate-400">Sin coincidencias.</Text>
              </View>
            ) : null}
            {filtered.map((s) => (
              <Pressable
                key={s}
                onPress={() => commit(s)}
                className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-800">
                <Text className="text-sm text-slate-700 dark:text-slate-200">{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
