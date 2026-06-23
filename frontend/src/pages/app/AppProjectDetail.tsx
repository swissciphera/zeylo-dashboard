import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  MapPin,
  CalendarClock,
  UserPlus,
  Link2,
  Star,
  Check,
  X,
  Copy,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState, Spinner } from '@/components/ui/LoadingState';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { clientApi, apiErrorMessage } from '@/lib/api';
import { PROJECT_STATUS, formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';

const FLOW = ['IN_PROGRESS', 'DECLARED_DONE', 'PHOTOS_SENT', 'VALIDATED'];

export function AppProjectDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [refusalReason, setRefusalReason] = useState('');
  const [tempOpen, setTempOpen] = useState(false);
  const [tempPhone, setTempPhone] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => (await clientApi.get(`/app/projects/${id}`)).data,
  });
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => (await clientApi.get('/app/employees')).data as any[],
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['project', id] });

  async function setStatus(status: string, reason?: string) {
    setBusy(true);
    setError(null);
    try {
      await clientApi.put(`/app/projects/${id}/status`, { status, refusalReason: reason });
      invalidate();
      setRefuseOpen(false);
      setRefusalReason('');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function assign(employeeId: string) {
    await clientApi.post(`/app/projects/${id}/assign`, { employeeId });
    invalidate();
  }
  async function unassign(employeeId: string) {
    await clientApi.delete(`/app/projects/${id}/assign/${employeeId}`);
    invalidate();
  }

  async function createTempAccess(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await clientApi.post(`/app/projects/${id}/temp-access`, { phone: tempPhone });
      setGeneratedLink(`${window.location.origin}/access/${res.data.token}`);
      invalidate();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function createRatingLink() {
    const res = await clientApi.post(`/app/projects/${id}/rating-link`);
    setGeneratedLink(`${window.location.origin}/rate/${res.data.token}`);
  }

  if (isLoading || !data) return <LoadingState />;

  const status = PROJECT_STATUS[data.status];
  const assignedIds = new Set(data.assignments.map((a: any) => a.employeeId));
  const currentStep = FLOW.indexOf(data.status);

  return (
    <>
      <Link to="/app/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Chantiers
      </Link>

      <PageHeader
        title={data.title}
        subtitle={data.clientName ? `Client : ${data.clientName}` : undefined}
        actions={<Badge tone={status?.tone}>{status?.label}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Workflow stepper */}
          <div className="card p-6">
            <h3 className="mb-5 font-semibold text-ink">Avancement</h3>
            <div className="flex items-center">
              {FLOW.map((step, i) => {
                const reached = data.status !== 'REFUSED' && i <= currentStep;
                return (
                  <div key={step} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold',
                        reached ? 'bg-brand-600 text-white' : 'bg-surface-muted text-ink-faint',
                      )}>
                        {reached ? <Check className="h-4 w-4" /> : i + 1}
                      </div>
                      <span className="mt-2 w-20 text-center text-xs text-ink-muted">
                        {PROJECT_STATUS[step].label}
                      </span>
                    </div>
                    {i < FLOW.length - 1 && (
                      <div className={cn('mx-1 h-0.5 flex-1', i < currentStep ? 'bg-brand-600' : 'bg-line')} />
                    )}
                  </div>
                );
              })}
            </div>

            {data.status === 'REFUSED' && (
              <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                <strong>Refusé</strong>
                {data.refusalReason ? ` — ${data.refusalReason}` : ''}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {data.status !== 'VALIDATED' && (
                <button className="btn-primary" disabled={busy} onClick={() => setStatus('VALIDATED')}>
                  <Check className="h-4 w-4" /> Valider
                </button>
              )}
              {data.status !== 'REFUSED' && (
                <button className="btn-danger" disabled={busy} onClick={() => setRefuseOpen(true)}>
                  <X className="h-4 w-4" /> Refuser
                </button>
              )}
              {data.status === 'IN_PROGRESS' && (
                <button className="btn-secondary" disabled={busy} onClick={() => setStatus('DECLARED_DONE')}>
                  Marquer déclaré terminé
                </button>
              )}
              {data.status === 'DECLARED_DONE' && (
                <button className="btn-secondary" disabled={busy} onClick={() => setStatus('PHOTOS_SENT')}>
                  Photos envoyées
                </button>
              )}
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>

          {/* Team */}
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-ink">Équipe assignée</h3>
              <button className="btn-secondary !py-1.5 !px-3" onClick={() => setAssignOpen(true)}>
                <UserPlus className="h-4 w-4" /> Assigner
              </button>
            </div>
            {data.assignments.length === 0 ? (
              <p className="text-sm text-ink-faint">Aucun employé assigné.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.assignments.map((a: any) => (
                  <span key={a.id} className="inline-flex items-center gap-2 rounded-full bg-surface-muted py-1 pl-1 pr-2.5 text-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700">
                      {a.employee.firstName[0]}{a.employee.lastName[0]}
                    </span>
                    {a.employee.firstName} {a.employee.lastName}
                    <button onClick={() => unassign(a.employeeId)} className="text-ink-faint hover:text-red-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Ratings */}
          <div className="card p-6">
            <h3 className="mb-4 font-semibold text-ink">Évaluations client</h3>
            {data.ratings.filter((r: any) => r.rating).length === 0 ? (
              <p className="text-sm text-ink-faint">Aucune évaluation reçue.</p>
            ) : (
              <div className="space-y-3">
                {data.ratings.filter((r: any) => r.rating).map((r: any) => (
                  <div key={r.id} className="rounded-xl border border-line p-3">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={cn('h-4 w-4', s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />
                      ))}
                    </div>
                    {r.comment && <p className="mt-1.5 text-sm text-ink-soft">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="mb-4 font-semibold text-ink">Détails</h3>
            <dl className="space-y-3 text-sm">
              {data.address && (
                <div className="flex items-start gap-2 text-ink-soft">
                  <MapPin className="mt-0.5 h-4 w-4 text-ink-faint" /> {data.address}
                </div>
              )}
              {data.dueDate && (
                <div className="flex items-center gap-2 text-ink-soft">
                  <CalendarClock className="h-4 w-4 text-ink-faint" /> Échéance : {formatDate(data.dueDate)}
                </div>
              )}
              {data.description && <p className="text-ink-muted">{data.description}</p>}
            </dl>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 font-semibold text-ink">Liens partageables</h3>
            <div className="space-y-2">
              <button className="btn-secondary w-full justify-start" onClick={() => { setGeneratedLink(null); setTempOpen(true); }}>
                <Link2 className="h-4 w-4" /> Accès employé temporaire
              </button>
              <button className="btn-secondary w-full justify-start" onClick={createRatingLink}>
                <Star className="h-4 w-4" /> Lien de notation client
              </button>
            </div>
            {generatedLink && !tempOpen && (
              <LinkBox link={generatedLink} />
            )}
          </div>

          {data.tempAccesses?.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 text-sm font-semibold text-ink-soft">Accès temporaires</h3>
              <ul className="space-y-2 text-xs text-ink-muted">
                {data.tempAccesses.map((t: any) => (
                  <li key={t.id} className="flex items-center justify-between">
                    <span>{t.phone || '—'}</span>
                    <span>{t.usedAt ? 'Utilisé' : `Expire ${formatDateTime(t.expiresAt)}`}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Assign modal */}
      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assigner des employés">
        {!employees || employees.length === 0 ? (
          <p className="text-sm text-ink-muted">Aucun employé disponible. Ajoutez-en d'abord.</p>
        ) : (
          <div className="space-y-2">
            {employees.map((emp) => (
              <label key={emp.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-line p-3 hover:bg-surface-subtle">
                <span className="text-sm font-medium text-ink">{emp.firstName} {emp.lastName}</span>
                <input
                  type="checkbox"
                  checked={assignedIds.has(emp.id)}
                  onChange={(e) => (e.target.checked ? assign(emp.id) : unassign(emp.id))}
                  className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-300"
                />
              </label>
            ))}
          </div>
        )}
      </Modal>

      {/* Refuse modal */}
      <Modal
        open={refuseOpen}
        onClose={() => setRefuseOpen(false)}
        title="Refuser le chantier"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setRefuseOpen(false)}>Annuler</button>
            <button className="btn-danger" disabled={busy || !refusalReason} onClick={() => setStatus('REFUSED', refusalReason)}>
              {busy && <Spinner className="h-4 w-4 text-white" />} Confirmer le refus
            </button>
          </>
        }
      >
        <label className="label">Motif du refus</label>
        <textarea className="input min-h-[90px] resize-none" value={refusalReason} onChange={(e) => setRefusalReason(e.target.value)} placeholder="Expliquez pourquoi le chantier est refusé…" />
      </Modal>

      {/* Temp access modal */}
      <Modal open={tempOpen} onClose={() => setTempOpen(false)} title="Accès employé temporaire">
        {generatedLink ? (
          <div>
            <p className="text-sm text-ink-muted">
              Lien généré. Un code SMS a été envoyé au numéro indiqué (mode démo : voir les logs serveur).
            </p>
            <LinkBox link={generatedLink} />
          </div>
        ) : (
          <form onSubmit={createTempAccess} className="space-y-4">
            <div>
              <label className="label">Numéro de téléphone (SMS)</label>
              <input className="input" required value={tempPhone} onChange={(e) => setTempPhone(e.target.value)} placeholder="+41 79 000 00 00" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end">
              <button className="btn-primary" disabled={busy}>
                {busy && <Spinner className="h-4 w-4 text-white" />} Générer le lien
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function LinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-subtle p-2.5">
      <code className="flex-1 truncate text-xs text-ink-soft">{link}</code>
      <button
        className="btn-secondary !py-1.5 !px-2.5"
        onClick={() => {
          navigator.clipboard.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        <Copy className="h-3.5 w-3.5" /> {copied ? 'Copié' : 'Copier'}
      </button>
    </div>
  );
}
