import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Building2,
  MapPin,
  ArrowRight,
  CheckCircle2,
  BadgeCheck,
  Users,
  ChevronLeft,
  PencilLine,
  Info,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState, Spinner } from '@/components/ui/LoadingState';
import { Badge } from '@/components/ui/Badge';
import { clientApi, apiErrorMessage } from '@/lib/api';

interface SearchResult {
  nom: string;
  adresse: string | null;
  lien: string;
}

export function AppVerify() {
  const { data: status } = useQuery({
    queryKey: ['verify-status'],
    queryFn: async () =>
      (await clientApi.get('/app/company-verification/status')).data as {
        available: boolean;
      },
  });

  return (
    <>
      <PageHeader
        title="Vérification d'entreprise"
        subtitle="Recherchez une entreprise suisse et importez ses données officielles"
      />
      {status === undefined ? (
        <div className="card">
          <LoadingState />
        </div>
      ) : status.available ? (
        <AutoVerify />
      ) : (
        <ManualEntry />
      )}
    </>
  );
}

// ── Automatic mode (proxy available) ──────────────────────────
function AutoVerify() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function doSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setError(null);
    setResults(null);
    setSelected(null);
    setDetails(null);
    setSaved(false);
    try {
      const res = await clientApi.post('/app/company-verification/search', { query });
      setResults(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  async function openDetails(r: SearchResult) {
    setSelected(r);
    setDetails(null);
    setSaved(false);
    setLoadingDetails(true);
    setError(null);
    try {
      const res = await clientApi.post('/app/company-verification/details', { url: r.lien });
      setDetails(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoadingDetails(false);
    }
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await clientApi.post('/app/company-verification/save', { url: selected.lien });
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form onSubmit={doSearch} className="mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
            <input
              className="input !rounded-2xl !py-3.5 pl-12 text-base"
              placeholder="Nom de l'entreprise (ex. Nestlé, Migros…)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="btn-primary !rounded-2xl !px-5" disabled={searching || query.length < 2}>
            {searching ? <Spinner className="h-5 w-5 text-white" /> : <ArrowRight className="h-5 w-5" />}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {selected ? (
        <div>
          <button
            onClick={() => {
              setSelected(null);
              setDetails(null);
            }}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" /> Retour aux résultats
          </button>
          {loadingDetails ? (
            <div className="card flex flex-col items-center justify-center py-20">
              <Spinner className="h-8 w-8" />
              <p className="mt-4 text-sm font-medium text-ink-soft">
                Récupération des données officielles…
              </p>
              <p className="mt-1 text-xs text-ink-faint">{selected.nom}</p>
            </div>
          ) : details ? (
            <DetailsView data={details} saving={saving} saved={saved} onSave={save} />
          ) : null}
        </div>
      ) : (
        <>
          {searching && (
            <div className="card flex flex-col items-center justify-center py-16">
              <Spinner className="h-7 w-7" />
              <p className="mt-3 text-sm text-ink-muted">Recherche en cours…</p>
            </div>
          )}
          {results && !searching && (
            results.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={Building2}
                  title="Aucun résultat"
                  description="Essayez un autre nom ou une orthographe différente."
                />
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((r) => (
                  <button
                    key={r.lien}
                    onClick={() => openDetails(r)}
                    className="card card-hover flex w-full items-center gap-4 p-4 text-left"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ink">{r.nom}</div>
                      {r.adresse && (
                        <div className="flex items-center gap-1 text-xs text-ink-faint">
                          <MapPin className="h-3 w-3" /> {r.adresse}
                        </div>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint" />
                  </button>
                ))}
              </div>
            )
          )}
          {!results && !searching && (
            <div className="card flex flex-col items-center gap-3 p-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <BadgeCheck className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold text-ink">Vérifiez une entreprise</h3>
              <p className="max-w-sm text-sm text-ink-muted">
                Tapez le nom d'une entreprise suisse pour récupérer ses informations
                au registre du commerce (IDE, TVA, adresse, direction…).
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ── Manual mode (no proxy configured) ─────────────────────────
function ManualEntry() {
  const [form, setForm] = useState({
    name: '',
    sector: '',
    address: '',
    ideNumber: '',
    vatNumber: '',
    email: '',
    phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill with the current company.
  useEffect(() => {
    clientApi.get('/app/company').then((res) => {
      const c = res.data || {};
      setForm((f) => ({
        ...f,
        name: c.name ?? '',
        sector: c.sector ?? '',
        address: c.address ?? '',
        ideNumber: c.ideNumber ?? '',
        vatNumber: c.vatNumber ?? '',
        email: c.email ?? '',
        phone: c.phone ?? '',
      }));
    });
  }, []);

  const set = (k: string) => (e: any) => {
    setForm({ ...form, [k]: e.target.value });
    setSaved(false);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await clientApi.put('/app/company', form);
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <strong>Recherche automatique indisponible.</strong> Aucun proxy n'est
          configuré, la recherche au registre est désactivée. Vous pouvez saisir
          les informations de votre entreprise manuellement ci-dessous.
        </div>
      </div>

      <form onSubmit={save} className="card max-w-2xl space-y-4 p-6">
        <div className="flex items-center gap-2">
          <PencilLine className="h-5 w-5 text-brand-600" />
          <h3 className="font-semibold text-ink">Saisie manuelle</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nom de l'entreprise</label>
            <input className="input" value={form.name} onChange={set('name')} required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Secteur</label>
            <input className="input" value={form.sector} onChange={set('sector')} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Adresse</label>
            <input className="input" value={form.address} onChange={set('address')} />
          </div>
          <div>
            <label className="label">IDE</label>
            <input className="input font-mono" value={form.ideNumber} onChange={set('ideNumber')} placeholder="CHE-123.456.789" />
          </div>
          <div>
            <label className="label">N° TVA</label>
            <input className="input font-mono" value={form.vatNumber} onChange={set('vatNumber')} placeholder="CHE-123.456.789 TVA" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input className="input" value={form.phone} onChange={set('phone')} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
              <CheckCircle2 className="h-5 w-5" /> Enregistré
            </span>
          )}
          <button className="btn-primary" disabled={saving}>
            {saving ? <Spinner className="h-4 w-4 text-white" /> : <BadgeCheck className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}

function DetailsView({
  data,
  saving,
  saved,
  onSave,
}: {
  data: any;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  const addr = data.address || {};
  const addressLine = [
    addr.complement,
    addr.street,
    [addr.postal_code, addr.city].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ');
  const ri = data.registry_info || {};

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink">{data.company_name || '—'}</h2>
            {data.sector && <p className="text-sm text-ink-muted">{data.sector}</p>}
          </div>
          {data.status && <Badge tone="green" dot>{data.status}</Badge>}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="IDE" value={ri.ide} mono />
          <Field label="TVA" value={ri.tva} mono />
          <Field label="Forme juridique" value={ri.legal_form} />
          <Field label="Capital" value={data.stats?.capital} />
          <Field label="Âge" value={data.stats?.age} />
          <Field label="Inscription RC" value={ri.registration_date} />
          <Field label="Adresse" value={addressLine} className="col-span-2 sm:col-span-3" />
          <Field label="Domicile" value={ri.domicile} className="col-span-2 sm:col-span-3" />
        </div>

        {data.purpose && (
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">But</div>
            <p className="mt-1 text-sm text-ink-soft">{data.purpose}</p>
          </div>
        )}

        {data.directors?.length > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              <Users className="h-3.5 w-3.5" /> Direction
            </div>
            <div className="flex flex-wrap gap-2">
              {data.directors.map((d: string) => (
                <span key={d} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-ink-soft">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-ink-muted hover:text-ink hover:underline"
        >
          Voir la source ↗
        </a>
        {saved ? (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600">
            <CheckCircle2 className="h-5 w-5" /> Importé dans votre entreprise
          </span>
        ) : (
          <button className="btn-primary" onClick={onSave} disabled={saving}>
            {saving ? <Spinner className="h-4 w-4 text-white" /> : <BadgeCheck className="h-4 w-4" />}
            Enregistrer dans mon entreprise
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </div>
      <div className={`mt-0.5 text-sm font-medium text-ink ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </div>
    </div>
  );
}
