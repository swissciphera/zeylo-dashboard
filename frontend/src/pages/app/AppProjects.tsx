import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, HardHat, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState, Spinner } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { clientApi, apiErrorMessage } from '@/lib/api';
import { PROJECT_STATUS, formatDate } from '@/lib/format';

const FILTERS = [
  { key: '', label: 'Tous' },
  { key: 'IN_PROGRESS', label: 'En cours' },
  { key: 'DECLARED_DONE', label: 'Déclarés' },
  { key: 'PHOTOS_SENT', label: 'Photos' },
  { key: 'VALIDATED', label: 'Validés' },
  { key: 'REFUSED', label: 'Refusés' },
];

const EMPTY = { title: '', description: '', address: '', clientName: '', clientPhone: '', dueDate: '' };

export function AppProjects() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', status],
    queryFn: async () =>
      (await clientApi.get('/app/projects', { params: { status: status || undefined } }))
        .data as any[],
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = { title: form.title };
      ['description', 'address', 'clientName', 'clientPhone', 'dueDate'].forEach((k) => {
        if (form[k]) payload[k] = form[k];
      });
      const res = await clientApi.post('/app/projects', payload);
      qc.invalidateQueries({ queryKey: ['projects'] });
      setOpen(false);
      setForm(EMPTY);
      navigate(`/app/projects/${res.data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Chantiers"
        subtitle="Créez, assignez et suivez vos chantiers de A à Z"
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nouveau chantier
          </button>
        }
      />

      <div className="mb-6">
        <Tabs
          items={FILTERS.map((f) => ({ key: f.key, label: f.label }))}
          value={status}
          onChange={setStatus}
        />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={HardHat}
            title="Aucun chantier"
            description="Créez votre premier chantier et assignez vos employés."
            action={
              <button className="btn-primary" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> Nouveau chantier
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => {
            const s = PROJECT_STATUS[p.status];
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/app/projects/${p.id}`)}
                className="card card-hover p-5 text-left"
              >
                <div className="flex items-start justify-between">
                  <Badge tone={s?.tone}>{s?.label}</Badge>
                  {p.dueDate && (
                    <span className="text-xs text-ink-faint">{formatDate(p.dueDate)}</span>
                  )}
                </div>
                <h3 className="mt-3 font-semibold text-ink">{p.title}</h3>
                {p.clientName && <p className="text-xs text-ink-faint">{p.clientName}</p>}
                {p.address && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
                    <MapPin className="h-3.5 w-3.5" /> {p.address}
                  </p>
                )}
                <div className="mt-4 flex -space-x-2">
                  {p.assignments?.slice(0, 4).map((a: any) => (
                    <span
                      key={a.id}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700 ring-2 ring-white"
                      title={`${a.employee.firstName} ${a.employee.lastName}`}
                    >
                      {a.employee.firstName[0]}
                      {a.employee.lastName[0]}
                    </span>
                  ))}
                  {(!p.assignments || p.assignments.length === 0) && (
                    <span className="text-xs text-ink-faint">Aucun employé assigné</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nouveau chantier"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Annuler</button>
            <button className="btn-primary" form="proj-form" disabled={saving}>
              {saving && <Spinner className="h-4 w-4 text-white" />} Créer
            </button>
          </>
        }
      >
        <form id="proj-form" onSubmit={create} className="space-y-4">
          <div>
            <label className="label">Titre du chantier</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[70px] resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Adresse</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Client</label>
              <input className="input" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
            </div>
            <div>
              <label className="label">Téléphone client</label>
              <input className="input" value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Échéance</label>
            <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </Modal>
    </>
  );
}
