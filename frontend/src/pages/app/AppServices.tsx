import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Wrench, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState, Spinner } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { clientApi, apiErrorMessage } from '@/lib/api';

const EMPTY = { name: '', category: '', description: '', priceLabel: '', isActive: true };

export function AppServices() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => (await clientApi.get('/app/services')).data as any[],
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(s: any) {
    setEditing(s);
    setForm({ ...s });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        category: form.category || undefined,
        description: form.description || undefined,
        priceLabel: form.priceLabel || undefined,
        isActive: form.isActive,
      };
      if (editing) await clientApi.put(`/app/services/${editing.id}`, payload);
      else await clientApi.post('/app/services', payload);
      qc.invalidateQueries({ queryKey: ['services'] });
      setOpen(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    await clientApi.delete(`/app/services/${toDelete.id}`);
    qc.invalidateQueries({ queryKey: ['services'] });
    setToDelete(null);
  }

  return (
    <>
      <PageHeader
        title="Services"
        subtitle="Le catalogue libre des prestations de votre entreprise"
        actions={
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nouveau service
          </button>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Wrench}
            title="Aucun service"
            description="Créez vos prestations : nettoyage, fiduciaire, maintenance…"
            action={
              <button className="btn-primary" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Nouveau service
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <div key={s.id} className="card card-hover group p-5">
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Wrench className="h-5 w-5" />
                </span>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-muted hover:text-ink">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setToDelete(s)} className="rounded-lg p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <h3 className="mt-4 font-semibold text-ink">{s.name}</h3>
              {s.category && <p className="text-xs text-ink-faint">{s.category}</p>}
              {s.description && <p className="mt-2 text-sm text-ink-muted line-clamp-3">{s.description}</p>}
              <div className="mt-4 flex items-center justify-between">
                {s.priceLabel ? (
                  <span className="text-sm font-semibold text-ink">{s.priceLabel}</span>
                ) : (
                  <span />
                )}
                <Badge tone={s.isActive ? 'green' : 'gray'}>
                  {s.isActive ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Modifier le service' : 'Nouveau service'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Annuler</button>
            <button className="btn-primary" form="svc-form" disabled={saving}>
              {saving && <Spinner className="h-4 w-4 text-white" />}
              {editing ? 'Enregistrer' : 'Créer'}
            </button>
          </>
        }
      >
        <form id="svc-form" onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Nom</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Catégorie</label>
            <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Nettoyage, maintenance…" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[80px] resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Tarif (libre)</label>
            <input className="input" value={form.priceLabel} onChange={(e) => setForm({ ...form, priceLabel: e.target.value })} placeholder="dès 90.- / h" />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-300" />
            Service actif
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title="Supprimer le service"
        message={`Voulez-vous vraiment supprimer « ${toDelete?.name} » ?`}
        confirmLabel="Supprimer"
        danger
      />
    </>
  );
}
