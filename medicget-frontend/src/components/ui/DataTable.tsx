/**
 * DataTable — generic, fully-typed table component.
 *
 * Replaces 5 copy-pasted table structures across clinic and doctor pages.
 * Pages provide typed column definitions; the table handles all rendering
 * infrastructure: header, body, hover states, overflow, and empty state.
 *
 * Usage:
 *   const columns: Column<Appointment>[] = [
 *     { key: 'patient', header: 'Paciente', render: (row) => <p>{row.patient}</p> },
 *     { key: 'status',  header: 'Estado',   render: (row) => <StatusBadge ... /> },
 *   ];
 *   <DataTable columns={columns} data={appointments} emptyMessage="Sin citas" />
 */

import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import type { LucideIcon } from 'lucide-react';

export interface Column<T> {
  key:          string;
  header:       string;
  render:       (row: T) => ReactNode;
  headerClass?: string;
  cellClass?:   string;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns:       Column<T>[];
  data:          T[];
  emptyMessage?: string;
  emptyIcon?:    LucideIcon;
  onRowClick?:   (row: T) => void;
  rowClassName?: (row: T) => string;
  striped?:      boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  emptyMessage,
  emptyIcon,
  onRowClick,
  rowClassName,
  striped = false,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`
                  text-left px-5 py-3
                  text-xs font-semibold text-slate-500 dark:text-slate-400
                  whitespace-nowrap
                  ${col.headerClass ?? ''}
                `}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              onClick={() => onRowClick?.(row)}
              className={`
                transition
                ${onRowClick ? 'cursor-pointer' : ''}
                ${striped && rowIdx % 2 !== 0 ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}
                hover:bg-slate-50 dark:hover:bg-slate-800/50
                ${rowClassName?.(row) ?? ''}
              `}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-5 py-3.5 text-slate-600 dark:text-slate-300 ${col.cellClass ?? ''}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {data.length === 0 && (
        <EmptyState message={emptyMessage} icon={emptyIcon} />
      )}
    </div>
  );
}
