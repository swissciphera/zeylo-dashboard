import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  UserPlus,
  Pencil,
  Trash2,
  Ban,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/LoadingState';
import { adminApi, apiErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Patron',
  MANAGER: 'Manager',
  STAFF: 'Employé',
};

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  company: string | null;
  companyId: string;
}

export function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: async () =>
      (await adminApi.get('/admin/users', { params: { search: search || undefined } }))
        .data as User[],
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-users'] });

  async function toggleBlock(u: User) {
    await adminApi.post(`/admin/users/${u.id}/${u.isActive ? 'block' : 'unblock'}`);
    invalidate();
  }

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminApi.delete(`/admin/users/${toDelete.id}`);
      invalidate();
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Utilisateur',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} size="sm" />
          <div>
            <div className="font-semibold text-ink">{u.name}</div>
            <div className="text-xs text-ink-faint">{u.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'company', header: 'Entreprise', render: (u) => u.company || '—' },
    {
      key: 'role',
      header: 'Rôle',
      render: (u) => <Badge tone="blue">{ROLE_LABEL[u.role] ?? u.role}</Badge>,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (u) => (
        <Badge tone={u.isActive ? 'green' : 'red'}>
          {u.isActive ? 'Actif' : 'Bloqué'}
        </Badge>
      ),
    },
    { key: 'createdAt', header: 'Inscription', render: (u) => formatDate(u.createdAt) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => (
        <div className="flex justify-end gap-1">
          <button
            title="Modifier"
            onClick={() => setEditing(u)}
            className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-muted hover:text-ink"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            title={u.isActive ? 'Bloquer' : 'Débloquer'}
            onClick={() => toggleBlock(u)}
            className={`rounded-lg p-1.5 ${
              u.isActive
                ? 'text-ink-faint hover:bg-amber-50 hover:text-amber-600'
                : 'text-ink-faint hover:bg-emerald-50 hover:text-emerald-600'
            }`}
          >
            {u.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          </button>
          <button
            title="Supprimer"
            onClick={() => setToDelete(u)}
            className="rounded-lg p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        subtitle="Comptes clients / patrons de la plateforme"
        actions={
          <div className="flex gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="input w-60 pl-9"
              />
            </div>
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Nouvel utilisateur
            </button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        loading={isLoading}
        emptyTitle="Aucun utilisateur"
        emptyDescription="Créez le premier compte client de la plateforme."
        emptyAction={
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" /> Nouvel utilisateur
          </button>
        }
      />

      {createOpen && (
        <UserFormModal
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            invalidate();
            setCreateOpen(false);
          }}
        />
      )}
      {editing && (
        <UserFormModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            invalidate();
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Supprimer l'utilisateur"
        message={`Supprimer définitivement « ${toDelete?.name} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
      />
    </>
  );
}

function UserFormModal({
  user,
  onClose,
  onSaved,
}: {
  user?: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    role: user?.role ?? 'OWNER',
    isActive: user?.isActive ?? true,
    companyMode: 'new', // 'new' | 'existing'
    companyId: '',
    companyName: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: companies } = useQuery({
    queryKey: ['company-options'],
    queryFn: async () =>
      (await adminApi.get('/admin/users/company-options')).data as {
        id: string;
        name: string;
      }[],
    enabled: !isEdit,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await adminApi.put(`/admin/users/${user!.id}`, {
          name: form.name,
          email: form.email,
          role: form.role,
          isActive: form.isActive,
        });
      } else {
        const payload: any = {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        };
        if (form.companyMode === 'existing' && form.companyId) {
          payload.companyId = form.companyId;
        } else {
          payload.companyName = form.companyName || form.name;
        }
        await adminApi.post('/admin/users', payload);
      }
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" form="user-form" disabled={saving}>
            {saving && <Spinner className="h-4 w-4 text-white" />}
            {isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Nom</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>

        {!isEdit && (
          <div>
            <label className="label">Mot de passe</label>
            <input
              className="input"
              type="password"
              required
              minLength={10}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimum 10 caractères"
            />
          </div>
        )}

        <div>
          <label className="label">Rôle</label>
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="OWNER">Patron</option>
            <option value="MANAGER">Manager</option>
            <option value="STAFF">Employé</option>
          </select>
        </div>

        {!isEdit && (
          <div className="space-y-2">
            <label className="label">Entreprise</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, companyMode: 'new' })}
                className={`btn ${form.companyMode === 'new' ? 'btn-primary' : 'btn-secondary'} !py-2`}
              >
                Nouvelle
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, companyMode: 'existing' })}
                className={`btn ${form.companyMode === 'existing' ? 'btn-primary' : 'btn-secondary'} !py-2`}
              >
                Existante
              </button>
            </div>
            {form.companyMode === 'new' ? (
              <input
                className="input"
                placeholder="Nom de l'entreprise (défaut : nom de l'utilisateur)"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            ) : (
              <select
                className="input"
                value={form.companyId}
                onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                required
              >
                <option value="">Sélectionner une entreprise…</option>
                {companies?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-300"
            />
            Compte actif (décocher pour bloquer)
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
