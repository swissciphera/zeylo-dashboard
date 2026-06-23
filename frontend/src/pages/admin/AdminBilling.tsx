import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { adminApi } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';

export function AdminBilling() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-billing'],
    queryFn: async () => (await adminApi.get('/admin/billing')).data,
  });

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="Facturation & abonnements" />
        <LoadingState />
      </>
    );
  }

  const paymentCols: Column<any>[] = [
    { key: 'company', header: 'Entreprise', render: (r) => <span className="font-medium text-ink">{r.company}</span> },
    { key: 'amount', header: 'Montant', render: (r) => formatMoney(r.amountCents, r.currency) },
    {
      key: 'status',
      header: 'Statut',
      render: (r) => (
        <Badge tone={r.status === 'PAID' ? 'green' : r.status === 'FAILED' ? 'red' : 'amber'}>
          {r.status}
        </Badge>
      ),
    },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.createdAt) },
  ];

  return (
    <>
      <PageHeader
        title="Facturation & abonnements"
        subtitle="Paiements, essais, renouvellements et relances"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-ink-soft">Paiements récents</h3>
          <DataTable
            columns={paymentCols}
            data={data.payments}
            emptyTitle="Aucun paiement"
            emptyDescription="Les paiements apparaîtront ici une fois Stripe connecté."
          />
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="mb-4 text-sm font-semibold text-ink-soft">Essais en cours</h3>
            {data.trials.length === 0 ? (
              <p className="text-sm text-ink-faint">Aucun essai actif.</p>
            ) : (
              <ul className="space-y-3">
                {data.trials.slice(0, 8).map((t: any) => (
                  <li key={t.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink">{t.name}</span>
                    <span className="text-xs text-ink-faint">
                      {formatDate(t.trialEndsAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-sm font-semibold text-ink-soft">Échecs de paiement</h3>
            {data.failed.length === 0 ? (
              <p className="text-sm text-ink-faint">Aucun échec récent. 🎉</p>
            ) : (
              <ul className="space-y-3">
                {data.failed.map((f: any) => (
                  <li key={f.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink">{f.company}</span>
                      <Badge tone="red">Échec</Badge>
                    </div>
                    <p className="text-xs text-ink-faint">{f.failureReason}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
