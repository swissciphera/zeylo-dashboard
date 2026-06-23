import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Star, Plane } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState, Spinner } from '@/components/ui/LoadingState';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { clientApi, apiErrorMessage } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';

const LEAVE_LABELS: Record<string, string> = {
  VACATION: 'Congé',
  SICK: 'Maladie',
  UNPAID: 'Sans solde',
  OTHER: 'Autre',
};

export function AppEmployeeDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState('infos');
  const [noteOpen, setNoteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => (await clientApi.get(`/app/employees/${id}`)).data,
  });

  if (isLoading || !data) return <LoadingState />;

  const fullName = `${data.firstName} ${data.lastName}`;

  return (
    <>
      <Link to="/app/employees" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Employés
      </Link>

      <div className="card mb-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <Avatar name={fullName} size="lg" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{fullName}</h1>
          <p className="text-sm text-ink-muted">{data.position || 'Poste non renseigné'}</p>
        </div>
        <Badge tone={data.isActive ? 'green' : 'gray'}>
          {data.isActive ? 'Actif' : 'Inactif'}
        </Badge>
      </div>

      <Tabs
        items={[
          { key: 'infos', label: 'Informations' },
          { key: 'notes', label: 'Notes', count: data.notes.length },
          { key: 'leaves', label: 'Congés & absences', count: data.leaves.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="mt-6">
        {tab === 'infos' && (
          <div className="card max-w-2xl p-6">
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <Info label="Email" value={data.email || '—'} />
              <Info label="Téléphone" value={data.phone || '—'} />
              <Info label="Poste" value={data.position || '—'} />
              <Info label="Fin de contrat" value={formatDate(data.contractEndDate)} />
              <Info label="Arrivée" value={formatDate(data.createdAt)} />
            </dl>
          </div>
        )}

        {tab === 'notes' && (
          <NotesTab
            employeeId={id!}
            notes={data.notes}
            open={noteOpen}
            setOpen={setNoteOpen}
            onSaved={() => qc.invalidateQueries({ queryKey: ['employee', id] })}
          />
        )}

        {tab === 'leaves' && (
          <LeavesTab
            employeeId={id!}
            leaves={data.leaves}
            open={leaveOpen}
            setOpen={setLeaveOpen}
            onSaved={() => qc.invalidateQueries({ queryKey: ['employee', id] })}
          />
        )}
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-ink-faint">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}

function NotesTab({ employeeId, notes, open, setOpen, onSaved }: any) {
  const [form, setForm] = useState({ authorType: 'PATRON', authorName: '', rating: 0, comment: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        authorType: form.authorType,
        comment: form.comment,
        authorName: form.authorName || undefined,
      };
      if (form.rating) payload.rating = form.rating;
      await clientApi.post(`/app/employees/${employeeId}/notes`, payload);
      onSaved();
      setOpen(false);
      setForm({ authorType: 'PATRON', authorName: '', rating: 0, comment: '' });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Ajouter une note
        </button>
      </div>
      {notes.length === 0 ? (
        <div className="card">
          <EmptyState icon={Star} title="Aucune note" description="Ajoutez une note patron ou enregistrez un retour client." />
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n: any) => (
            <div key={n.id} className="card p-4">
              <div className="flex items-center justify-between">
                <Badge tone={n.authorType === 'CLIENT' ? 'blue' : 'violet'}>
                  {n.authorType === 'CLIENT' ? 'Note client' : 'Note patron'}
                </Badge>
                <span className="text-xs text-ink-faint">{formatDateTime(n.createdAt)}</span>
              </div>
              {n.rating && (
                <div className="mt-2 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={cn('h-4 w-4', s <= n.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />
                  ))}
                </div>
              )}
              {n.comment && <p className="mt-2 text-sm text-ink-soft">{n.comment}</p>}
              {n.authorName && <p className="mt-1 text-xs text-ink-faint">— {n.authorName}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nouvelle note"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Annuler</button>
            <button className="btn-primary" form="note-form" disabled={saving}>
              {saving && <Spinner className="h-4 w-4 text-white" />} Enregistrer
            </button>
          </>
        }
      >
        <form id="note-form" onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Type de note</label>
            <select className="input" value={form.authorType} onChange={(e) => setForm({ ...form, authorType: e.target.value })}>
              <option value="PATRON">Note patron (interne)</option>
              <option value="CLIENT">Note client</option>
            </select>
          </div>
          <div>
            <label className="label">Note (optionnel)</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button type="button" key={s} onClick={() => setForm({ ...form, rating: s })}>
                  <Star className={cn('h-7 w-7', s <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Commentaire</label>
            <textarea className="input min-h-[90px] resize-none" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </Modal>
    </>
  );
}

function LeavesTab({ employeeId, leaves, open, setOpen, onSaved }: any) {
  const [form, setForm] = useState({ type: 'VACATION', startDate: '', endDate: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await clientApi.post(`/app/employees/${employeeId}/leaves`, form);
      onSaved();
      setOpen(false);
      setForm({ type: 'VACATION', startDate: '', endDate: '', reason: '' });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>
      {leaves.length === 0 ? (
        <div className="card">
          <EmptyState icon={Plane} title="Aucun congé enregistré" description="Suivez les congés et absences de cet employé." />
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map((l: any) => (
            <div key={l.id} className="card flex items-center justify-between p-4">
              <div>
                <Badge tone="blue">{LEAVE_LABELS[l.type]}</Badge>
                <p className="mt-1.5 text-sm font-medium text-ink">
                  {formatDate(l.startDate)} → {formatDate(l.endDate)}
                </p>
                {l.reason && <p className="text-xs text-ink-faint">{l.reason}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Congé / absence"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Annuler</button>
            <button className="btn-primary" form="leave-form" disabled={saving}>
              {saving && <Spinner className="h-4 w-4 text-white" />} Enregistrer
            </button>
          </>
        }
      >
        <form id="leave-form" onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(LEAVE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Du</label>
              <input className="input" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Au</label>
              <input className="input" type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Motif (optionnel)</label>
            <input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </Modal>
    </>
  );
}
