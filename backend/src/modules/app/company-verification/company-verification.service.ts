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

  search(query: string) {
    return this.scraper.search(query);
  }

  details(url: string) {
    return this.scraper.details(url);
  }

  // Scrape (fresh) then persist into the caller's company profile.
  async saveToCompany(companyId: string, url: string) {
    const data = await this.scraper.details(url);

    const addr = data.address || {};
    const addressLine = [addr.complement, addr.street, [addr.postal_code, addr.city].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(', ');

    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        name: data.company_name || undefined,
        sector: data.sector || undefined,
        address: addressLine || undefined,
        ideNumber: data.registry_info?.ide || undefined,
        vatNumber: data.registry_info?.tva || undefined,
        registryData: data,
        verifiedAt: new Date(),
      },
    });

    return { company, data };
  }
}
