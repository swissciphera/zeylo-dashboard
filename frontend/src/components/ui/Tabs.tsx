import { cn } from '@/lib/cn';

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-line">
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              'relative -mb-px flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition',
              active
                ? 'text-brand-700'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {item.label}
            {item.count != null && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs font-semibold',
                  active
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-surface-muted text-ink-faint',
                )}
              >
                {item.count}
              </span>
            )}
            {active && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}
