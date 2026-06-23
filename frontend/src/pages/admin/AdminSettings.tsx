import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState, Spinner } from '@/components/ui/LoadingState';
import { adminApi, apiErrorMessage } from '@/lib/api';

export function AdminSettings() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await adminApi.get('/admin/settings')).data,
  });

  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading || !form) {
    return (
      <>
        <PageHeader title="Paramètres plateforme" />
        <LoadingState />
      </>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const payload = {
        currency: form.currency,
        monthlyPriceCents: Number(form.monthlyPriceCents),
        yearlyPriceCents: Number(form.yearlyPriceCents),
        trialDays: Number(form.trialDays),
        referralRewardMonths: Number(form.referralRewardMonths),
        referralDiscountPercent: Number(form.referralDiscountPercent),
      };
      await adminApi.put('/admin/settings', payload);
      setMsg('Paramètres enregistrés.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader
        title="Paramètres plateforme"
        subtitle="Prix, essais gratuits et règles de parrainage"
      />

      <form onSubmit={save} className="max-w-2xl space-y-6">
        <div className="card p-6">
          <h3 className="mb-4 font-semibold text-ink">Tarification</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Devise</label>
              <input className="input" value={form.currency} onChange={set('currency')} />
            </div>
            <div>
              <label className="label">Durée d'essai (jours)</label>
              <input className="input" type="number" value={form.trialDays} onChange={set('trialDays')} />
            </div>
            <div>
              <label className="label">Prix mensuel (centimes)</label>
              <input className="input" type="number" value={form.monthlyPriceCents} onChange={set('monthlyPriceCents')} />
            </div>
            <div>
              <label className="label">Prix annuel (centimes)</label>
              <input className="input" type="number" value={form.yearlyPriceCents} onChange={set('yearlyPriceCents')} />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="mb-4 font-semibold text-ink">Règles de parrainage</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Mois offerts par filleul</label>
              <input className="input" type="number" value={form.referralRewardMonths} onChange={set('referralRewardMonths')} />
            </div>
            <div>
              <label className="label">Réduction (%)</label>
              <input className="input" type="number" value={form.referralDiscountPercent} onChange={set('referralDiscountPercent')} />
            </div>
          </div>
        </div>

        {msg && <p className="text-sm text-emerald-600">{msg}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end">
          <button className="btn-primary" disabled={saving}>
            {saving ? <Spinner className="h-4 w-4 text-white" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </form>
    </>
  );
}
