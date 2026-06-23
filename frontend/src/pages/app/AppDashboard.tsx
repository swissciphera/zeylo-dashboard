import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  HardHat,
  Star,
  Wrench,
  CalendarClock,
  ArrowUpRight,
  Activity,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { clientApi } from '@/lib/api';
import { useClientAuth } from '@/stores/auth';
import { formatDate, daysUntil } from '@/lib/format';

export function AppDashboard() {
  const user = useClientAuth((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ['app-dashboard'],
    queryFn: async () => (await clientApi.get('/app/dashboard')).data,
  });

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="Tableau de bord" />
        <LoadingState />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Bonjour, ${user?.name?.split(' ')[0] ?? ''} 👋`}
        subtitle="Voici un aperçu de votre activité aujourd'hui."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Employés actifs" value={data.employees.active} icon={Users} hint={`${data.employees.total} au total`} />
        <StatCard label="Chantiers en cours" value={data.projects.inProgress} icon={HardHat} accent="violet" hint={`${data.projects.total} chantiers`} />
        <StatCard
          label="Note moyenne"
          value={data.avgRating != null ? `${data.avgRating}/5` : '—'}
          icon={Star}
          accent="amber"
          hint={`${data.ratingsCount} évaluation(s)`}
        />
        <StatCard label="Services actifs" value={data.services} icon={Wrench} accent="emerald" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Project pipeline */}
        <div className="card p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-semibold text-ink">Statuts des chantiers</h3>
            <Link to="/app/projects" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
              Tout voir <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            <Pipe label="En cours" value={data.projects.inProgress} tone="blue" />
            <Pipe label="Déclarés" value={data.projects.declaredDone} tone="amber" />
            <Pipe label="Photos" value={data.projects.photosSent} tone="violet" />
            <Pipe label="Validés" value={data.projects.validated} tone="green" />
            <Pipe label="Refusés" value={data.projects.refused} tone="red" />
          </div>
        </div>

        {/* Expiring contracts */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-ink">Contrats à échéance</h3>
          </div>
          {data.expiringContracts.length === 0 ? (
            <p className="text-sm text-ink-faint">Aucun contrat n'arrive à échéance sous 30 jours.</p>
          ) : (
            <ul className="space-y-3">
              {data.expiringContracts.map((e: any) => {
                const days = daysUntil(e.contractEndDate);
                return (
                  <li key={e.id}>
                    <Link to={`/app/employees/${e.id}`} className="flex items-center justify-between text-sm hover:text-brand-700">
                      <span className="font-medium text-ink">
                        {e.firstName} {e.lastName}
                      </span>
                      <Badge tone={days != null && days <= 7 ? 'red' : 'amber'}>
                        {days}j
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-6 card">
        <div className="flex items-center gap-2 border-b border-line px-5 py-4">
          <Activity className="h-4 w-4 text-ink-faint" />
          <h3 className="font-semibold text-ink">Dernières activités</h3>
        </div>
        {data.recentActivity.length === 0 ? (
          <EmptyState title="Aucune activité" description="Vos dernières actions apparaîtront ici." />
        ) : (
          <div className="divide-y divide-line">
            {data.recentActivity.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-ink-soft">
                  <code className="text-xs text-ink-muted">{a.action}</code>
                  {a.actorName ? ` · ${a.actorName}` : ''}
                </span>
                <span className="text-xs text-ink-faint">{formatDate(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Pipe({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'blue' | 'amber' | 'violet' | 'green' | 'red';
}) {
  const tones: Record<string, string> = {
    blue: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className={`rounded-xl p-4 ${tones[tone]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium opacity-80">{label}</div>
    </div>
  );
}
