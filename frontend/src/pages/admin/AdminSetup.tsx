import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { AuthShell } from '@/components/layout/AuthShell';
import { Spinner } from '@/components/ui/LoadingState';
import { adminApi, apiErrorMessage } from '@/lib/api';

export function AdminSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // First-run gate: if an admin already exists, the setup page is locked.
  // Always read fresh (no stale cache) so the gate reacts immediately.
  const { data, isLoading } = useQuery({
    queryKey: ['setup-status'],
    queryFn: async () =>
      (await adminApi.get('/admin/setup/status')).data as {
        needsSetup: boolean;
      },
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (data && !data.needsSetup) navigate('/admin/login', { replace: true });
  }, [data, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminApi.post('/admin/setup', {
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        password: form.password,
      });
      // Refresh the first-run gate so /admin/login no longer redirects here.
      await queryClient.invalidateQueries({ queryKey: ['setup-status'] });
      navigate('/admin/login', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || (data && !data.needsSetup)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  return (
    <AuthShell side="platform">
      <div className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
          <ShieldCheck className="h-3.5 w-3.5" /> Première installation
        </span>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-ink">
          Créer le compte administrateur
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Ce compte contrôle l’ensemble de la plateforme Zeylo. Il ne peut être
          créé qu’une seule fois.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Prénom</label>
            <input
              className="input"
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="Jean"
            />
          </div>
          <div>
            <label className="label">Nom</label>
            <input
              className="input"
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Dupont"
            />
          </div>
        </div>
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="admin@zeylo.ch"
          />
        </div>
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

        {error && (
          <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <button className="btn-primary w-full" disabled={submitting}>
          {submitting && <Spinner className="h-4 w-4 text-white" />}
          Créer le compte
        </button>
      </form>
    </AuthShell>
  );
}
