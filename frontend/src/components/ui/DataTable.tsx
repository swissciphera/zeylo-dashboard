import { cn } from '@/lib/cn';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  onRowClick,
  emptyTitle = 'Aucune donnée',
  emptyDescription,
  emptyAction,
}: {
  columns: Column<T>[];
  data: T[] | undefined;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="card overflow-hidden">
        <LoadingState />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="card overflow-hidden">
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </div>
    );
  }

  const alignCls = {
    left: 'text-left',
    right: 'text-right',
    center: 'text-center',
  };

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto scrollbar-slim">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-subtle">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-ink-faint',
                    alignCls[col.align ?? 'left'],
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-brand-50/40',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-5 py-3.5 text-ink-soft',
                      alignCls[col.align ?? 'left'],
                      col.className,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
