import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import {
  Globe,
  Mail,
  Phone,
  MapPin,
  BadgeCheck,
  Users,
  Building2,
} from 'lucide-react';
import { publicApi } from '@/lib/api';
import { Spinner } from '@/components/ui/LoadingState';
import { initials } from '@/lib/format';

interface CompanyPage {
  name: string;
  sector?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: { line?: string | null; postalCode?: string | null; city?: string | null };
  ideNumber?: string | null;
  vatNumber?: string | null;
  description?: string | null;
  directors?: string[];
  verified?: boolean;
}

// Served at the root of a company's connected domain (ledomaine.com/).
export function RootGate() {
  const [state, setState] = useState<'loading' | 'company' | 'redirect'>('loading');
  const [data, setData] = useState<CompanyPage | null>(null);

  useEffect(() => {
    publicApi
      .get('/public/company-page', { params: { host: window.location.hostname } })
      .then((r) => {
        setData(r.data);
        setState('company');
      })
      .catch(() => setState('redirect'));
  }, []);

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-subtle">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }
  if (state === 'redirect') return <Navigate to="/app" replace />;
  return <CompanyPublicView data={data!} />;
}

// Accessible by id for preview / sharing on the main domain (/page/:id).
export function CompanyPublicPage() {
  const { id } = useParams();
  const [data, setData] = useState<CompanyPage | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    publicApi
      .get('/public/company-page', { params: { id } })
      .then((r) => setData(r.data))
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-6 text-center">
        <p className="text-ink-muted">Page introuvable.</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-subtle">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }
  return <CompanyPublicView data={data} />;
}

function CompanyPublicView({ data }: { data: CompanyPage }) {
  const addr = [data.address?.line, [data.address?.postalCode, data.address?.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  const website = data.website
    ? data.website.startsWith('http')
      ? data.website
      : `https://${data.website}`
    : null;

  return (
    <div className="min-h-screen bg-surface-subtle">
      {/* Hero */}
      <div className="relative overflow-hidden bg-ink text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(1200px 500px at 10% -20%, rgba(37,99,235,0.5), transparent), radial-gradient(900px 600px at 110% 120%, rgba(30,58,138,0.55), transparent)',
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-2xl font-bold ring-1 ring-white/20 backdrop-blur">
            {initials(data.name)}
          </div>
          <h1 className="mt-6 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            {data.name}
          </h1>
          {data.sector && (
            <p className="mt-3 text-lg text-white/70">{data.sector}</p>
          )}
          {data.verified && (
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-brand-200 ring-1 ring-white/20">
              <BadgeCheck className="h-4 w-4" /> Entreprise vérifiée au registre
            </span>
          )}
          {website && (
            <div className="mt-8">
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-brand-50"
              >
                <Globe className="h-4 w-4" /> Visiter le site web
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-3xl px-6 py-12">
        {data.description && (
          <section className="card p-7">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">
              À propos
            </h2>
            <p className="mt-3 leading-relaxed text-ink-soft">{data.description}</p>
          </section>
        )}

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {/* Contact */}
          <section className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-faint">
              Coordonnées
            </h2>
            <ul className="space-y-3 text-sm text-ink-soft">
              {addr && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 text-ink-faint" /> {addr}
                </li>
              )}
              {data.email && (
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-ink-faint" />
                  <a href={`mailto:${data.email}`} className="hover:text-brand-700">{data.email}</a>
                </li>
              )}
              {data.phone && (
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-ink-faint" />
                  <a href={`tel:${data.phone}`} className="hover:text-brand-700">{data.phone}</a>
                </li>
              )}
              {!addr && !data.email && !data.phone && (
                <li className="text-ink-faint">Non renseigné.</li>
              )}
            </ul>
          </section>

          {/* Registry */}
          <section className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-faint">
              Registre
            </h2>
            <ul className="space-y-3 text-sm text-ink-soft">
              {data.ideNumber && (
                <li className="flex items-center gap-2.5">
                  <Building2 className="h-4 w-4 text-ink-faint" />
                  <span className="font-mono">{data.ideNumber}</span>
                </li>
              )}
              {data.vatNumber && (
                <li className="flex items-center gap-2.5">
                  <BadgeCheck className="h-4 w-4 text-ink-faint" />
                  <span className="font-mono">{data.vatNumber}</span>
                </li>
              )}
              {data.directors && data.directors.length > 0 && (
                <li className="flex items-start gap-2.5">
                  <Users className="mt-0.5 h-4 w-4 text-ink-faint" />
                  <span>{data.directors.join(', ')}</span>
                </li>
              )}
              {!data.ideNumber && !data.vatNumber && (!data.directors || !data.directors.length) && (
                <li className="text-ink-faint">Non renseigné.</li>
              )}
            </ul>
          </section>
        </div>

        <p className="mt-10 text-center text-xs text-ink-faint">
          Propulsé par <span className="font-semibold text-ink-muted">Zeylo</span>
        </p>
      </div>
    </div>
  );
}
