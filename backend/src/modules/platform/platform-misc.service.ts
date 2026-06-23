import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Groups the lighter platform read-models: audit log, billing, referrals, health.
@Injectable()
export class PlatformMiscService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Audit log ───────────────────────────────────────────────
  async auditLog(companyId?: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { company: { select: { name: true } } },
    });
    return logs.map((l) => ({
      id: l.id,
      actorType: l.actorType,
      actorName: l.actorName,
      action: l.action,
      reason: l.reason,
      company: l.company?.name ?? null,
      companyId: l.companyId,
      ip: l.ip,
      createdAt: l.createdAt,
    }));
  }

  // ── Billing & subscriptions ─────────────────────────────────
  async billing() {
    const [payments, trials, renewals, failed] = await Promise.all([
      this.prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { company: { select: { name: true } } },
      }),
      this.prisma.company.findMany({
        where: { subscriptionStatus: 'TRIAL' },
        select: { id: true, name: true, trialEndsAt: true },
        orderBy: { trialEndsAt: 'asc' },
      }),
      this.prisma.subscription.findMany({
        where: { renewsAt: { not: null } },
        orderBy: { renewsAt: 'asc' },
        take: 50,
        include: { company: { select: { name: true } } },
      }),
      this.prisma.payment.findMany({
        where: { status: 'FAILED' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { company: { select: { name: true } } },
      }),
    ]);
    return {
      payments: payments.map((p) => ({
        id: p.id,
        company: p.company.name,
        amountCents: p.amountCents,
        currency: p.currency,
        status: p.status,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        failureReason: p.failureReason,
      })),
      trials,
      renewals: renewals.map((s) => ({
        id: s.id,
        company: s.company.name,
        plan: s.plan,
        renewsAt: s.renewsAt,
        status: s.status,
      })),
      failed: failed.map((p) => ({
        id: p.id,
        company: p.company.name,
        amountCents: p.amountCents,
        currency: p.currency,
        failureReason: p.failureReason,
        createdAt: p.createdAt,
      })),
    };
  }

  // ── Referral program (platform view) ────────────────────────
  async referrals() {
    const referrals = await this.prisma.referral.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        referrer: { select: { name: true } },
        referred: { select: { name: true, subscriptionStatus: true } },
      },
    });
    return referrals.map((r) => ({
      id: r.id,
      referrer: r.referrer.name,
      referred: r.referred.name,
      referredStatus: r.referred.subscriptionStatus,
      tier: r.tier,
      rewardMonths: r.rewardMonths,
      discountPercent: r.discountPercent,
      convertedToPaid: r.convertedToPaid,
      createdAt: r.createdAt,
    }));
  }
}
