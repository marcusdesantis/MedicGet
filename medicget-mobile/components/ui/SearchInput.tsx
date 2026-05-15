/**
 * SearchInput — input con ícono de lupa, usado en pantallas de búsqueda.
 */

import { TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  className = '',
}: SearchInputProps) {
  return (
    <View
      className={[
        'flex-row items-center rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3 h-12',
        className,
      ]
        .filter(Boolean)
        .join(' ')}>
      <Search size={16} color="#94a3b8" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        className="flex-1 ml-2 text-base text-slate-800 dark:text-slate-100 py-0"
      />
    </View>
  );
}
