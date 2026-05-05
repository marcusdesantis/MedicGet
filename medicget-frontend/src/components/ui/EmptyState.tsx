/**
 * EmptyState — consistent empty/zero-results display used inside tables and lists.
 *
 * Supports two API shapes for backward compatibility with existing call sites:
 *   • Simple: <EmptyState message="Sin resultados" />
 *   • Rich:   <EmptyState title="..." description="..." action={<Link/>} />
 */

import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  /** Single-line message (legacy shape, still supported). */
  message?:     string;
  /** Bold heading. Used together with `description` for the rich shape. */
  title?:       string;
  /** Secondary line under the title. */
  description?: string;
  icon?:        LucideIcon;
  action?:      React.ReactNode;
}

export function EmptyState({
  message,
  title,
  description,
  icon: Icon = Inbox,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <Icon size={36} className="text-slate-300 dark:text-slate-600 mb-3" />
      {title ? (
        <>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
          {description && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">{description}</p>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-400">{message ?? 'Sin resultados'}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
