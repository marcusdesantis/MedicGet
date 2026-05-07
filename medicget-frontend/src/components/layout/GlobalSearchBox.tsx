/**
 * GlobalSearchBox — typeahead que vive en la TopNavbar y busca a través
 * de toda la app contextualizado por rol.
 *
 *  ┌────────────────────────────────┐
 *  │ 🔍 Buscar...           ⌘K  │ ← idle
 *  └────────────────────────────────┘
 *
 *  ┌────────────────────────────────┐
 *  │ 🔍 ang|                        │ ← typing
 *  └────────────────────────────────┘
 *  ┌────────────────────────────────┐
 *  │ MÉDICOS                        │
 *  │ ▶ Dr. Angela Moreta            │
 *  │   Cardiología · $25            │
 *  │ CITAS                          │
 *  │   Angela → Dr. Pérez · 12 may  │
 *  └────────────────────────────────┘
 *
 *  Atajos:
 *    Cmd/Ctrl+K  → focus
 *    ↑↓          → navegar resultados
 *    Enter       → ir al resultado seleccionado
 *    Esc         → cerrar
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, CornerDownLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGlobalSearch, type SearchResult } from '@/hooks/useGlobalSearch';

export function GlobalSearchBox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);

  const [query, setQuery]   = useState('');
  const [open,  setOpen]    = useState(false);
  const [hover, setHover]   = useState(0);

  // Cmd+K / Ctrl+K para focusear
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Click fuera cierra
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const ownClinicId = user?.dto.clinic?.id;

  const { results, loading } = useGlobalSearch({
    query,
    role: user?.role,
    ownClinicId,
  });

  // Reset hover al cambiar la lista
  useEffect(() => { setHover(0); }, [results, open]);

  // Auto-scroll del resultado seleccionado
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${hover}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [hover, open]);

  // Agrupar por categoría
  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    results.forEach((r) => {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    });
    return [...map.entries()];
  }, [results]);

  const flat = results;
  const goTo = (r: SearchResult) => {
    setOpen(false);
    setQuery('');
    navigate(r.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      setHover((h) => Math.min(flat.length - 1, h + 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHover((h) => Math.max(0, h - 1));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      const r = flat[hover];
      if (r) goTo(r);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      e.preventDefault();
    }
  };

  // Acumulador para el `data-idx` global mientras renderizamos por grupo
  let runningIdx = 0;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className={`hidden md:flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
        open
          ? 'bg-white dark:bg-slate-900 ring-2 ring-blue-500'
          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
      }`}>
        <Search size={15} className="text-slate-400 flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Buscar médicos, citas, pacientes…"
          className="flex-1 bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400 min-w-0"
        />
        {!query && (
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold text-slate-400 bg-slate-200 dark:bg-slate-700">
            ⌘K
          </kbd>
        )}
      </div>

      {open && query.trim().length > 0 && (
        <div
          ref={listRef}
          className="absolute z-40 mt-2 w-[420px] right-0 sm:right-auto sm:left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden max-h-[480px] overflow-y-auto"
        >
          {/* Header con hint de teclado */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {loading ? 'Buscando…' : flat.length > 0 ? `${flat.length} resultado${flat.length === 1 ? '' : 's'}` : ''}
            </span>
            <span className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">↑↓</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono inline-flex items-center gap-0.5"><CornerDownLeft size={10} /></kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">esc</kbd>
            </span>
          </div>

          {/* Estado: cargando */}
          {loading && flat.length === 0 && (
            <div className="px-4 py-12 flex items-center justify-center text-slate-400">
              <Loader2 className="animate-spin" size={18} />
            </div>
          )}

          {/* Estado: sin resultados */}
          {!loading && query.trim().length >= 2 && flat.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sin coincidencias para «<strong>{query.trim()}</strong>»
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Probá con otra palabra o escribí un nombre completo.
              </p>
            </div>
          )}

          {/* Texto muy corto */}
          {query.trim().length < 2 && (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              Escribí al menos 2 caracteres
            </div>
          )}

          {/* Grupos de resultados */}
          {flat.length > 0 && grouped.map(([category, items]) => (
            <div key={category} className="py-1">
              <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                {category}
              </p>
              {items.map((r) => {
                const idx = runningIdx++;
                const selected = idx === hover;
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    data-idx={idx}
                    onMouseEnter={() => setHover(idx)}
                    onClick={() => goTo(r)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition ${
                      selected
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selected
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{r.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.subtitle}</p>
                    </div>
                    {selected && (
                      <CornerDownLeft size={12} className="text-blue-500 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
