import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Contact as ContactIcon, Mail, Phone, Globe } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/LoadingState';
import { clientApi, apiErrorMessage } from '@/lib/api';

const EMPTY = { name: '', type: 'PROSPECT', email: '', phone: '', notes: '' };

export function AppContacts() {
  const qc = useQueryClient();
  const [type, setType] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', type],
    queryFn: async () =>
      (await clientApi.get('/app/contacts', { params: { type: type || undefined } }))
        .data as any[],
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = { name: form.name, type: form.type };
      ['email', 'phone', 'notes'].forEach((k) => form[k] && (payload[k] = form[k]));
      await clientApi.post('/app/contacts', payload);
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setOpen(false);
      setForm(EMPTY);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Contact',
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-muted text-ink-muted">
            <ContactIcon className="h-4 w-4" />
          </span>
          <span className="font-semibold text-ink">{r.name}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (r) => (
        <Badge tone={r.type === 'CLIENT' ? 'green' : 'blue'}>
          {r.type === 'CLIENT' ? 'Client' : 'Prospect'}
        </Badge>
      ),
    },
    {
      key: 'contact',
      header: 'Coordonnées',
      render: (r) => (
        <div className="space-y-0.5 text-xs text-ink-muted">
          {r.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {r.email}</div>}
          {r.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {r.phone}</div>}
          {!r.email && !r.phone && '—'}
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
          {r.source === 'WEBSITE_FORM' && <Globe className="h-3 w-3" />}
          {r.source === 'MANUAL' ? 'Manuel' : r.source === 'WEBSITE_FORM' ? 'Formulaire' : 'Email'}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle="Prospects et clients — alimentation manuelle aujourd'hui, formulaire & email à venir"
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nouveau contact
          </button>
        }
      />

      <div className="mb-6">
        <Tabs
          items={[
            { key: '', label: 'Tous' },
            { key: 'PROSPECT', label: 'Prospects' },
            { key: 'CLIENT', label: 'Clients' },
          ]}
          value={type}
          onChange={setType}
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={isLoading}
        emptyTitle="Aucun contact"
        emptyDescription="Ajoutez vos prospects et clients pour les retrouver ici."
        emptyAction={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nouveau contact
          </button>
        }
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nouveau contact"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Annuler</button>
            <button className="btn-primary" form="contact-form" disabled={saving}>
              {saving && <Spinner className="h-4 w-4 text-white" />} Créer
            </button>
          </>
        }
      >
        <form id="contact-form" onSubmit={create} className="space-y-4">
          <div>
            <label className="label">Nom</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="PROSPECT">Prospect</option>
              <option value="CLIENT">Client</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input min-h-[70px] resize-none" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </Modal>
    </>
  );
}
