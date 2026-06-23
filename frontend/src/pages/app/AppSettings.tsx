import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save, Gift, Copy, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState, Spinner } from '@/components/ui/LoadingState';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { clientApi, apiErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';

export function AppSettings() {
  const [tab, setTab] = useState('company');
  return (
    <>
      <PageHeader title="Paramètres" subtitle="Profil de l'entreprise et programme de parrainage" />
      <div className="mb-6">
        <Tabs
          items={[
            { key: 'company', label: 'Entreprise' },
            { key: 'referral', label: 'Parrainage' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'company' ? <CompanyTab /> : <ReferralTab />}
    </>
  );
}

function CompanyTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: async () => (await clientApi.get('/app/company')).data,
  });
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading || !form) return <LoadingState />;

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      await clientApi.put('/app/company', {
        name: form.name,
        sector: form.sector,
        address: form.address,
        email: form.email,
        phone: form.phone,
      });
      setMsg('Profil enregistré.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-2xl card p-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Nom de l'entreprise</label>
          <input className="input" value={form.name || ''} onChange={set('name')} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Secteur</label>
          <input className="input" value={form.sector || ''} onChange={set('sector')} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" value={form.email || ''} onChange={set('email')} />
        </div>
        <div>
          <label className="label">Téléphone</label>
          <input className="input" value={form.phone || ''} onChange={set('phone')} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Adresse</label>
          <input className="input" value={form.address || ''} onChange={set('address')} />
        </div>
      </div>
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button className="btn-primary" disabled={saving}>
          {saving ? <Spinner className="h-4 w-4 text-white" /> : <Save className="h-4 w-4" />} Enregistrer
        </button>
      </div>
    </form>
  );
}

function ReferralTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['referral'],
    queryFn: async () => (await clientApi.get('/app/referral')).data,
  });
  const [copied, setCopied] = useState(false);

  if (isLoading || !data) return <LoadingState />;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <div className="card bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white">
          <Gift className="h-8 w-8" />
          <h3 className="mt-4 text-sm font-medium text-white/80">Votre code de parrainage</h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-display text-2xl font-semibold tracking-wide">
              {data.referralCode}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(data.referralCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded-lg bg-white/15 p-1.5 transition hover:bg-white/25"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          {copied && <p className="mt-1 text-xs text-white/70">Copié !</p>}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/15 pt-4">
            <div>
              <div className="text-2xl font-bold">{data.total}</div>
              <div className="text-xs text-white/70">Filleuls</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{data.converted}</div>
              <div className="text-xs text-white/70">Devenus payants</div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="card">
          <div className="border-b border-line px-5 py-4">
            <h3 className="font-semibold text-ink">Vos filleuls</h3>
          </div>
          {data.filleuls.length === 0 ? (
            <EmptyState
              icon={Gift}
              title="Aucun filleul pour l'instant"
              description="Partagez votre code pour gagner des mois gratuits."
            />
          ) : (
            <div className="divide-y divide-line">
              {data.filleuls.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <div className="font-medium text-ink">{f.name}</div>
                    <div className="text-xs text-ink-faint">{formatDate(f.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {f.rewardMonths > 0 && <Badge tone="blue">+{f.rewardMonths} mois</Badge>}
                    {f.convertedToPaid ? (
                      <span className="flex items-center gap-1 text-sm text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" /> Payant
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-ink-faint">
                        <XCircle className="h-4 w-4" /> En attente
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
