// Formatting helpers (Swiss French locale).

export function formatDate(value?: string | Date | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMoney(cents: number, currency = 'CHF'): string {
  return new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-CH').format(value);
}

export function initials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function daysUntil(value?: string | Date | null): number | null {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / 86400_000);
}

// Project status → label + badge tone.
export const PROJECT_STATUS: Record<
  string,
  { label: string; tone: 'blue' | 'amber' | 'violet' | 'green' | 'red' | 'gray' }
> = {
  IN_PROGRESS: { label: 'En cours', tone: 'blue' },
  DECLARED_DONE: { label: 'Déclaré terminé', tone: 'amber' },
  PHOTOS_SENT: { label: 'Photos envoyées', tone: 'violet' },
  VALIDATED: { label: 'Validé', tone: 'green' },
  REFUSED: { label: 'Refusé', tone: 'red' },
};

export const SUBSCRIPTION_STATUS: Record<
  string,
  { label: string; tone: 'green' | 'amber' | 'red' | 'gray' | 'blue' }
> = {
  ACTIVE: { label: 'Actif', tone: 'green' },
  TRIAL: { label: 'Essai', tone: 'blue' },
  PAST_DUE: { label: 'Impayé', tone: 'amber' },
  CANCELED: { label: 'Résilié', tone: 'red' },
  FREE: { label: 'Gratuit', tone: 'gray' },
};
