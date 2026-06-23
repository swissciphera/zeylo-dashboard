import { cn } from '@/lib/cn';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  hint,
  accent = 'brand',
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  trend?: { value: number; positive?: boolean };
  hint?: string;
  accent?: 'brand' | 'emerald' | 'amber' | 'violet' | 'slate';
}) {
  const accents: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-ink-muted">{label}</span>
        {Icon && (
          <span
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl',
              accents[accent],
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-bold tracking-tight text-ink">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              'mb-1 inline-flex items-center gap-0.5 text-xs font-semibold',
              trend.positive ? 'text-emerald-600' : 'text-red-500',
            )}
          >
            {trend.positive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}
