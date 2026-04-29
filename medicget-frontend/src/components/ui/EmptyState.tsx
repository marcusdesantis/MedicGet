/**
 * EmptyState — consistent empty/zero-results display used inside tables and lists.
 */

import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  icon?:    LucideIcon;
  action?:  React.ReactNode;
}

export function EmptyState({
  message = 'Sin resultados',
  icon: Icon = Inbox,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <Icon size={36} className="text-slate-300 dark:text-slate-600 mb-3" />
      <p className="text-sm text-slate-400">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
