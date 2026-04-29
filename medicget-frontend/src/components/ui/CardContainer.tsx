/**
 * CardContainer — the application's standard card wrapper.
 * Replaces 47 instances of the repeated Tailwind card class string.
 *
 * Variants:
 *  - default   : standard white card with border and shadow
 *  - flat      : no shadow
 *  - highlight : colored border (use for alerts, featured cards)
 */

import type { ReactNode } from 'react';

type CardVariant = 'default' | 'flat' | 'dashed';

interface CardContainerProps {
  children:   ReactNode;
  className?: string;
  variant?:   CardVariant;
  noPadding?: boolean;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm',
  flat:    'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700',
  dashed:  'bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600',
};

export function CardContainer({
  children,
  className = '',
  variant   = 'default',
  noPadding = false,
}: CardContainerProps) {
  return (
    <div className={`${VARIANT_CLASSES[variant]} ${noPadding ? '' : 'p-5'} ${className}`}>
      {children}
    </div>
  );
}
