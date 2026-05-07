/**
 * SpecialtyCombobox — input de especialidad con autocompletar y libre.
 *
 *  ┌─────────────────────────────────────────────┐
 *  │ 🔍 cardio                              ▾   │
 *  └─────────────────────────────────────────────┘
 *  ┌─────────────────────────────────────────────┐
 *  │ ✨ Usar "cardio" como nueva especialidad    │  ← (si no matchea)
 *  │ ─────────────────────────────────────────── │
 *  │  Cardiología                                │
 *  │  Cirugía cardiovascular                     │
 *  └─────────────────────────────────────────────┘
 *
 * Comportamiento:
 *  • Sugerencias = catálogo por defecto + lista dinámica de
 *    `extraSuggestions` (ej: especialidades ya cargadas en la clínica).
 *  • Filtro por substring (case + acento insensitive).
 *  • Si el texto NO coincide exactamente con ninguna sugerencia,
 *    aparece arriba "Usar 'X' como nueva especialidad" — al elegirla
 *    o presionar Enter sin selección, se commitea el texto libre.
 *  • Navegación con teclado: ↑↓ mueve la selección, Enter commitea,
 *    Esc cierra.
 *  • Click fuera cierra el dropdown.
 *  • Highlight del fragmento que matchea.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Sparkles, ChevronDown } from 'lucide-react';
import { mergeSpecialties } from '@/lib/specialties';

interface SpecialtyComboboxProps {
  value:    string;
  onChange: (value: string) => void;
  /** Sugerencias adicionales (ej: especialidades ya cargadas en la clínica). */
  extraSuggestions?: string[];
  /** Placeholder del input (default: "Buscar o escribir especialidad…"). */
  placeholder?: string;
  /** Cuando true, agrega ring + borde rojo. */
  invalid?: boolean;
  /** ID del input para asociar `<label htmlFor>`. */
  id?: string;
  /** Si el input es required HTML (mostrará el `*` nativo del browser). */
  required?: boolean;
}

/** Quita acentos y baja a minúscula para comparaciones. */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function SpecialtyCombobox({
  value, onChange, extraSuggestions = [],
  placeholder = 'Buscar o escribir especialidad…',
  invalid = false, id, required,
}: SpecialtyComboboxProps) {
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState(value ?? '');
  const [hover,   setHover]   = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);

  // Mantener el input sincronizado si el padre cambia el value externamente.
  useEffect(() => { setQuery(value ?? ''); }, [value]);

  const allOptions = useMemo(
    () => mergeSpecialties(extraSuggestions),
    [extraSuggestions],
  );

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return allOptions.slice(0, 50);
    return allOptions
      .filter((opt) => normalize(opt).includes(q))
      .slice(0, 50);
  }, [query, allOptions]);

  // ¿La búsqueda actual coincide EXACTAMENTE con alguna opción?
  const exactMatch = useMemo(() => {
    if (!query.trim()) return true;
    const q = normalize(query.trim());
    return allOptions.some((o) => normalize(o) === q);
  }, [query, allOptions]);

  // Lista visible: si no hay match exacto y hay texto, prepend "Usar X".
  const showFreeForm = !exactMatch && query.trim().length > 0;
  const visibleCount = filtered.length + (showFreeForm ? 1 : 0);

  // Reset hover al cambiar la lista.
  useEffect(() => { setHover(0); }, [query, open]);

  // Click fuera del wrapper → cerrar.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  // Auto-scroll del item seleccionado en el dropdown.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${hover}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [hover, open]);

  const commit = (val: string) => {
    onChange(val);
    setQuery(val);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      setHover((h) => Math.min(visibleCount - 1, h + 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHover((h) => Math.max(0, h - 1));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showFreeForm && hover === 0) {
        commit(query.trim());
        return;
      }
      const idx = showFreeForm ? hover - 1 : hover;
      const opt = filtered[idx];
      if (opt) commit(opt);
      else if (query.trim()) commit(query.trim());
    } else if (e.key === 'Escape') {
      setOpen(false);
      e.preventDefault();
    } else if (e.key === 'Tab') {
      // Tab commitea lo que esté tipeado si no hubo selección
      if (query.trim() && !exactMatch) commit(query.trim());
      setOpen(false);
    }
  };

  const onBlur = () => {
    // Si el usuario dejó texto libre y no abrió el dropdown, commitealo
    // (sin esto perderíamos la edición al hacer Tab a otro input).
    if (query.trim() && query.trim() !== (value ?? '')) {
      onChange(query.trim());
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className={`flex items-center rounded-lg border bg-white dark:bg-slate-900 px-3 transition focus-within:ring-2 focus-within:ring-indigo-500 ${
          invalid
            ? 'border-rose-400 focus-within:ring-rose-400'
            : 'border-slate-200 dark:border-slate-700'
        }`}
      >
        <Search size={15} className="text-slate-400 mr-2 flex-shrink-0" />
        <input
          ref={inputRef}
          id={id}
          required={required}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full py-2 bg-transparent outline-none text-sm text-slate-800 dark:text-white placeholder-slate-400"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        <button
          type="button"
          onClick={() => { setOpen((o) => !o); inputRef.current?.focus(); }}
          className="p-1 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          tabIndex={-1}
        >
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-72 overflow-auto"
          role="listbox"
        >
          {/* "Usar como nueva" si no hay match exacto */}
          {showFreeForm && (
            <button
              type="button"
              data-idx={0}
              onMouseEnter={() => setHover(0)}
              onClick={() => commit(query.trim())}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm border-b border-slate-100 dark:border-slate-800 ${
                hover === 0
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Sparkles size={13} className="flex-shrink-0" />
              <span>
                Usar <strong className="font-semibold">«{query.trim()}»</strong> como nueva especialidad
              </span>
            </button>
          )}

          {filtered.length === 0 && !showFreeForm && (
            <div className="px-3 py-3 text-sm text-slate-400 text-center">
              Sin coincidencias. Escribí libremente para crear una nueva especialidad.
            </div>
          )}

          {filtered.map((opt, i) => {
            const idx = showFreeForm ? i + 1 : i;
            const selected = hover === idx;
            return (
              <button
                key={opt}
                type="button"
                data-idx={idx}
                onMouseEnter={() => setHover(idx)}
                onClick={() => commit(opt)}
                className={`w-full text-left px-3 py-2 text-sm transition ${
                  selected
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {highlightMatch(opt, query)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Resalta en negrita la subcadena que matchea con la query. */
function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const idx = normalize(text).indexOf(normalize(q));
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent font-bold text-indigo-700 dark:text-indigo-300">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
