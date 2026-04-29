/**
 * SearchInput — consistent search field with leading icon.
 * Used everywhere a search/filter input is needed.
 */

import { Search } from 'lucide-react';

interface SearchInputProps {
  value:       string;
  onChange:    (value: string) => void;
  placeholder?: string;
  className?:  string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  className   = '',
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-9 pr-4 py-2.5
          rounded-xl border border-slate-200 dark:border-slate-700
          bg-white dark:bg-slate-900
          text-sm text-slate-800 dark:text-white
          placeholder:text-slate-400
          focus:outline-none focus:ring-2 focus:ring-blue-500
          transition
        "
      />
    </div>
  );
}
