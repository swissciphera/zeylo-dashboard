import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
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
    {
      key: 'city',
      header: 'Ville',
      render: (r) => (
        <span className="text-ink-soft">
          {r.city ? `${r.city}${r.country ? `, ${r.country}` : ''}` : '—'}
        </span>
      ),
    },
    {
      key: 'ip',
      header: 'IP',
      render: (r) =>
        r.ip ? (
          <Link
            to={`/admin/ip-lookup?ip=${encodeURIComponent(r.ip)}`}
            className="inline-flex items-center gap-1 font-mono text-xs text-brand-600 hover:text-brand-700 hover:underline"
            title="Localiser cette IP"
          >
            <MapPin className="h-3.5 w-3.5" /> {r.ip}
          </Link>
        ) : (
          <span className="text-xs text-ink-faint">—</span>
        ),
    },
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
