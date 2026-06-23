import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../../auth/token.service';
import { CompanyScraperService } from '../app/company-verification/company-scraper.service';

export class VerifyAccessDto {
  @IsString() code!: string;
}

export class SubmitRatingDto {
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() comment?: string;
}

export class PublicCompanySearchDto {
  @IsString() @MinLength(2) query!: string;
}

export class PublicCompanyUrlDto {
  @IsString() @MinLength(8) url!: string;
}

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scraper: CompanyScraperService,
  ) {}

  // ── Public company lookup (used during signup) ──────────────
  companyStatus() {
    return { available: this.scraper.available };
  }

  companySearch(query: string) {
    return this.scraper.search(query);
  }

  companyDetails(url: string) {
    return this.scraper.details(url);
  }

  // Authorization for on-demand TLS (Caddy `ask`): only issue certificates
  // for the main host or a VERIFIED custom domain.
  async domainAllowed(host?: string): Promise<boolean> {
    const h = (host || '').toLowerCase().replace(/^www\./, '').trim();
    if (!h) return false;
    const mainTarget = (process.env.PUBLIC_LINK_TARGET || '').toLowerCase();
    const mainApp = (process.env.PUBLIC_APP_URL || '')
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .toLowerCase();
    if (h === mainTarget || h === mainApp) return true;
    const c = await this.prisma.company.findFirst({
      where: { linkDomain: h, linkDomainStatus: 'VERIFIED' },
      select: { id: true },
    });
    return Boolean(c);
  }

  // ── Public company page (served on the connected domain root) ─
  async companyPage(host?: string, id?: string) {
    let company: any = null;
    if (host) {
      company = await this.prisma.company.findFirst({
        where: {
          linkDomain: host.toLowerCase().replace(/^www\./, ''),
          linkDomainStatus: 'VERIFIED',
        },
      });
    } else if (id) {
      company = await this.prisma.company.findUnique({ where: { id } });
    }
    if (!company) throw new NotFoundException('Page introuvable.');

    const rd: any = company.registryData || {};
    return {
      name: company.name,
      sector: company.sector,
      website: company.website,
      email: company.email,
      phone: company.phone,
      address: {
        line: company.address,
        postalCode: company.postalCode,
        city: company.city,
      },
      ideNumber: company.ideNumber,
      vatNumber: company.vatNumber,
      description: rd.purpose || null,
      directors: Array.isArray(rd.directors) ? rd.directors : [],
      verified: Boolean(company.verifiedAt),
    };
  }

  // ── Temporary employee access (link + SMS code) ─────────────
  async accessInfo(token: string) {
    const access = await this.prisma.projectTempAccess.findUnique({
      where: { token },
      include: { project: { include: { company: true } } },
    });
    if (!access) throw new NotFoundException('Lien invalide.');
    if (access.expiresAt < new Date()) {
      throw new BadRequestException('Lien expiré.');
    }
    return {
      requiresCode: true,
      company: access.project.company.name,
      projectTitle: access.project.title,
    };
  }

  async verifyAccess(token: string, dto: VerifyAccessDto) {
    const access = await this.prisma.projectTempAccess.findUnique({
      where: { token },
      include: {
        project: {
          include: {
            company: { select: { name: true } },
            assignments: { include: { employee: true } },
          },
        },
      },
    });
    if (!access) throw new NotFoundException('Lien invalide.');
    if (access.expiresAt < new Date()) {
      throw new BadRequestException('Lien expiré.');
    }
    const ok = await TokenService.verifyPassword(access.smsCodeHash, dto.code);
    if (!ok) throw new BadRequestException('Code invalide.');

    if (!access.usedAt) {
      await this.prisma.projectTempAccess.update({
        where: { id: access.id },
        data: { usedAt: new Date() },
      });
    }

    const p = access.project;
    // Single project screen only — no menu, no other tenant data.
    return {
      company: p.company.name,
      project: {
        title: p.title,
        description: p.description,
        address: p.address,
        status: p.status,
        dueDate: p.dueDate,
        team: p.assignments.map(
          (a) => `${a.employee.firstName} ${a.employee.lastName}`,
        ),
      },
    };
  }

  // ── One-time client rating ──────────────────────────────────
  async ratingInfo(token: string) {
    const rating = await this.prisma.clientRating.findUnique({
      where: { token },
      include: { project: { include: { company: true } } },
    });
    if (!rating) throw new NotFoundException('Lien invalide.');
    if (rating.usedAt) throw new BadRequestException('Cette note a déjà été soumise.');
    if (rating.expiresAt < new Date()) throw new BadRequestException('Lien expiré.');
    return {
      company: rating.project.company.name,
      projectTitle: rating.project.title,
    };
  }

  async submitRating(token: string, dto: SubmitRatingDto) {
    const rating = await this.prisma.clientRating.findUnique({
      where: { token },
    });
    if (!rating) throw new NotFoundException('Lien invalide.');
    if (rating.usedAt) throw new BadRequestException('Cette note a déjà été soumise.');
    if (rating.expiresAt < new Date()) throw new BadRequestException('Lien expiré.');

    await this.prisma.clientRating.update({
      where: { id: rating.id },
      data: { rating: dto.rating, comment: dto.comment, usedAt: new Date() },
    });
    return { ok: true };
  }
}
