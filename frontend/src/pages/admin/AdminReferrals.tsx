import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { adminApi } from '@/lib/api';
import { formatDate, SUBSCRIPTION_STATUS } from '@/lib/format';

export function AdminReferrals() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-referrals'],
    queryFn: async () => (await adminApi.get('/admin/referrals')).data as any[],
  });

  const columns: Column<any>[] = [
    { key: 'referrer', header: 'Parrain', render: (r) => <span className="font-medium text-ink">{r.referrer}</span> },
    { key: 'referred', header: 'Filleul', render: (r) => r.referred },
    {
      key: 'status',
      header: 'Statut filleul',
      render: (r) => {
        const s = SUBSCRIPTION_STATUS[r.referredStatus];
        return <Badge tone={s?.tone}>{s?.label ?? r.referredStatus}</Badge>;
      },
    },
    { key: 'tier', header: 'Palier', align: 'center', render: (r) => `Palier ${r.tier}` },
    { key: 'reward', header: 'Récompense', render: (r) => `${r.rewardMonths} mois${r.discountPercent ? ` · -${r.discountPercent}%` : ''}` },
    {
      key: 'converted',
      header: 'Passé payant',
      align: 'center',
      render: (r) =>
        r.convertedToPaid ? (
          <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500" />
        ) : (
          <XCircle className="mx-auto h-5 w-5 text-slate-300" />
        ),
    },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.createdAt) },
  ];

  return (
    <>
      <PageHeader
        title="Programme de parrainage"
        subtitle="Qui a recommandé qui, paliers atteints et conversions"
      />
      <DataTable
        columns={columns}
        data={data}
        loading={isLoading}
        emptyTitle="Aucun parrainage"
        emptyDescription="Les parrainages entre entreprises apparaîtront ici."
      />
    </>
  );
}
