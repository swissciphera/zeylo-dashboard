import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MapPin, ArrowRight, ShieldAlert, ShieldCheck, Server } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { adminApi, apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

interface GeoResult {
  ip: string;
  private?: boolean;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  zip?: string | null;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string | null;
  asn?: string | null;
  asName?: string | null;
  hostname?: string | null;
  proxy?: boolean;
  vpn?: boolean;
  tor?: boolean;
  hosting?: boolean;
  mobile?: boolean;
  type?: string;
  proxyProvider?: string | null;
  risk?: number | null;
}

function flagEmoji(cc?: string) {
  if (!cc || cc.length !== 2) return '';
  return String.fromCodePoint(
    ...cc.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0)),
  );
}

export function AdminIpLookup() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('ip') ?? '');
  const [result, setResult] = useState<GeoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(async (ip: string) => {
    const target = ip.trim();
    if (!target) return;
    setLoading(true);
    setError(null);
    setResult(null);
    // Small delay so the "locating" animation is always perceptible.
    const started = Date.now();
    try {
      const res = await adminApi.get('/admin/ip-lookup', { params: { ip: target } });
      const elapsed = Date.now() - started;
      if (elapsed < 900) await new Promise((r) => setTimeout(r, 900 - elapsed));
      setResult(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-locate when arriving with ?ip= (e.g. from the audit log).
  useEffect(() => {
    const ip = params.get('ip');
    if (ip) locate(ip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setParams(query ? { ip: query } : {}, { replace: true });
    locate(query);
  }

  const mapSrc =
    result?.lat != null && result?.lon != null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${result.lon - 0.06},${result.lat - 0.035},${result.lon + 0.06},${result.lat + 0.035}&layer=mapnik&marker=${result.lat},${result.lon}`
      : null;

  return (
    <>
      <PageHeader
        title="Localiser une adresse IP"
        subtitle="Géolocalisation, fournisseur et détection VPN / Proxy"
      />

      {/* Search */}
      <form onSubmit={submit} className="mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
            <input
              className="input !rounded-2xl !py-3.5 pl-12 text-base"
              placeholder="Entrez une adresse IP (ex. 185.255.128.36)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="btn-primary !rounded-2xl !px-5" disabled={loading || !query}>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </form>

      {/* Loading radar */}
      {loading && (
        <div className="card flex flex-col items-center justify-center py-20">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <span className="absolute h-20 w-20 rounded-full bg-brand-400/20 animate-ping" />
            <span
              className="absolute h-32 w-32 rounded-full bg-brand-400/10 animate-ping"
              style={{ animationDelay: '0.4s' }}
            />
            <span className="absolute h-40 w-40 rounded-full border border-brand-200" />
            <span className="absolute h-28 w-28 rounded-full border border-brand-100" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-elevated">
              <MapPin className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-6 text-sm font-medium text-ink-soft">Localisation en cours…</p>
          <p className="mt-1 font-mono text-xs text-ink-faint">{query}</p>
        </div>
      )}

      {error && !loading && (
        <div className="card p-6 text-center text-sm text-red-600">{error}</div>
      )}

      {/* Private IP */}
      {result?.private && !loading && (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <Server className="h-10 w-10 text-ink-faint" />
          <h3 className="text-lg font-semibold text-ink">Réseau interne</h3>
          <p className="max-w-sm text-sm text-ink-muted">
            <span className="font-mono">{result.ip}</span> est une adresse privée
            (réseau local / Docker) : elle ne peut pas être géolocalisée.
          </p>
        </div>
      )}

      {/* Result */}
      {result && !result.private && !loading && (
        <div className="space-y-6">
          {/* Map */}
          {mapSrc && (
            <div className="card overflow-hidden">
              <div className="relative">
                <iframe
                  title="Carte"
                  src={mapSrc}
                  className="h-72 w-full"
                  loading="lazy"
                />
                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
                  <MapPin className="h-9 w-9 fill-brand-500 text-brand-600 drop-shadow-lg" />
                </div>
              </div>
            </div>
          )}

          {/* Big IP + VPN flag */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2">
              <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink-faint">
                IPv4
              </span>
              <div className="mt-3 font-mono text-3xl font-bold tracking-tight text-ink">
                {result.ip}
              </div>
            </div>
            <div
              className={cn(
                'card flex items-center gap-3 p-5',
                result.proxy && 'ring-2 ring-red-200',
              )}
            >
              {result.proxy ? (
                <ShieldAlert className="h-9 w-9 shrink-0 text-red-500" />
              ) : (
                <ShieldCheck className="h-9 w-9 shrink-0 text-emerald-500" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">
                  {result.tor
                    ? 'Réseau Tor détecté'
                    : result.vpn
                      ? 'VPN détecté'
                      : result.proxy
                        ? 'Proxy détecté'
                        : 'Aucun proxy détecté'}
                </div>
                <div className="truncate text-xs text-ink-muted">
                  {result.proxyProvider
                    ? `${result.type} · ${result.proxyProvider}`
                    : result.type}
                </div>
              </div>
            </div>
          </div>

          {/* Risk meter */}
          {result.risk != null && (
            <div className="card p-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-ink">Score de risque</span>
                <span
                  className={cn(
                    'font-bold',
                    result.risk >= 67
                      ? 'text-red-600'
                      : result.risk >= 34
                        ? 'text-amber-600'
                        : 'text-emerald-600',
                  )}
                >
                  {result.risk}/100
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    result.risk >= 67
                      ? 'bg-red-500'
                      : result.risk >= 34
                        ? 'bg-amber-500'
                        : 'bg-emerald-500',
                  )}
                  style={{ width: `${Math.max(result.risk, 3)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-ink-faint">
                {result.risk >= 67
                  ? 'Risque élevé — IP fréquemment associée à des abus.'
                  : result.risk >= 34
                    ? 'Risque modéré.'
                    : 'Risque faible.'}
              </p>
            </div>
          )}

          {/* Details grid */}
          <div className="card grid grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-3">
            <Tile label="Pays" value={`${flagEmoji(result.countryCode)} ${result.country ?? '—'}`} />
            <Tile label="Région" value={result.region} />
            <Tile label="Ville" value={result.city} />
            <Tile label="Fournisseur réseau" value={result.isp} />
            <Tile label="ASN" value={result.asn} />
            <Tile label="Type" value={result.type} highlight={result.proxy} />
            <Tile
              label="Fournisseur VPN / Proxy"
              value={result.proxyProvider}
              highlight={!!result.proxyProvider}
            />
            <Tile label="Hostname" value={result.hostname} mono />
            <Tile label="Fuseau horaire" value={result.timezone} />
            <Tile
              label="VPN / Proxy"
              value={result.proxy ? 'Oui' : 'Non'}
              badge={result.proxy ? 'red' : 'green'}
            />
            <Tile label="Tor" value={result.tor ? 'Oui' : 'Non'} badge={result.tor ? 'red' : 'green'} />
            <Tile label="Mobile" value={result.mobile ? 'Oui' : 'Non'} />
          </div>
        </div>
      )}

      {/* Empty initial state */}
      {!result && !loading && !error && (
        <div className="card flex flex-col items-center gap-3 p-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <MapPin className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-ink">Localisez une adresse IP</h3>
          <p className="max-w-sm text-sm text-ink-muted">
            Saisissez une adresse IP ci-dessus, ou cliquez sur une IP dans le
            journal d'audit pour la localiser automatiquement.
          </p>
        </div>
      )}
    </>
  );
}

function Tile({
  label,
  value,
  mono,
  highlight,
  badge,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  highlight?: boolean;
  badge?: 'red' | 'green';
}) {
  return (
    <div className="bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </div>
      <div className="mt-1.5">
        {badge ? (
          <Badge tone={badge} dot>
            {value}
          </Badge>
        ) : (
          <span
            className={cn(
              'text-sm font-medium text-ink',
              mono && 'font-mono text-xs',
              highlight && 'text-red-600',
            )}
          >
            {value || '—'}
          </span>
        )}
      </div>
    </div>
  );
}
