import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { CompanyScraperService } from './company-scraper.service';

// Monthly job: re-checks the official registry data for companies that opted
// into automatic verification, and updates their profile if it changed.
@Injectable()
export class AutoVerificationService {
  private readonly logger = new Logger('AutoVerification');

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraper: CompanyScraperService,
  ) {}

  // Runs on the 1st of every month at 03:00. Each company is only re-checked
  // if its last auto-verify is older than ~28 days.
  @Cron('0 3 1 * *')
  async run() {
    if (!this.scraper.available) {
      this.logger.warn('Auto-verification skipped: no proxy configured.');
      return;
    }
    const cutoff = new Date(Date.now() - 28 * 86400_000);
    const companies = await this.prisma.company.findMany({
      where: {
        autoVerify: true,
        verificationSourceUrl: { not: null },
        OR: [{ lastAutoVerifyAt: null }, { lastAutoVerifyAt: { lt: cutoff } }],
      },
      select: { id: true, verificationSourceUrl: true },
    });

    this.logger.log(`Auto-verifying ${companies.length} company(ies)…`);
    for (const c of companies) {
      try {
        const data = await this.scraper.details(c.verificationSourceUrl!);
        const addr = data.address || {};
        await this.prisma.company.update({
          where: { id: c.id },
          data: {
            name: data.company_name || undefined,
            sector: data.sector || undefined,
            address: [addr.complement, addr.street].filter(Boolean).join(', ') || undefined,
            postalCode: addr.postal_code || undefined,
            city: addr.city || undefined,
            ideNumber: data.registry_info?.ide || undefined,
            vatNumber: data.registry_info?.tva || undefined,
            registryData: data,
            verifiedAt: new Date(),
            lastAutoVerifyAt: new Date(),
          },
        });
        // Be gentle with the source/proxy.
        await new Promise((r) => setTimeout(r, 1500));
      } catch (e) {
        this.logger.warn(
          `Auto-verify failed for company ${c.id}: ${(e as Error).message}`,
        );
        await this.prisma.company.update({
          where: { id: c.id },
          data: { lastAutoVerifyAt: new Date() },
        });
      }
    }
  }
}
