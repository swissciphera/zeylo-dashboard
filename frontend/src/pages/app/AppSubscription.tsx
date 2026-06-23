import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Sparkles, Rocket, Gift, Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState, Spinner } from '@/components/ui/LoadingState';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { clientApi, apiErrorMessage } from '@/lib/api';
import { formatMoney, formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

const STANDARD_FEATURES = [
  '1 utilisateur',
  "Jusqu'à 5 employés",
  '3 chantiers actifs',
  'Catalogue de services',
  'Support communautaire',
];

const PRO_FEATURES = [
  'Utilisateurs illimités',
  'Employés illimités',
  'Chantiers illimités',
  "Vérification d'entreprise (registre)",
  'Notation client & accès temporaires',
  'Fichiers & contrats illimités',
  'Support prioritaire',
];

export function AppSubscription() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => (await clientApi.get('/app/subscription')).data,
  });

  async function act(path: string) {
    setBusy(path);
    setError(null);
    try {
      await clientApi.post(`/app/subscription/${path}`);
      qc.invalidateQueries({ queryKey: ['subscription'] });
      qc.invalidateQueries({ queryKey: ['app-dashboard'] });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(null);
      setConfirmCancel(false);
    }
  }

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="Abonnement" />
        <LoadingState />
      </>
    );
  }

  const { status, pricing, canStartTrial } = data;
  const isFree = status === 'FREE';
  const isTrial = status === 'TRIAL';
  const isActive = status === 'ACTIVE';
  const price = formatMoney(pricing.monthlyPriceCents, pricing.currency);

  return (
    <>
      <PageHeader
        title="Abonnement"
        subtitle="Choisissez la formule adaptée à votre entreprise"
      />

      {/* Current status banner */}
      <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl',
              isActive
                ? 'bg-brand-50 text-brand-600'
                : isTrial
                  ? 'bg-violet-50 text-violet-600'
                  : 'bg-surface-muted text-ink-muted',
            )}
          >
            {isActive ? <Rocket className="h-5 w-5" /> : isTrial ? <Clock className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">
                {isActive ? 'Zeylo Pro' : isTrial ? 'Essai Pro' : 'Zeylo Standard'}
              </span>
              <Badge tone={isActive ? 'green' : isTrial ? 'violet' : 'gray'}>
                {isActive ? 'Actif' : isTrial ? 'Essai' : isFree ? 'Standard' : status}
              </Badge>
            </div>
            <p className="text-sm text-ink-muted">
              {isTrial && data.trialDaysLeft != null
                ? `Il vous reste ${data.trialDaysLeft} jour(s) d'essai · fin le ${formatDate(data.trialEndsAt)}`
                : isActive
                  ? 'Renouvellement mensuel automatique'
                  : 'Formule de base gratuite'}
            </p>
          </div>
        </div>
        {(isActive || isTrial) && (
          <button
            className="btn-ghost text-red-600 hover:bg-red-50"
            onClick={() => setConfirmCancel(true)}
          >
            Résilier
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {/* Plans — 2 cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:max-w-4xl">
        {/* Standard */}
        <PlanCard
          title="Standard"
          icon={Gift}
          price="0"
          currency={pricing.currency}
          period="gratuit, pour toujours"
          features={STANDARD_FEATURES}
          current={isFree}
          cta={
            isFree ? (
              <button className="btn-secondary w-full" disabled>
                Plan actuel
              </button>
            ) : (
              <button
                className="btn-secondary w-full"
                disabled={busy !== null}
                onClick={() => act('free')}
              >
                {busy === 'free' && <Spinner className="h-4 w-4" />}
                Passer au Standard
              </button>
            )
          }
        />

        {/* Pro */}
        <PlanCard
          title="Pro"
          icon={Rocket}
          highlight
          price={(pricing.monthlyPriceCents / 100).toFixed(2)}
          currency={pricing.currency}
          period="par mois"
          // Trial offer only shown when eligible (never used)
          note={
            canStartTrial
              ? `✨ ${pricing.trialDays} jours d'essai gratuit inclus`
              : isTrial && data.trialDaysLeft != null
                ? `Essai en cours · ${data.trialDaysLeft} jour(s) restants`
                : undefined
          }
          features={PRO_FEATURES}
          current={isActive}
          cta={
            isActive ? (
              <button className="btn w-full bg-white/20 text-white" disabled>
                Plan actuel
              </button>
            ) : canStartTrial ? (
              <button
                className="btn w-full bg-white text-brand-700 hover:bg-brand-50"
                disabled={busy !== null}
                onClick={() => act('trial')}
              >
                {busy === 'trial' && <Spinner className="h-4 w-4 text-brand-700" />}
                Démarrer l'essai gratuit
              </button>
            ) : (
              <button
                className="btn w-full bg-white text-brand-700 hover:bg-brand-50"
                disabled={busy !== null}
                onClick={() => act('upgrade')}
              >
                {busy === 'upgrade' && <Spinner className="h-4 w-4 text-brand-700" />}
                {isTrial ? 'Passer à Pro maintenant' : 'Passer à Pro'}
              </button>
            )
          }
        />
      </div>

      {!data.stripeConfigured && (
        <p className="mt-6 text-xs text-ink-faint">
          Paiement en mode démo — l'intégration Stripe sera activée prochainement.
        </p>
      )}

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => act('cancel')}
        loading={busy === 'cancel'}
        title="Résilier l'abonnement"
        message="Votre entreprise repassera en formule Standard (gratuite). Vous pourrez vous réabonner à tout moment."
        confirmLabel="Résilier"
        danger
      />
    </>
  );
}

function PlanCard({
  title,
  icon: Icon,
  price,
  currency,
  period,
  features,
  cta,
  note,
  highlight,
  current,
}: {
  title: string;
  icon: any;
  price: string;
  currency: string;
  period: string;
  features: string[];
  cta: React.ReactNode;
  note?: string;
  highlight?: boolean;
  current?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border p-6 shadow-card',
        highlight
          ? 'border-transparent bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-elevated'
          : 'border-line bg-white',
        current && !highlight && 'ring-2 ring-brand-200',
      )}
    >
      {highlight && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
          <Sparkles className="h-3 w-3" /> Recommandé
        </span>
      )}

      <div
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-xl',
          highlight ? 'bg-white/15 text-white' : 'bg-brand-50 text-brand-600',
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      <h3 className={cn('mt-4 text-lg font-bold', highlight ? 'text-white' : 'text-ink')}>
        {title}
      </h3>

      <div className="mt-2 flex items-end gap-1">
        <span className={cn('text-3xl font-bold tracking-tight', highlight ? 'text-white' : 'text-ink')}>
          {price} {currency}
        </span>
      </div>
      <p className={cn('text-sm', highlight ? 'text-white/70' : 'text-ink-muted')}>{period}</p>

      {note && (
        <div
          className={cn(
            'mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold',
            highlight ? 'bg-white/15 text-white' : 'bg-brand-50 text-brand-700',
          )}
        >
          {note}
        </div>
      )}

      <ul className="mt-5 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0',
                highlight ? 'text-white' : 'text-emerald-500',
              )}
            />
            <span className={highlight ? 'text-white/90' : 'text-ink-soft'}>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">{cta}</div>
    </div>
  );
}
