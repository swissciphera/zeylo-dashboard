import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Gift, Copy, CheckCircle2, XCircle, BadgeCheck, ShieldCheck, RefreshCw, Globe, Cloud, Trash2, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState, Spinner } from '@/components/ui/LoadingState';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { CompanyAutocomplete } from '@/components/CompanyAutocomplete';
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
            { key: 'domain', label: 'Domaine' },
            { key: 'referral', label: 'Parrainage' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'company' ? (
        <CompanyTab />
      ) : tab === 'domain' ? (
        <DomainTab />
      ) : (
        <ReferralTab />
      )}
    </>
  );
}

function CompanyTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: async () => (await clientApi.get('/app/company')).data,
  });
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyName, setVerifyName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  async function verifyFromRegistry(url: string) {
    setVerifying(true);
    setVerifyMsg(null);
    setError(null);
    try {
      const res = await clientApi.post('/app/company-verification/verify-company', {
        url,
      });
      setForm((f: any) => ({ ...f, ...res.data.company }));
      qc.invalidateQueries({ queryKey: ['company'] });
      setVerifyMsg('Informations importées du registre du commerce.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  }

  async function toggleAuto(value: boolean) {
    setForm((f: any) => ({ ...f, autoVerify: value }));
    try {
      await clientApi.put('/app/company', { autoVerify: value });
      qc.invalidateQueries({ queryKey: ['company'] });
    } catch {
      /* revert on error */
      setForm((f: any) => ({ ...f, autoVerify: !value }));
    }
  }

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
        website: form.website,
        ideNumber: form.ideNumber,
        vatNumber: form.vatNumber,
        address: form.address,
        postalCode: form.postalCode,
        city: form.city,
        email: form.email,
        phone: form.phone,
        autoVerify: !!form.autoVerify,
      });
      setMsg('Profil enregistré.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6">
      {form.verifiedAt && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
          <BadgeCheck className="h-4 w-4" />
          Entreprise vérifiée au registre du commerce le{' '}
          {formatDate(form.verifiedAt)}.
        </div>
      )}

      {/* Identité */}
      <div className="card p-6">
        <h3 className="mb-4 font-semibold text-ink">Identité</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nom de l'entreprise</label>
            <input className="input" value={form.name || ''} onChange={set('name')} />
          </div>
          <div>
            <label className="label">Secteur</label>
            <input className="input" value={form.sector || ''} onChange={set('sector')} placeholder="Nettoyage, fiduciaire…" />
          </div>
          <div>
            <label className="label">Site web</label>
            <input className="input" value={form.website || ''} onChange={set('website')} placeholder="https://exemple.ch" />
          </div>
        </div>
      </div>

      {/* Registre */}
      <div className="card p-6">
        <h3 className="mb-4 font-semibold text-ink">Registre du commerce</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Numéro IDE</label>
            <input className="input font-mono" value={form.ideNumber || ''} onChange={set('ideNumber')} placeholder="CHE-123.456.789" />
          </div>
          <div>
            <label className="label">Numéro TVA</label>
            <input className="input font-mono" value={form.vatNumber || ''} onChange={set('vatNumber')} placeholder="CHE-123.456.789 TVA" />
          </div>
        </div>
        {/* Verify from the official registry */}
        <div className="mt-5 border-t border-line pt-5">
          <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
            <ShieldCheck className="h-4 w-4 text-brand-600" /> Vérifier au registre
          </div>
          <p className="mb-3 text-xs text-ink-faint">
            Recherchez votre entreprise pour importer automatiquement IDE, TVA,
            adresse et forme juridique depuis le registre du commerce.
          </p>
          <CompanyAutocomplete
            apiClient={clientApi}
            basePath="/app/company-verification"
            placeholder="Rechercher mon entreprise…"
            value={verifyName}
            onChange={setVerifyName}
            onPick={(r) => {
              setVerifyName(r.nom);
              verifyFromRegistry(r.lien);
            }}
          />
          {verifying && (
            <p className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
              <Spinner className="h-3.5 w-3.5" /> Import en cours…
            </p>
          )}
          {verifyMsg && <p className="mt-2 text-xs text-emerald-600">{verifyMsg}</p>}
        </div>

        {/* Automatic monthly verification */}
        <div className="mt-5 rounded-xl bg-surface-subtle p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={!!form.autoVerify}
              onChange={(e) => toggleAuto(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-300"
            />
            <span>
              <span className="flex items-center gap-2 text-sm font-medium text-ink">
                <RefreshCw className="h-3.5 w-3.5 text-ink-faint" />
                Vérification automatique mensuelle
              </span>
              <span className="mt-0.5 block text-xs text-ink-muted">
                Une fois par mois, Zeylo revérifie automatiquement vos
                informations au registre du commerce et les met à jour si elles
                ont changé (raison sociale, adresse, forme juridique…). Vous
                gardez toujours des données officielles à jour, sans rien faire.
              </span>
              {form.lastAutoVerifyAt && (
                <span className="mt-1 block text-xs text-ink-faint">
                  Dernière vérification auto : {formatDate(form.lastAutoVerifyAt)}
                </span>
              )}
            </span>
          </label>
        </div>
      </div>

      {/* Coordonnées */}
      <div className="card p-6">
        <h3 className="mb-4 font-semibold text-ink">Coordonnées</h3>
        <div className="grid gap-4 sm:grid-cols-2">
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
            <input className="input" value={form.address || ''} onChange={set('address')} placeholder="Rue et numéro" />
          </div>
          <div>
            <label className="label">Code postal</label>
            <input className="input" value={form.postalCode || ''} onChange={set('postalCode')} />
          </div>
          <div>
            <label className="label">Ville</label>
            <input className="input" value={form.city || ''} onChange={set('city')} />
          </div>
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

function CopyChip({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="ml-2 inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-ink-soft ring-1 ring-line hover:bg-surface-muted"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copié' : 'Copier'}
    </button>
  );
}

function DomainTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['domain'],
    queryFn: async () => (await clientApi.get('/app/domain')).data,
  });
  const [domain, setDomain] = useState('');
  const [cfToken, setCfToken] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !data) return <LoadingState />;

  const status: string = data.status;
  const records: any[] = data.instructions?.records ?? [];

  async function call(path: string, body?: any) {
    setBusy(path);
    setMsg(null);
    setError(null);
    try {
      const res = await clientApi.post(`/app/domain${path}`, body);
      qc.setQueryData(['domain'], res.data);
      qc.invalidateQueries({ queryKey: ['domain'] });
      if (path === '/verify' || path === '/cloudflare') {
        setMsg(
          res.data.verified
            ? 'Domaine vérifié ! Vos liens utiliseront désormais votre domaine.'
            : `En attente de propagation DNS (CNAME ${res.data.cnameOk ? 'OK' : 'manquant'}, TXT ${res.data.txtOk ? 'OK' : 'manquant'}). Réessayez dans quelques minutes.`,
        );
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function saveDomain(e: React.FormEvent) {
    e.preventDefault();
    await call('', { domain });
  }
  async function removeDomain() {
    setBusy('remove');
    try {
      const res = await clientApi.delete('/app/domain');
      qc.setQueryData(['domain'], res.data);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Cloudflare recommendation */}
      <div className="flex items-start gap-3 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-800 ring-1 ring-brand-200">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <strong>Recommandé : Cloudflare.</strong> Connectez votre domaine via
          Cloudflare pour bénéficier d'un SSL gratuit, d'une protection
          anti-attaques et d'une configuration automatique en un clic.
        </div>
      </div>

      {status === 'VERIFIED' ? (
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink">{data.domain}</span>
                <Badge tone="green" dot>Vérifié</Badge>
              </div>
              <p className="text-sm text-ink-muted">
                Vos liens temporaires utilisent désormais votre domaine.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-surface-subtle p-3 text-sm text-ink-soft">
            Exemple : <span className="font-mono">https://{data.domain}/access/…</span>
          </div>
          <button className="btn-ghost mt-4 text-red-600 hover:bg-red-50" onClick={removeDomain} disabled={busy !== null}>
            <Trash2 className="h-4 w-4" /> Déconnecter le domaine
          </button>
        </div>
      ) : status === 'NONE' ? (
        <form onSubmit={saveDomain} className="card p-6">
          <div className="mb-1.5 flex items-center gap-2">
            <Globe className="h-5 w-5 text-brand-600" />
            <h3 className="font-semibold text-ink">Connecter un domaine</h3>
          </div>
          <p className="mb-4 text-sm text-ink-muted">
            Utilisez un sous-domaine pour vos liens (notation client, accès
            chantier…) à votre image, ex.{' '}
            <span className="font-mono">liens.monentreprise.ch</span>.
          </p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="liens.monentreprise.ch"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <button className="btn-primary shrink-0" disabled={busy !== null || !domain}>
              {busy === '' ? <Spinner className="h-4 w-4 text-white" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </form>
      ) : (
        // PENDING
        <>
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-brand-600" />
                <span className="font-semibold text-ink">{data.domain}</span>
                <Badge tone="amber" dot>En attente</Badge>
              </div>
              <button className="btn-ghost text-red-600 hover:bg-red-50 !py-1.5" onClick={removeDomain}>
                <Trash2 className="h-4 w-4" /> Changer
              </button>
            </div>

            <h4 className="text-sm font-semibold text-ink">1. Ajoutez ces enregistrements DNS</h4>
            <p className="mt-1 text-sm text-ink-muted">
              Dans votre hébergeur de domaine, créez ces deux enregistrements :
            </p>
            <div className="mt-3 space-y-3">
              {records.map((r) => (
                <div key={r.type} className="rounded-xl border border-line p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span><span className="text-ink-faint">Type :</span> <b>{r.type}</b></span>
                    <span className="break-all"><span className="text-ink-faint">Nom :</span> <span className="font-mono">{r.name}</span><CopyChip value={r.name} /></span>
                  </div>
                  <div className="mt-1 break-all">
                    <span className="text-ink-faint">Valeur :</span> <span className="font-mono">{r.value}</span><CopyChip value={r.value} />
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">{r.note}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-surface-subtle p-4 text-sm text-ink-soft">
              <h4 className="mb-1 font-semibold text-ink">Comment faire chez votre hébergeur ?</h4>
              <ol className="ml-4 list-decimal space-y-1 text-ink-muted">
                <li>Connectez-vous à votre hébergeur de domaine (Infomaniak, OVH, Gandi, Hostpoint, Cloudflare…).</li>
                <li>Ouvrez la <b>zone DNS</b> de votre domaine.</li>
                <li>Ajoutez l'enregistrement <b>CNAME</b> ci-dessus (nom = sous-domaine, valeur = cible Zeylo).</li>
                <li>Ajoutez l'enregistrement <b>TXT</b> de vérification.</li>
                <li>Enregistrez, patientez quelques minutes, puis cliquez sur « Vérifier ».</li>
              </ol>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button className="btn-primary" onClick={() => call('/verify')} disabled={busy !== null}>
                {busy === '/verify' ? <Spinner className="h-4 w-4 text-white" /> : <RefreshCw className="h-4 w-4" />}
                Vérifier
              </button>
              {msg && <span className="text-sm text-ink-soft">{msg}</span>}
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>

          {/* Cloudflare automatic */}
          <div className="card p-6">
            <div className="mb-1.5 flex items-center gap-2">
              <Cloud className="h-5 w-5 text-brand-600" />
              <h3 className="font-semibold text-ink">Configuration automatique (Cloudflare)</h3>
            </div>
            <p className="mb-3 text-sm text-ink-muted">
              Si votre domaine est sur Cloudflare, collez un <b>jeton API</b>
              (droits « DNS : Edit » sur votre zone) et Zeylo crée les
              enregistrements automatiquement.{' '}
              <a
                href="https://dash.cloudflare.com/profile/api-tokens"
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 hover:underline"
              >
                Créer un jeton ↗
              </a>
            </p>
            <div className="flex gap-2">
              <input
                className="input flex-1 font-mono"
                type="password"
                placeholder="Jeton API Cloudflare"
                value={cfToken}
                onChange={(e) => setCfToken(e.target.value)}
              />
              <button
                className="btn-primary shrink-0"
                onClick={() => call('/cloudflare', { apiToken: cfToken })}
                disabled={busy !== null || !cfToken}
              >
                {busy === '/cloudflare' ? <Spinner className="h-4 w-4 text-white" /> : <Cloud className="h-4 w-4" />}
                Configurer automatiquement
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
