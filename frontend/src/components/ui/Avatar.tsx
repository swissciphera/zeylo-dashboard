import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

export function Avatar({
  name,
  src,
  size = 'md',
}: {
  name?: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
  };
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ''}
        className={cn('rounded-full object-cover ring-1 ring-line', sizes[size])}
      />
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 ring-1 ring-brand-200',
        sizes[size],
      )}
    >
      {initials(name)}
    </span>
  );
}
