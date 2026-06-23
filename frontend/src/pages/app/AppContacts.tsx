import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Contact as ContactIcon,
  Mail,
  Phone,
  Pencil,
  Trash2,
  Building2,
  User,
  Upload,
  X,
  Search,
  MapPin,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/LoadingState';
import { ContactPhoto } from '@/components/ContactPhoto';
import { clientApi, apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

const TYPE_LABEL: Record<string, string> = {
  PROSPECT: 'Prospect',
  CLIENT: 'Client',
  FORMER_CLIENT: 'Ancien client',
};
const TYPE_TONE: Record<string, any> = {
  PROSPECT: 'blue',
  CLIENT: 'green',
  FORMER_CLIENT: 'gray',
};

interface Contact {
  id: string;
  name: string;
  type: string;
  kind: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  street?: string;
  streetNumber?: string;
  postalCode?: string;
  city?: string;
  canton?: string;
  country?: string;
  ideNumber?: string;
  vatNumber?: string;
  photoFileId?: string;
  notes?: string;
}

export function AppContacts() {
  const qc = useQueryClient();
  const [type, setType] = useState('');
  const [editing, setEditing] = useState<Contact | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', type],
    queryFn: async () =>
      (await clientApi.get('/app/contacts', { params: { type: type || undefined } }))
        .data as Contact[],
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['contacts'] });

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await clientApi.delete(`/app/contacts/${toDelete.id}`);
      invalidate();
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Contact',
      render: (c) => (
        <div className="flex items-center gap-3">
          <ContactPhoto photoFileId={c.photoFileId} name={c.name} size="sm" />
          <div>
            <div className="font-semibold text-ink">{c.name}</div>
            <div className="flex items-center gap-1 text-xs text-ink-faint">
              {c.kind === 'ENTERPRISE' ? (
                <>
                  <Building2 className="h-3 w-3" /> Entreprise
                </>
              ) : (
                <>
                  <User className="h-3 w-3" /> Particulier
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (c) => <Badge tone={TYPE_TONE[c.type]}>{TYPE_LABEL[c.type] ?? c.type}</Badge>,
    },
    {
      key: 'contact',
      header: 'Coordonnées',
      render: (c) => (
        <div className="space-y-0.5 text-xs text-ink-muted">
          {c.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</div>}
          {c.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</div>}
          {!c.email && !c.phone && '—'}
        </div>
      ),
    },
    {
      key: 'city',
      header: 'Localité',
      render: (c) => [c.postalCode, c.city].filter(Boolean).join(' ') || '—',
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => setEditing(c)} className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-muted hover:text-ink">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setToDelete(c)} className="rounded-lg p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle="Prospects, clients et anciens clients"
        actions={
          <button className="btn-primary" onClick={() => setCreating(true)}>
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
            { key: 'FORMER_CLIENT', label: 'Anciens' },
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
        emptyDescription="Ajoutez vos prospects et clients, ou importez une entreprise depuis la page Vérification."
        emptyAction={
          <button className="btn-primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Nouveau contact
          </button>
        }
      />

      {(creating || editing) && (
        <ContactFormModal
          contact={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            invalidate();
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Supprimer le contact"
        message={`Supprimer « ${toDelete?.name} » ?`}
        confirmLabel="Supprimer"
        danger
      />
    </>
  );
}

const EMPTY = {
  type: 'PROSPECT',
  kind: 'INDIVIDUAL',
  firstName: '',
  lastName: '',
  companyName: '',
  email: '',
  phone: '',
  street: '',
  streetNumber: '',
  postalCode: '',
  city: '',
  canton: '',
  country: '',
  ideNumber: '',
  vatNumber: '',
  photoFileId: '',
  notes: '',
};

function ContactFormModal({
  contact,
  onClose,
  onSaved,
}: {
  contact: Contact | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!contact;
  const [form, setForm] = useState<any>(
    contact ? { ...EMPTY, ...contact } : { ...EMPTY },
  );
  const [results, setResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  // Manual search (only when the user clicks "Vérifier l'entreprise").
  async function searchCompany() {
    if (!form.companyName || form.companyName.trim().length < 2) return;
    setSearching(true);
    setError(null);
    setResults(null);
    try {
      const res = await clientApi.post('/app/company-verification/search', {
        query: form.companyName,
      });
      setResults(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  async function importCompany(url: string) {
    setImporting(true);
    setError(null);
    try {
      const res = await clientApi.post('/app/company-verification/details', { url });
      const d = res.data;
      const addr = d.address || {};
      setForm((f: any) => ({
        ...f,
        companyName: d.company_name || f.companyName,
        street: addr.street || '',
        streetNumber: addr.streetNumber || '',
        postalCode: addr.postal_code || '',
        city: addr.city || '',
        canton: addr.canton || '',
        country: addr.country || 'Suisse',
        ideNumber: d.registry_info?.ide || '',
        vatNumber: d.registry_info?.tva || '',
      }));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await clientApi.post('/app/files/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((f: any) => ({ ...f, photoFileId: res.data.id }));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        type: form.type,
        kind: form.kind,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        companyName: form.kind === 'ENTERPRISE' ? form.companyName || undefined : undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        street: form.street || undefined,
        streetNumber: form.streetNumber || undefined,
        postalCode: form.postalCode || undefined,
        city: form.city || undefined,
        canton: form.canton || undefined,
        country: form.country || undefined,
        ideNumber: form.ideNumber || undefined,
        vatNumber: form.vatNumber || undefined,
        photoFileId: form.photoFileId || undefined,
        notes: form.notes || undefined,
      };
      if (isEdit) await clientApi.put(`/app/contacts/${contact!.id}`, payload);
      else await clientApi.post('/app/contacts', payload);
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const isEnterprise = form.kind === 'ENTERPRISE';

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Modifier le contact' : 'Nouveau contact'}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" form="contact-form" disabled={saving}>
            {saving && <Spinner className="h-4 w-4 text-white" />}
            {isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </>
      }
    >
      <form id="contact-form" onSubmit={submit} className="space-y-5">
        {/* Photo */}
        <div className="flex items-center gap-4">
          <ContactPhoto photoFileId={form.photoFileId} name={form.companyName || `${form.firstName} ${form.lastName}`} size="lg" />
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
            />
            <button type="button" className="btn-secondary !py-2" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              Photo
            </button>
            {form.photoFileId && (
              <button type="button" className="btn-ghost !py-2 text-red-600" onClick={() => setForm({ ...form, photoFileId: '' })}>
                <X className="h-4 w-4" /> Retirer
              </button>
            )}
          </div>
        </div>

        {/* Type + Kind */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={set('type')}>
              <option value="PROSPECT">Prospect</option>
              <option value="CLIENT">Client</option>
              <option value="FORMER_CLIENT">Ancien client</option>
            </select>
          </div>
          <div>
            <label className="label">Catégorie</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, kind: 'INDIVIDUAL' })}
                className={cn('btn flex-1 !py-2', !isEnterprise ? 'btn-primary' : 'btn-secondary')}
              >
                <User className="h-4 w-4" /> Particulier
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, kind: 'ENTERPRISE' })}
                className={cn('btn flex-1 !py-2', isEnterprise ? 'btn-primary' : 'btn-secondary')}
              >
                <Building2 className="h-4 w-4" /> Entreprise
              </button>
            </div>
          </div>
        </div>

        {/* Enterprise: name with autocomplete */}
        {isEnterprise ? (
          <div>
            <label className="label">Nom de l'entreprise</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Nom de l'entreprise"
                value={form.companyName}
                onChange={(e) => {
                  setForm({ ...form, companyName: e.target.value });
                  setResults(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    searchCompany();
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary shrink-0"
                onClick={searchCompany}
                disabled={searching || !form.companyName}
              >
                {searching ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                Vérifier l'entreprise
              </button>
            </div>

            {results && (
              <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-line bg-white p-1.5 shadow-card scrollbar-slim">
                {results.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-ink-faint">Aucun résultat.</p>
                ) : (
                  results.map((r) => (
                    <button
                      key={r.lien}
                      type="button"
                      onClick={() => {
                        setForm((f: any) => ({ ...f, companyName: r.nom }));
                        setResults(null);
                        importCompany(r.lien);
                      }}
                      className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-surface-muted"
                    >
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{r.nom}</span>
                        {r.adresse && (
                          <span className="flex items-center gap-1 truncate text-xs text-ink-faint">
                            <MapPin className="h-3 w-3" /> {r.adresse}
                          </span>
                        )}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            {importing && (
              <p className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
                <Spinner className="h-3.5 w-3.5" /> Import des données officielles…
              </p>
            )}
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Personne de contact — Prénom</label>
                <input className="input" value={form.firstName} onChange={set('firstName')} />
              </div>
              <div>
                <label className="label">Personne de contact — Nom</label>
                <input className="input" value={form.lastName} onChange={set('lastName')} />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Prénom</label>
              <input className="input" value={form.firstName} onChange={set('firstName')} />
            </div>
            <div>
              <label className="label">Nom</label>
              <input className="input" value={form.lastName} onChange={set('lastName')} />
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input className="input" value={form.phone} onChange={set('phone')} />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="label">Adresse</label>
          <div className="grid gap-3 sm:grid-cols-6">
            <input className="input sm:col-span-4" placeholder="Rue" value={form.street} onChange={set('street')} />
            <input className="input sm:col-span-2" placeholder="N°" value={form.streetNumber} onChange={set('streetNumber')} />
            <input className="input sm:col-span-2" placeholder="NPA" value={form.postalCode} onChange={set('postalCode')} />
            <input className="input sm:col-span-4" placeholder="Ville" value={form.city} onChange={set('city')} />
            <input className="input sm:col-span-3" placeholder="Canton" value={form.canton} onChange={set('canton')} />
            <input className="input sm:col-span-3" placeholder="Pays" value={form.country} onChange={set('country')} />
          </div>
        </div>

        {/* Enterprise registry */}
        {isEnterprise && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">IDE</label>
              <input className="input font-mono" value={form.ideNumber} onChange={set('ideNumber')} placeholder="CHE-123.456.789" />
            </div>
            <div>
              <label className="label">TVA</label>
              <input className="input font-mono" value={form.vatNumber} onChange={set('vatNumber')} />
            </div>
          </div>
        )}

        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-[70px] resize-none" value={form.notes} onChange={set('notes')} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
