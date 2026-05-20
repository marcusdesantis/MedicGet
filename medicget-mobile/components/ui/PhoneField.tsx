/**
 * PhoneField (mobile) — espejo del PhoneField web. Combina:
 *   - Pressable con bandera + prefijo (`+593`) que abre un modal con los
 *     paises disponibles.
 *   - TextInput numerico para el numero local.
 *
 * El `value` que recibe/emite siempre es el numero completo en formato
 * E.164 con prefijo (`+593987654321`). Eso mantiene el contrato con el
 * backend identico al del web.
 */

import { useMemo, useState } from 'react';
import {
  Modal as RNModal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChevronDown, Search, X } from 'lucide-react-native';

import {
  PHONE_CODES,
  detectPhoneCode,
  getPhoneCode,
  type PhoneCode,
} from '@/lib/phoneCodes';

interface PhoneFieldProps {
  /** Numero completo en E.164 con prefijo. Ej `+593987654321`. */
  value:    string;
  /** Notifica el numero completo (prefijo + numero local concatenados). */
  onChange: (full: string) => void;
  /** ISO-2 del pais default si `value` esta vacio. Default 'ec'. */
  country?: string;
  /** Marca el control como invalido (borde rojo). */
  invalid?: boolean;
  disabled?: boolean;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function PhoneField({
  value, onChange, country = 'ec', invalid, disabled,
}: PhoneFieldProps) {
  // Derivamos el prefijo seleccionado + el numero local desde `value`.
  // Si `value` esta vacio, default al pais indicado por prop.
  const initial = useMemo(() => {
    if (value && value.length > 1) return detectPhoneCode(value);
    return { code: getPhoneCode(country), rest: '' };
  }, [value, country]);

  const [selected, setSelected] = useState<PhoneCode>(initial.code);
  const [local, setLocal]       = useState<string>(initial.rest);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Emite el numero completo al padre cada vez que cambia prefijo o numero.
  const emit = (code: PhoneCode, localNumber: string) => {
    const clean = localNumber.replace(/[^\d]/g, '');
    onChange(clean ? `${code.dialCode}${clean}` : '');
  };

  const onSelectCountry = (code: PhoneCode) => {
    setSelected(code);
    setPickerOpen(false);
    emit(code, local);
  };

  const onChangeLocal = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '');
    setLocal(digits);
    emit(selected, digits);
  };

  return (
    <>
      <View
        className={`flex-row items-stretch bg-white dark:bg-slate-900 border ${
          invalid ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
        } rounded-2xl overflow-hidden`}>
        <Pressable
          disabled={disabled}
          onPress={() => setPickerOpen(true)}
          className="flex-row items-center gap-1.5 px-3 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <Text className="text-lg">{selected.flag}</Text>
          <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {selected.dialCode}
          </Text>
          <ChevronDown size={12} color="#94a3b8" />
        </Pressable>
        <TextInput
          value={local}
          onChangeText={onChangeLocal}
          keyboardType="phone-pad"
          editable={!disabled}
          placeholder="987 654 321"
          placeholderTextColor="#94a3b8"
          className="flex-1 px-3 h-12 text-base text-slate-800 dark:text-slate-100"
        />
      </View>

      <CountryPickerModal
        visible={pickerOpen}
        currentIso={selected.iso}
        onClose={() => setPickerOpen(false)}
        onSelect={onSelectCountry}
      />
    </>
  );
}

/* ───────────────── Picker modal ───────────────── */

function CountryPickerModal({
  visible, currentIso, onClose, onSelect,
}: {
  visible:    boolean;
  currentIso: string;
  onClose:    () => void;
  onSelect:   (c: PhoneCode) => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return PHONE_CODES;
    return PHONE_CODES.filter((c) =>
      normalize(c.name).includes(q) || c.dialCode.includes(q),
    );
  }, [query]);

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-slate-900/50">
        <View className="bg-white dark:bg-slate-900 rounded-t-3xl pt-4 pb-6 max-h-[80%]">
          <View className="flex-row items-center justify-between px-5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Text className="text-base font-bold text-slate-800 dark:text-white">
              Elegi tu pais
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={18} color="#475569" />
            </Pressable>
          </View>

          <View className="px-5 py-3">
            <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 h-11">
              <Search size={14} color="#94a3b8" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar pais..."
                placeholderTextColor="#94a3b8"
                className="flex-1 ml-2 text-sm text-slate-800 dark:text-slate-100"
              />
            </View>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {filtered.map((c) => {
              const on = c.iso === currentIso;
              return (
                <Pressable
                  key={c.iso}
                  onPress={() => onSelect(c)}
                  className={`flex-row items-center gap-3 px-5 py-3 ${
                    on ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}>
                  <Text className="text-2xl">{c.flag}</Text>
                  <Text className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                    {c.name}
                  </Text>
                  <Text className="text-sm font-semibold text-slate-500">
                    {c.dialCode}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </RNModal>
  );
}
