import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CircleDollarSign,
  UserPlus,
  TrendingDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { adminApi } from '@/lib/api';
import { formatMoney, formatNumber } from '@/lib/format';

export function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => (await adminApi.get('/admin/overview')).data,
  });

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="Vue d'ensemble" subtitle="Performance de la plateforme Zeylo" />
        <LoadingState />
      </>
    );
  }

  const paidShare =
    data.totalCompanies > 0
      ? Math.round((data.paidCompanies / data.totalCompanies) * 100)
      : 0;

  return (
    <>
      <PageHeader
        title="Vue d'ensemble"
        subtitle="Performance de la plateforme Zeylo"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Entreprises clientes"
          value={formatNumber(data.totalCompanies)}
          icon={Building2}
          hint={`${data.paidCompanies} payantes · ${data.trialCompanies} en essai`}
        />
        <StatCard
          label="MRR"
          value={formatMoney(data.mrr * 100, data.currency)}
          icon={CircleDollarSign}
          accent="emerald"
          hint="Revenu mensuel récurrent"
        />
        <StatCard
          label="Nouveaux ce mois"
          value={formatNumber(data.newThisMonth)}
          icon={UserPlus}
          accent="violet"
          hint="Comptes créés ce mois-ci"
        />
        <StatCard
          label="Taux de désabonnement"
          value={`${data.churnRate}%`}
          icon={TrendingDown}
          accent="amber"
          hint="Sur le mois en cours"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Signup trend */}
        <div className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink">
              Inscriptions (6 derniers mois)
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.signupTrend}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e7ebf0',
                    boxShadow: '0 10px 30px -12px rgba(15,23,42,0.18)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#grad)"
                  name="Inscriptions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Free / paid split */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-ink">
            Répartition gratuit / payant
          </h3>
          <div className="mt-6 flex items-end gap-1.5">
            <span className="text-4xl font-bold text-ink">{paidShare}%</span>
            <span className="mb-1.5 text-sm text-ink-muted">payant</span>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-brand-600"
              style={{ width: `${paidShare}%` }}
            />
          </div>
          <div className="mt-6 space-y-3 text-sm">
            <Row label="Payant" value={data.paidCompanies} tone="bg-brand-600" />
            <Row label="Essai" value={data.trialCompanies} tone="bg-brand-300" />
            <Row label="Gratuit" value={data.freeCompanies} tone="bg-slate-300" />
          </div>
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-ink-soft">
        <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
        {label}
      </span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
