import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthShell } from '@/components/layout/AuthShell';
import { LoadingState, Spinner } from '@/components/ui/LoadingState';
import { adminApi, apiErrorMessage } from '@/lib/api';
import { useAdminAuth } from '@/stores/auth';

export function AdminLogin() {
  const navigate = useNavigate();
  const setAuth = useAdminAuth((s) => s.setAuth);
  const token = useAdminAuth((s) => s.accessToken);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // First-run gate: read fresh status, redirect to /admin/setup when no admin
  // exists yet (n8n/Chatwoot behaviour). Done at render time for reliability.
  const { data, isLoading } = useQuery({
    queryKey: ['setup-status'],
    queryFn: async () =>
      (await adminApi.get('/admin/setup/status')).data as {
        needsSetup: boolean;
      },
    staleTime: 0,
    gcTime: 0,
  });

  if (token) return <Navigate to="/admin" replace />;
  if (isLoading) {
    return (
      <AuthShell side="platform">
        <LoadingState label="Initialisation…" />
      </AuthShell>
    );
  }
  if (data?.needsSetup) return <Navigate to="/admin/setup" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await adminApi.post('/admin/auth/login', form);
      setAuth(res.data);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell side="platform">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Console plateforme
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Connectez-vous à votre espace administrateur Zeylo.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
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
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••••"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <button className="btn-primary w-full" disabled={submitting}>
          {submitting && <Spinner className="h-4 w-4 text-white" />}
          Se connecter
        </button>
      </form>
    </AuthShell>
  );
}
