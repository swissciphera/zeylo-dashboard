import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { AuthShell } from '@/components/layout/AuthShell';
import { Spinner } from '@/components/ui/LoadingState';
import { adminApi, apiErrorMessage } from '@/lib/api';

export function AdminSetup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // First-run gate: if an admin already exists, the setup page is locked.
  const { data, isLoading } = useQuery({
    queryKey: ['setup-status'],
    queryFn: async () =>
      (await adminApi.get('/admin/setup/status')).data as {
        needsSetup: boolean;
      },
  });

  useEffect(() => {
    if (data && !data.needsSetup) navigate('/admin/login', { replace: true });
  }, [data, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminApi.post('/admin/setup', form);
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
        <div>
          <label className="label">Nom complet</label>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jean Dupont"
          />
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
