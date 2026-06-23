import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalCompanies,
      paidCompanies,
      freeCompanies,
      trialCompanies,
      newThisMonth,
      canceledThisMonth,
      activeAtPrevMonthStart,
      settings,
    ] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.count({
        where: { subscriptionStatus: { in: ['ACTIVE', 'PAST_DUE'] } },
      }),
      this.prisma.company.count({ where: { subscriptionStatus: 'FREE' } }),
      this.prisma.company.count({ where: { subscriptionStatus: 'TRIAL' } }),
      this.prisma.company.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.company.count({
        where: {
          subscriptionStatus: 'CANCELED',
          updatedAt: { gte: startOfMonth },
        },
      }),
      this.prisma.company.count({
        where: {
          createdAt: { lt: startOfMonth },
          subscriptionStatus: { in: ['ACTIVE', 'PAST_DUE'] },
        },
      }),
      this.prisma.platformSettings.findUnique({ where: { id: 'default' } }),
    ]);

    const monthlyPrice = (settings?.monthlyPriceCents ?? 4900) / 100;
    const mrr = paidCompanies * monthlyPrice;
    const churnRate =
      activeAtPrevMonthStart > 0
        ? Math.round((canceledThisMonth / activeAtPrevMonthStart) * 1000) / 10
        : 0;

    return {
      totalCompanies,
      paidCompanies,
      freeCompanies,
      trialCompanies,
      newThisMonth,
      mrr,
      currency: settings?.currency ?? 'CHF',
      churnRate,
      // 6-month signup trend for the chart
      signupTrend: await this.signupTrend(),
      _meta: { startOfPrevMonth },
    };
  }

  private async signupTrend() {
    const months: { label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await this.prisma.company.count({
        where: { createdAt: { gte: start, lt: end } },
      });
      months.push({
        label: start.toLocaleDateString('fr-CH', { month: 'short' }),
        count,
      });
    }
    return months;
  }
}
