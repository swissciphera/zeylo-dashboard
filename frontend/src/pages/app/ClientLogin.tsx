import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '@/components/layout/AuthShell';
import { Spinner } from '@/components/ui/LoadingState';
import { clientApi, apiErrorMessage } from '@/lib/api';
import { useClientAuth } from '@/stores/auth';

export function ClientLogin() {
  const navigate = useNavigate();
  const setAuth = useClientAuth((s) => s.setAuth);
  const token = useClientAuth((s) => s.accessToken);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token) navigate('/app', { replace: true });
  }, [token, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await clientApi.post('/auth/login', form);
      setAuth(res.data);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell side="pro">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Bon retour 👋
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Connectez-vous à l’espace de gestion de votre entreprise.
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
            placeholder="vous@entreprise.ch"
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

      <p className="mt-6 text-center text-sm text-ink-muted">
        Pas encore de compte ?{' '}
        <Link to="/app/register" className="font-semibold text-brand-600 hover:text-brand-700">
          Créer une entreprise
        </Link>
      </p>
    </AuthShell>
  );
}
