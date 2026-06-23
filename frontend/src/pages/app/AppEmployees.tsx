import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/LoadingState';
import { clientApi, apiErrorMessage } from '@/lib/api';
import { formatDate, daysUntil } from '@/lib/format';

export function AppEmployees() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    position: '',
    email: '',
    phone: '',
    contractEndDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => (await clientApi.get('/app/employees')).data as any[],
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = { ...form };
      if (!payload.contractEndDate) delete payload.contractEndDate;
      if (!payload.email) delete payload.email;
      await clientApi.post('/app/employees', payload);
      qc.invalidateQueries({ queryKey: ['employees'] });
      setOpen(false);
      setForm({ firstName: '', lastName: '', position: '', email: '', phone: '', contractEndDate: '' });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Employé',
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${r.firstName} ${r.lastName}`} size="sm" />
          <div>
            <div className="font-semibold text-ink">
              {r.firstName} {r.lastName}
            </div>
            <div className="text-xs text-ink-faint">{r.position || '—'}</div>
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Contact', render: (r) => r.email || r.phone || '—' },
    {
      key: 'contract',
      header: 'Fin de contrat',
      render: (r) => {
        if (!r.contractEndDate) return <span className="text-ink-faint">—</span>;
        const days = daysUntil(r.contractEndDate);
        return (
          <div className="flex items-center gap-2">
            {formatDate(r.contractEndDate)}
            {days != null && days <= 30 && (
              <Badge tone={days <= 7 ? 'red' : 'amber'}>{days}j</Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Statut',
      render: (r) => (
        <Badge tone={r.isActive ? 'green' : 'gray'}>
          {r.isActive ? 'Actif' : 'Inactif'}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Employés"
        subtitle="Gérez vos collaborateurs, contrats et notes"
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Ajouter un employé
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        loading={isLoading}
        onRowClick={(r) => navigate(`/app/employees/${r.id}`)}
        emptyTitle="Aucun employé"
        emptyDescription="Commencez par ajouter votre premier collaborateur."
        emptyAction={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Ajouter un employé
          </button>
        }
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nouvel employé"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Annuler
            </button>
            <button className="btn-primary" form="emp-form" disabled={saving}>
              {saving && <Spinner className="h-4 w-4 text-white" />}
              Créer
            </button>
          </>
        }
      >
        <form id="emp-form" onSubmit={create} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Prénom</label>
            <input className="input" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div>
            <label className="label">Nom</label>
            <input className="input" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Poste</label>
            <input className="input" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Fin de contrat</label>
            <input className="input" type="date" value={form.contractEndDate} onChange={(e) => setForm({ ...form, contractEndDate: e.target.value })} />
          </div>
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
        </form>
      </Modal>
    </>
  );
}
