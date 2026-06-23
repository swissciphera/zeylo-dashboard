import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { StripeService } from '../../integrations/stripe.service';

const TRIAL_DAYS_DEFAULT = 7;

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly stripe: StripeService,
  ) {}

  private trialDaysLeft(status: string, trialEndsAt: Date | null): number | null {
    if (status !== 'TRIAL' || !trialEndsAt) return null;
    const diff = Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400_000);
    return Math.max(diff, 0);
  }

  async get(companyId: string) {
    const [company, settings] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: companyId } }),
      this.prisma.platformSettings.findUnique({ where: { id: 'default' } }),
    ]);
    if (!company) throw new BadRequestException('Entreprise introuvable.');

    const trialDays = settings?.trialDays ?? TRIAL_DAYS_DEFAULT;
    const status = company.subscriptionStatus;

    return {
      status,
      plan: company.plan,
      trialEndsAt: company.trialEndsAt,
      trialDaysLeft: this.trialDaysLeft(status, company.trialEndsAt),
      trialUsed: Boolean(company.trialUsedAt),
      // A fresh trial is offered only if never used and not currently active/trialing.
      canStartTrial:
        !company.trialUsedAt && status !== 'TRIAL' && status !== 'ACTIVE',
      pricing: {
        currency: settings?.currency ?? 'CHF',
        monthlyPriceCents: settings?.monthlyPriceCents ?? 4900,
        yearlyPriceCents: settings?.yearlyPriceCents ?? 49000,
        trialDays,
      },
      stripeConfigured: this.stripe.configured,
    };
  }

  async selectFree(companyId: string) {
    await this.prisma.company.update({
      where: { id: companyId },
      data: { subscriptionStatus: 'FREE', plan: 'free', trialEndsAt: null },
    });
    await this.log(companyId, 'subscription.free');
    return this.get(companyId);
  }

  async startTrial(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new BadRequestException('Entreprise introuvable.');
    if (company.subscriptionStatus === 'TRIAL') {
      throw new BadRequestException('Un essai est déjà en cours.');
    }
    if (company.subscriptionStatus === 'ACTIVE') {
      throw new BadRequestException('Vous êtes déjà abonné.');
    }
    if (company.trialUsedAt) {
      throw new BadRequestException('Votre essai gratuit a déjà été utilisé.');
    }
    const settings = await this.prisma.platformSettings.findUnique({
      where: { id: 'default' },
    });
    const trialDays = settings?.trialDays ?? TRIAL_DAYS_DEFAULT;
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        subscriptionStatus: 'TRIAL',
        plan: 'pro',
        trialEndsAt: new Date(Date.now() + trialDays * 86400_000),
        trialUsedAt: new Date(),
      },
    });
    await this.log(companyId, 'subscription.trial_started');
    return this.get(companyId);
  }

  // Upgrade to Pro. Stripe is stubbed: when no real checkout is wired we
  // activate the plan and record a (paid) payment for realism.
  // TODO: replace with a real Stripe Checkout session when keys are live.
  async upgrade(companyId: string) {
    const settings = await this.prisma.platformSettings.findUnique({
      where: { id: 'default' },
    });
    const amount = settings?.monthlyPriceCents ?? 4900;
    const currency = settings?.currency ?? 'CHF';

    await this.prisma.$transaction([
      this.prisma.company.update({
        where: { id: companyId },
        data: {
          subscriptionStatus: 'ACTIVE',
          plan: 'pro',
          trialEndsAt: null,
        },
      }),
      this.prisma.subscription.create({
        data: {
          companyId,
          plan: 'pro',
          status: 'ACTIVE',
          renewsAt: new Date(Date.now() + 30 * 86400_000),
        },
      }),
      this.prisma.payment.create({
        data: {
          companyId,
          amountCents: amount,
          currency,
          status: 'PAID',
          paidAt: new Date(),
        },
      }),
    ]);
    await this.log(companyId, 'subscription.upgraded');
    return this.get(companyId);
  }

  async cancel(companyId: string) {
    await this.prisma.company.update({
      where: { id: companyId },
      data: { subscriptionStatus: 'CANCELED' },
    });
    await this.prisma.subscription.updateMany({
      where: { companyId, status: 'ACTIVE' },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });
    await this.log(companyId, 'subscription.canceled');
    return this.get(companyId);
  }

  private log(companyId: string, action: string) {
    return this.audit.log({ actorType: 'CLIENT', companyId, action });
  }
}
