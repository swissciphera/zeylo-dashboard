import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  HardHat,
  Wrench,
  Contact as ContactIcon,
  ShieldAlert,
  History,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/LoadingState';
import { adminApi, apiErrorMessage } from '@/lib/api';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  SUBSCRIPTION_STATUS,
} from '@/lib/format';

export function AdminCompanyDetail() {
  const { id } = useParams();
  const [supportOpen, setSupportOpen] = useState(false);
  const [resource, setResource] = useState('projects');
  const [reason, setReason] = useState('');
  const [accessResult, setAccessResult] = useState<any[] | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [loadingAccess, setLoadingAccess] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-company', id],
    queryFn: async () => (await adminApi.get(`/admin/companies/${id}`)).data,
  });

  async function runSupportAccess(e: React.FormEvent) {
    e.preventDefault();
    setAccessError(null);
    setLoadingAccess(true);
    try {
      const res = await adminApi.post(`/admin/companies/${id}/support-access`, {
        resource,
        reason,
      });
      setAccessResult(res.data);
      refetch();
    } catch (err) {
      setAccessError(apiErrorMessage(err));
    } finally {
      setLoadingAccess(false);
    }
  }

  if (isLoading || !data) return <LoadingState />;

  const status = SUBSCRIPTION_STATUS[data.subscriptionStatus];
  const counts = [
    { label: 'Employés', value: data.counts.employees, icon: Users },
    { label: 'Chantiers actifs', value: data.counts.activeProjects, icon: HardHat },
    { label: 'Services', value: data.counts.services, icon: Wrench },
    { label: 'Contacts', value: data.counts.contacts, icon: ContactIcon },
  ];

  return (
    <>
      <Link
        to="/admin/companies"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Entreprises
      </Link>

      <PageHeader
        title={data.name}
        subtitle={data.sector || 'Secteur non renseigné'}
        actions={
          <button
            className="btn-secondary"
            onClick={() => {
              setSupportOpen(true);
              setAccessResult(null);
              setReason('');
            }}
          >
            <ShieldAlert className="h-4 w-4" /> Accès support
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Counts */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {counts.map((c) => (
              <div key={c.label} className="card p-4">
                <c.icon className="h-5 w-5 text-brand-600" />
                <div className="mt-3 text-2xl font-bold text-ink">{c.value}</div>
                <div className="text-xs text-ink-muted">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Payments */}
          <div className="card">
            <div className="border-b border-line px-5 py-4">
              <h3 className="font-semibold text-ink">Facturation récente</h3>
            </div>
            {data.payments.length === 0 ? (
              <EmptyState title="Aucun paiement" description="Aucune facturation enregistrée pour cette entreprise." />
            ) : (
              <div className="divide-y divide-line">
                {data.payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="text-sm">
                      <div className="font-medium text-ink">
                        {formatMoney(p.amountCents, p.currency)}
                      </div>
                      <div className="text-xs text-ink-faint">
                        {formatDate(p.createdAt)}
                      </div>
                    </div>
                    <Badge tone={p.status === 'PAID' ? 'green' : p.status === 'FAILED' ? 'red' : 'amber'}>
                      {p.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Support history */}
          <div className="card">
            <div className="flex items-center gap-2 border-b border-line px-5 py-4">
              <History className="h-4 w-4 text-ink-faint" />
              <h3 className="font-semibold text-ink">Historique des accès support</h3>
            </div>
            {data.supportHistory.length === 0 ? (
              <EmptyState
                title="Aucun accès enregistré"
                description="Chaque consultation du contenu métier sera journalisée ici."
              />
            ) : (
              <div className="divide-y divide-line">
                {data.supportHistory.map((s: any) => (
                  <div key={s.id} className="px-5 py-3.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink">{s.admin}</span>
                      <span className="text-xs text-ink-faint">
                        {formatDateTime(s.createdAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-ink-muted">
                      <Badge tone="violet">{s.resource}</Badge>{' '}
                      <span className="ml-1">{s.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side info */}
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="mb-4 font-semibold text-ink">Abonnement</h3>
            <dl className="space-y-3 text-sm">
              <Info label="Statut" value={<Badge tone={status?.tone}>{status?.label}</Badge>} />
              <Info label="Plan" value={data.plan} />
              <Info label="Fin d'essai" value={formatDate(data.trialEndsAt)} />
              <Info label="Inscription" value={formatDate(data.createdAt)} />
              <Info label="Code parrainage" value={data.referralCode} />
            </dl>
          </div>
          <div className="card p-5">
            <h3 className="mb-4 font-semibold text-ink">Coordonnées</h3>
            <dl className="space-y-3 text-sm">
              <Info label="Email" value={data.email || '—'} />
              <Info label="Téléphone" value={data.phone || '—'} />
              <Info label="Adresse" value={data.address || '—'} />
            </dl>
          </div>
        </div>
      </div>

      {/* Support access modal */}
      <Modal
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        title="Accès support journalisé"
        description="La consultation du contenu métier est enregistrée et auditée."
        size="lg"
      >
        {accessResult ? (
          <div>
            <div className="mb-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200">
              Accès enregistré · {accessResult.length} élément(s)
            </div>
            <pre className="max-h-80 overflow-auto rounded-xl bg-surface-subtle p-4 text-xs text-ink-soft scrollbar-slim">
              {JSON.stringify(accessResult, null, 2)}
            </pre>
          </div>
        ) : (
          <form onSubmit={runSupportAccess} className="space-y-4">
            <div>
              <label className="label">Ressource à consulter</label>
              <select
                className="input"
                value={resource}
                onChange={(e) => setResource(e.target.value)}
              >
                <option value="projects">Chantiers</option>
                <option value="employees">Employés</option>
                <option value="services">Services</option>
                <option value="contacts">Contacts</option>
              </select>
            </div>
            <div>
              <label className="label">Raison (obligatoire)</label>
              <textarea
                className="input min-h-[80px] resize-none"
                required
                minLength={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex. demande d'assistance ticket #1234"
              />
            </div>
            {accessError && (
              <p className="text-sm text-red-600">{accessError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setSupportOpen(false)}>
                Annuler
              </button>
              <button className="btn-primary" disabled={loadingAccess}>
                {loadingAccess && <Spinner className="h-4 w-4 text-white" />}
                Consulter
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
