import { Injectable } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { PrismaService } from '../../../prisma/prisma.service';
import { CompanyScraperService } from './company-scraper.service';

export class SearchCompanyDto {
  @IsString() @MinLength(2) query!: string;
}

export class CompanyUrlDto {
  @IsString() @MinLength(8) url!: string;
}

@Injectable()
export class CompanyVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scraper: CompanyScraperService,
  ) {}

  // Tells the frontend whether automatic search is available (proxy present).
  status() {
    return { available: this.scraper.available };
  }

  search(query: string) {
    return this.scraper.search(query);
  }

  details(url: string) {
    return this.scraper.details(url);
  }

  // Verify the caller's OWN company: scrape fresh + persist to its profile.
  // Stores the Moneyhouse source URL so the monthly job can re-check it.
  async verifyOwnCompany(companyId: string, url: string) {
    const data = await this.scraper.details(url);
    const addr = data.address || {};
    const addressLine = [addr.complement, addr.street]
      .filter(Boolean)
      .join(', ');

    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        name: data.company_name || undefined,
        sector: data.sector || undefined,
        address: addressLine || undefined,
        postalCode: addr.postal_code || undefined,
        city: addr.city || undefined,
        ideNumber: data.registry_info?.ide || undefined,
        vatNumber: data.registry_info?.tva || undefined,
        registryData: data,
        verificationSourceUrl: url,
        verifiedAt: new Date(),
      },
    });
    return { company, data };
  }

  // Save a verified company as an ENTERPRISE contact of the caller's company.
  async saveToContact(companyId: string, url: string) {
    const data = await this.scraper.details(url);
    const addr = data.address || {};
    const ri = data.registry_info || {};
    const contact = await this.prisma.contact.create({
      data: {
        companyId,
        type: 'PROSPECT',
        kind: 'ENTERPRISE',
        source: 'MANUAL',
        name: data.company_name || 'Entreprise',
        companyName: data.company_name || null,
        street: addr.street || null,
        streetNumber: addr.streetNumber || null,
        postalCode: addr.postal_code || null,
        city: addr.city || null,
        canton: addr.canton || null,
        country: addr.country || null,
        ideNumber: ri.ide || null,
        vatNumber: ri.tva || null,
        registryData: data,
      },
    });
    return { contact };
  }
}
