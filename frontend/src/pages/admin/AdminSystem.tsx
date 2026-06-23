import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { adminApi } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';

const STATUS_UI: Record<
  string,
  { icon: any; tone: string; label: string }
> = {
  operational: { icon: CheckCircle2, tone: 'text-emerald-500', label: 'Opérationnel' },
  mock: { icon: AlertTriangle, tone: 'text-amber-500', label: 'Mode démo' },
  down: { icon: XCircle, tone: 'text-red-500', label: 'Hors service' },
};

export function AdminSystem() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-system'],
    queryFn: async () => (await adminApi.get('/admin/system-health')).data,
  });

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="Santé système" />
        <LoadingState />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Santé système"
        subtitle={`Dernière vérification : ${formatDateTime(data.checkedAt)}`}
        actions={
          <button className="btn-secondary" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            Actualiser
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {data.services.map((s: any) => {
          const ui = STATUS_UI[s.status] ?? STATUS_UI.down;
          const Icon = ui.icon;
          return (
            <div key={s.key} className="card flex items-center gap-4 p-5">
              <Icon className={cn('h-8 w-8 shrink-0', ui.tone)} />
              <div>
                <div className="font-semibold text-ink">{s.label}</div>
                <div className="text-sm text-ink-muted">{ui.label}</div>
                <div className="text-xs text-ink-faint">{s.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 card">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-semibold text-ink">Erreurs récentes & alertes techniques</h3>
        </div>
        {data.recentErrors.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Aucune erreur récente"
            description="Le système fonctionne normalement."
          />
        ) : (
          <div className="divide-y divide-line">
            {data.recentErrors.map((e: any) => (
              <div key={e.id} className="px-5 py-3 text-sm">
                <span className="font-medium text-ink">{e.action}</span>
                <span className="ml-2 text-xs text-ink-faint">
                  {formatDateTime(e.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
