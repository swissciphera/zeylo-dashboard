import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Building2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { adminApi } from '@/lib/api';
import { formatDate, SUBSCRIPTION_STATUS } from '@/lib/format';

interface Row {
  id: string;
  name: string;
  sector: string | null;
  subscriptionStatus: string;
  createdAt: string;
  employeesCount: number;
}

export function AdminCompanies() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-companies', search],
    queryFn: async () =>
      (await adminApi.get('/admin/companies', { params: { search: search || undefined } }))
        .data as Row[],
  });

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Entreprise',
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Building2 className="h-4 w-4" />
          </span>
          <span className="font-semibold text-ink">{r.name}</span>
        </div>
      ),
    },
    { key: 'sector', header: 'Secteur', render: (r) => r.sector || '—' },
    {
      key: 'status',
      header: 'Abonnement',
      render: (r) => {
        const s = SUBSCRIPTION_STATUS[r.subscriptionStatus];
        return <Badge tone={s?.tone}>{s?.label ?? r.subscriptionStatus}</Badge>;
      },
    },
    {
      key: 'employees',
      header: 'Employés',
      align: 'right',
      render: (r) => r.employeesCount,
    },
    {
      key: 'createdAt',
      header: 'Inscription',
      render: (r) => formatDate(r.createdAt),
    },
  ];

  return (
    <>
      <PageHeader
        title="Entreprises clientes"
        subtitle="Toutes les entreprises inscrites sur la plateforme"
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une entreprise…"
              className="input w-72 pl-9"
            />
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        loading={isLoading}
        onRowClick={(r) => navigate(`/admin/companies/${r.id}`)}
        emptyTitle="Aucune entreprise"
        emptyDescription="Les entreprises inscrites apparaîtront ici."
      />
    </>
  );
}
