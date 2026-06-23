import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '@/components/layout/AuthShell';
import { Spinner } from '@/components/ui/LoadingState';
import { CompanyAutocomplete } from '@/components/CompanyAutocomplete';
import { clientApi, publicApi, apiErrorMessage } from '@/lib/api';
import { useClientAuth } from '@/stores/auth';

export function ClientRegister() {
  const navigate = useNavigate();
  const setAuth = useClientAuth((s) => s.setAuth);
  const [form, setForm] = useState({
    companyName: '',
    sector: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    referralCode: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = { ...form, referralCode: form.referralCode || undefined };
      const res = await clientApi.post('/auth/register', payload);
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
          Créer votre entreprise
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          14 jours d’essai. Aucune carte requise.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Nom de l’entreprise</label>
            <CompanyAutocomplete
              apiClient={publicApi}
              basePath="/public/company"
              required
              placeholder="Ex. NetClean Sàrl"
              value={form.companyName}
              onChange={(v) => setForm((f) => ({ ...f, companyName: v }))}
              onPick={async (r) => {
                // Prefill sector from the official sheet when possible.
                try {
                  const res = await publicApi.post('/public/company/details', {
                    url: r.lien,
                  });
                  setForm((f) => ({
                    ...f,
                    companyName: res.data?.company_name || r.nom,
                    sector: res.data?.sector || f.sector,
                  }));
                } catch {
                  /* keep typed value */
                }
              }}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Secteur (optionnel)</label>
            <input
              className="input"
              value={form.sector}
              onChange={(e) => setForm({ ...form, sector: e.target.value })}
              placeholder="Nettoyage, fiduciaire, maintenance…"
            />
          </div>
          <div>
            <label className="label">Prénom</label>
            <input
              className="input"
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Nom</label>
            <input
              className="input"
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="col-span-2">
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
          <div className="col-span-2">
            <label className="label">Code de parrainage (optionnel)</label>
            <input
              className="input"
              value={form.referralCode}
              onChange={(e) =>
                setForm({ ...form, referralCode: e.target.value })
              }
              placeholder="ZEY-XXXXXX"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <button className="btn-primary w-full" disabled={submitting}>
          {submitting && <Spinner className="h-4 w-4 text-white" />}
          Créer mon espace
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Déjà un compte ?{' '}
        <Link to="/app/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Se connecter
        </Link>
      </p>
    </AuthShell>
  );
}
