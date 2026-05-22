import { useEffect, useMemo, useRef, useState } from 'react';
import {
  format, parse, isValid, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, isSameDay, isSameMonth, isAfter, isBefore, startOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reemplazo moderno para `<input type="date">`. Trigger es un botón con la
 * fecha formateada en español, y abre un popover con un calendario mensual.
 *
 *  Props:
 *   - value:      "YYYY-MM-DD" o "" (igual que un input nativo)
 *   - onChange:   recibe "YYYY-MM-DD" o "" (al limpiar)
 *   - min/max:    "YYYY-MM-DD" — fechas fuera del rango quedan deshabilitadas
 *   - placeholder: texto cuando no hay valor
 *   - className:  pasa al trigger button
 *
 * Cierra cuando se hace clic afuera o se presiona Esc.
 */
export interface DatePickerProps {
  value:        string;
  onChange:     (value: string) => void;
  min?:         string;
  max?:         string;
  placeholder?: string;
  className?:   string;
  disabled?:    boolean;
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

// Nombres de meses cortos en español para la vista "months" del picker.
// 3 caracteres entra cómodo en la grilla 3×4 sin overflow.
const MONTHS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
] as const;

function parseISO(v: string): Date | null {
  if (!v) return null;
  const d = parse(v, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : null;
}

function toISO(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function DatePicker({
  value, onChange, min, max, placeholder = 'Elegir fecha', className = '', disabled = false,
}: DatePickerProps) {
  const selected = useMemo(() => parseISO(value), [value]);
  const minDate  = useMemo(() => min ? parseISO(min) : null, [min]);
  const maxDate  = useMemo(() => max ? parseISO(max) : null, [max]);

  const [open,    setOpen]    = useState(false);
  const [cursor,  setCursor]  = useState<Date>(() => selected ?? new Date());
  // Vista activa del popover: días (default), meses, o años.
  const [view,    setView]    = useState<'days' | 'months' | 'years'>('days');
  // Página de años para la vista 'years' (12 años por página).
  // Se inicializa para que el año del cursor esté en la página visible.
  const [yearPage, setYearPage] = useState<number>(() => {
    const y = (selected ?? new Date()).getFullYear();
    return y - (y % 12);  // alinea a múltiplo de 12 (ej. 1980, 1992, 2004...)
  });
  const rootRef               = useRef<HTMLDivElement | null>(null);

  // Cuando recibimos un value externo nuevo, mover el cursor al mes correcto.
  useEffect(() => {
    if (selected) setCursor(selected);
  }, [selected]);

  // Cerrar al hacer click afuera o Esc.
  useEffect(() => {
    if (!open) {
      // Reset a vista de días para que la próxima apertura no aparezca
      // colgada en months/years.
      setView('days');
      return;
    }
    // Sincronizar la página de años con el cursor cuando se abre.
    setYearPage(cursor.getFullYear() - (cursor.getFullYear() % 12));
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown',   onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown',   onKey);
    };
  }, [open, cursor]);

  // Grilla 7 × 6 = 42 celdas, semana arrancando lunes (locale es).
  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end   = endOfWeek(endOfMonth(cursor),   { weekStartsOn: 1 });
    const days: Date[] = [];
    let d = start;
    while (!isAfter(d, end)) {
      days.push(d);
      d = addDays(d, 1);
    }
    // garantizar 42 (algunos meses cortos sólo dan 35).
    while (days.length < 42) {
      days.push(addDays(days[days.length - 1], 1));
    }
    return days;
  }, [cursor]);

  const isDisabledDay = (d: Date) => {
    if (minDate && isBefore(startOfDay(d), startOfDay(minDate))) return true;
    if (maxDate && isAfter(startOfDay(d),  startOfDay(maxDate))) return true;
    return false;
  };

  const triggerLabel = selected
    ? format(selected, "d 'de' MMMM yyyy", { locale: es })
    : placeholder;

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between gap-2 w-full min-w-[180px] px-3 py-2 rounded-lg border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-teal-500
          ${disabled
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
            : selected
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white border-slate-200 dark:border-slate-700 hover:border-teal-400'
              : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
          }`}
      >
        <span className="truncate">{triggerLabel}</span>
        <Calendar size={15} className="text-slate-400 flex-shrink-0" />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 w-[280px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-3"
        >
          {/* Header: navegación según el view actual */}
          {view === 'days' && (
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setCursor((c) => addMonths(c, -1))}
                className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
                aria-label="Mes anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setView('months')}
                  className="text-sm font-semibold text-slate-800 dark:text-white capitalize px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {format(cursor, 'MMMM', { locale: es })}
                </button>
                <button
                  type="button"
                  onClick={() => setView('years')}
                  className="text-sm font-semibold text-slate-800 dark:text-white px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {format(cursor, 'yyyy')}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCursor((c) => addMonths(c, 1))}
                className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
                aria-label="Mes siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
          {view === 'months' && (
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setCursor((c) => addMonths(c, -12))}
                className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
                aria-label="Año anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setView('years')}
                className="text-sm font-semibold text-slate-800 dark:text-white px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {format(cursor, 'yyyy')}
              </button>
              <button
                type="button"
                onClick={() => setCursor((c) => addMonths(c, 12))}
                className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
                aria-label="Año siguiente"
              >
                <ChevronRight size={16} />
                <ChevronRight size={16} />
              </button>
            </div>
          )}
          {view === 'years' && (
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setYearPage((p) => p - 12)}
                className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
                aria-label="12 años anteriores"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-slate-800 dark:text-white">
                {yearPage} – {yearPage + 11}
              </span>
              <button
                type="button"
                onClick={() => setYearPage((p) => p + 12)}
                className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
                aria-label="12 años siguientes"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Vista de DÍAS */}
          {view === 'days' && (
            <>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-[10px] font-semibold text-slate-400 text-center uppercase tracking-wide">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {grid.map((d, i) => {
                  const inMonth   = isSameMonth(d, cursor);
                  const isSelected = selected ? isSameDay(d, selected) : false;
                  const isToday   = isSameDay(d, new Date());
                  const disabledDay = isDisabledDay(d);

                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={disabledDay}
                      onClick={() => {
                        onChange(toISO(d));
                        setOpen(false);
                      }}
                      className={`h-8 w-8 text-xs rounded-lg font-medium transition flex items-center justify-center
                        ${isSelected
                          ? 'bg-teal-600 text-white shadow-sm'
                          : disabledDay
                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                            : inMonth
                              ? 'text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-900/30'
                              : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }
                        ${isToday && !isSelected ? 'ring-1 ring-teal-400 dark:ring-teal-600' : ''}
                      `}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Vista de MESES (grilla 3×4) */}
          {view === 'months' && (
            <div className="grid grid-cols-3 gap-2 py-2">
              {MONTHS.map((m, i) => {
                const isCurrent = i === cursor.getMonth();
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setCursor((c) => new Date(c.getFullYear(), i, 1));
                      setView('days');
                    }}
                    className={`py-3 text-xs font-medium rounded-lg transition capitalize
                      ${isCurrent
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-900/30'
                      }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {/* Vista de AÑOS (grilla 3×4 = 12 años por página) */}
          {view === 'years' && (
            <div className="grid grid-cols-3 gap-2 py-2">
              {Array.from({ length: 12 }, (_, i) => yearPage + i).map((y) => {
                const isCurrent = y === cursor.getFullYear();
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setCursor((c) => new Date(y, c.getMonth(), 1));
                      setView('months');
                    }}
                    className={`py-3 text-xs font-medium rounded-lg transition
                      ${isCurrent
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-900/30'
                      }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer: hoy + limpiar */}
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                if (!isDisabledDay(today)) {
                  onChange(toISO(today));
                  setOpen(false);
                }
              }}
              className="text-xs font-medium text-teal-600 hover:underline"
            >
              Hoy
            </button>
            {selected && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="text-xs font-medium text-slate-400 hover:text-rose-500"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
