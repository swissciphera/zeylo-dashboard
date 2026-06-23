import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save, Mail, Send } from 'lucide-react';
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

  // Test email state
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: boolean; mock?: boolean; message: string } | null
  >(null);

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

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

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
        emailSubject: form.emailSubject,
        emailTemplateHtml: form.emailTemplateHtml,
      };
      await adminApi.put('/admin/settings', payload);
      setMsg('Paramètres enregistrés.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    try {
      // Save current template first so the test uses what's on screen.
      await adminApi.put('/admin/settings', {
        emailSubject: form.emailSubject,
        emailTemplateHtml: form.emailTemplateHtml,
      });
      const res = await adminApi.post('/admin/settings/test-email', {
        to: testTo,
      });
      setTestResult(res.data);
    } catch (err) {
      setTestResult({ ok: false, message: apiErrorMessage(err) });
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Paramètres plateforme"
        subtitle="Prix, essais gratuits, parrainage et emails"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: pricing + referral (saved together) */}
        <form onSubmit={save} className="space-y-6">
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

        {/* Right column: email template + test */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-brand-600" />
              <h3 className="font-semibold text-ink">Email (Resend)</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Sujet de l'email</label>
                <input
                  className="input"
                  value={form.emailSubject ?? ''}
                  onChange={set('emailSubject')}
                />
              </div>
              <div>
                <label className="label">Contenu HTML</label>
                <textarea
                  className="input min-h-[220px] resize-y font-mono text-xs"
                  value={form.emailTemplateHtml ?? ''}
                  onChange={set('emailTemplateHtml')}
                  spellCheck={false}
                />
                <p className="mt-1 text-xs text-ink-faint">
                  Ce HTML est utilisé pour les emails envoyés via Resend. Cliquez
                  sur « Enregistrer » pour le sauvegarder.
                </p>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="card overflow-hidden">
            <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink-soft">
              Aperçu
            </div>
            <iframe
              title="Aperçu email"
              className="h-64 w-full bg-white"
              srcDoc={form.emailTemplateHtml ?? ''}
            />
          </div>

          {/* Test send */}
          <div className="card p-6">
            <h3 className="mb-1 font-semibold text-ink">Tester l'envoi</h3>
            <p className="mb-4 text-sm text-ink-muted">
              Envoie un email de test (sujet + HTML ci-dessus) à l'adresse
              indiquée.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="input flex-1"
                type="email"
                placeholder="vous@exemple.ch"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={sendTest}
                disabled={testing || !testTo}
              >
                {testing ? <Spinner className="h-4 w-4 text-white" /> : <Send className="h-4 w-4" />}
                Envoyer un test
              </button>
            </div>
            {testResult && (
              <div
                className={`mt-4 rounded-xl px-3.5 py-2.5 text-sm ring-1 ${
                  !testResult.ok
                    ? 'bg-red-50 text-red-700 ring-red-200'
                    : testResult.mock
                      ? 'bg-amber-50 text-amber-700 ring-amber-200'
                      : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                }`}
              >
                {testResult.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
