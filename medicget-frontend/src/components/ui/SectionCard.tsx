/**
 * SectionCard — card with an optional titled header row and action slot.
 * Replaces 15 instances of the "card header with border-b" pattern.
 *
 * Usage:
 *   <SectionCard title="Citas de hoy" action={<Link>Ver todas</Link>}>
 *     <table>...</table>
 *   </SectionCard>
 */

import type { ReactNode } from 'react';

interface SectionCardProps {
  title?:      string;
  subtitle?:   string;
  action?:     ReactNode;
  children:    ReactNode;
  className?:  string;
  bodyClass?:  string;    // extra classes on the body area
  noPadding?:  boolean;   // removes padding from the body (for full-bleed tables)
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className  = '',
  bodyClass  = '',
  noPadding  = false,
}: SectionCardProps) {
  const hasHeader = title || action;

  return (
    <div
      className={`
        bg-white dark:bg-slate-900
        rounded-2xl border border-slate-200 dark:border-slate-700
        shadow-sm overflow-hidden
        ${className}
      `}
    >
      {hasHeader && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            {title && (
              <h3 className="font-semibold text-slate-800 dark:text-white">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}

      <div className={noPadding ? '' : `p-5 ${bodyClass}`}>
        {children}
      </div>
    </div>
  );
}
