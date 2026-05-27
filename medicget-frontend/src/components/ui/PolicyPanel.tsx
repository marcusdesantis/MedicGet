/**
 * PolicyPanel — panel informativo colapsable para explicar políticas /
 * procesos en contexto (verificación de licencia, reembolsos, etc).
 *
 * Pensado para que el usuario entienda "cómo funciona esto" sin sacarlo
 * de la pantalla donde está. Por default arranca abierto en pantallas
 * donde la política es central (ej: cola del admin) y colapsado donde es
 * secundaria (ej: lista de citas del paciente) — se controla con
 * `defaultOpen`.
 *
 * Acepta dos formas de contenido:
 *   • `steps`  → lista numerada (proceso paso a paso).
 *   • children → contenido libre (párrafos, bullets, lo que sea).
 */

import { useState } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

type PolicyTone = 'blue' | 'amber' | 'emerald' | 'slate';

const TONE: Record<PolicyTone, { wrap: string; head: string; num: string }> = {
  blue:    { wrap: 'bg-blue-50 dark:bg-blue-900/15 border-blue-200 dark:border-blue-800',       head: 'text-blue-800 dark:text-blue-200',       num: 'bg-blue-600' },
  amber:   { wrap: 'bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-800',   head: 'text-amber-800 dark:text-amber-200',     num: 'bg-amber-600' },
  emerald: { wrap: 'bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-800', head: 'text-emerald-800 dark:text-emerald-200', num: 'bg-emerald-600' },
  slate:   { wrap: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',   head: 'text-slate-800 dark:text-slate-200',     num: 'bg-slate-600' },
};

interface PolicyPanelProps {
  title:        string;
  icon:         LucideIcon;
  tone?:        PolicyTone;
  defaultOpen?: boolean;
  /** Proceso paso a paso. Cada item es una línea (puede incluir <strong>). */
  steps?:       React.ReactNode[];
  /** Contenido libre adicional, renderizado debajo de los steps. */
  children?:    React.ReactNode;
}

export function PolicyPanel({
  title, icon: Icon, tone = 'blue', defaultOpen = false, steps, children,
}: PolicyPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const t = TONE[tone];

  return (
    <div className={`rounded-xl border ${t.wrap}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <Icon size={18} className={t.head} />
        <span className={`flex-1 text-sm font-semibold ${t.head}`}>{title}</span>
        <ChevronDown
          size={16}
          className={`${t.head} transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0">
          {steps && steps.length > 0 && (
            <ol className="space-y-2.5">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full ${t.num} text-white text-[11px] font-bold flex items-center justify-center mt-0.5`}>
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          )}
          {children && <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed mt-3">{children}</div>}
        </div>
      )}
    </div>
  );
}
