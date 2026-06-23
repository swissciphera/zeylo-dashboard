import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { adminApi } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

export function AdminAudit() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: async () => (await adminApi.get('/admin/audit')).data as any[],
  });

  const columns: Column<any>[] = [
    {
      key: 'when',
      header: 'Quand',
      render: (r) => (
        <span className="whitespace-nowrap text-ink-soft">
          {formatDateTime(r.createdAt)}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Qui',
      render: (r) => (
        <div>
          <div className="font-medium text-ink">{r.actorName || '—'}</div>
          <Badge tone={r.actorType === 'ADMIN' ? 'violet' : 'blue'}>
            {r.actorType}
          </Badge>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (r) => <code className="text-xs text-ink-soft">{r.action}</code>,
    },
    { key: 'company', header: 'Entreprise', render: (r) => r.company || '—' },
    { key: 'reason', header: 'Raison', render: (r) => r.reason || '—' },
    { key: 'ip', header: 'IP', render: (r) => <span className="text-xs text-ink-faint">{r.ip || '—'}</span> },
  ];

  return (
    <>
      <PageHeader
        title="Journal d'audit"
        subtitle="Accès support, actions admin — qui, quand, quelle entreprise, pourquoi"
      />
      <DataTable
        columns={columns}
        data={data}
        loading={isLoading}
        emptyTitle="Journal vide"
        emptyDescription="Les actions sensibles seront enregistrées ici."
      />
    </>
  );
}
