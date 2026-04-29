/**
 * IconButton — small icon-only button used for row actions (MoreHorizontal, Edit, Delete, etc.)
 * Eliminates the repeated p-1.5 rounded-lg text-slate-400 pattern.
 */

import type { LucideIcon } from 'lucide-react';
import type { MouseEventHandler } from 'react';

interface IconButtonProps {
  icon:       LucideIcon;
  onClick?:   MouseEventHandler<HTMLButtonElement>;
  title?:     string;
  size?:      number;
  variant?:   'default' | 'danger' | 'primary';
  disabled?:  boolean;
  className?: string;
}

const VARIANT_CLASSES = {
  default: 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white',
  danger:  'text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600',
  primary: 'text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600',
};

export function IconButton({
  icon: Icon,
  onClick,
  title,
  size    = 16,
  variant = 'default',
  disabled = false,
  className = '',
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`
        p-1.5 rounded-lg transition
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANT_CLASSES[variant]}
        ${className}
      `}
    >
      <Icon size={size} />
    </button>
  );
}
