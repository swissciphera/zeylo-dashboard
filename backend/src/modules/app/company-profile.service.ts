import { Injectable } from '@nestjs/common';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

export class UpdateCompanyDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() sector?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() logoFileId?: string;
  @IsOptional() @IsString() ideNumber?: string;
  @IsOptional() @IsString() vatNumber?: string;
}

@Injectable()
export class CompanyProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    return company;
  }

  async update(companyId: string, dto: UpdateCompanyDto) {
    return this.prisma.company.update({
      where: { id: companyId },
      data: { ...dto },
    });
  }

  // Client-side referral program view: code + filleuls + tiers reached.
  async referralProgram(companyId: string) {
    const [company, referrals, settings] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: companyId } }),
      this.prisma.referral.findMany({
        where: { referrerId: companyId },
        include: {
          referred: { select: { name: true, subscriptionStatus: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.platformSettings.findUnique({ where: { id: 'default' } }),
    ]);

    const converted = referrals.filter((r) => r.convertedToPaid).length;
    return {
      referralCode: company?.referralCode,
      total: referrals.length,
      converted,
      tiers: settings?.referralTiers ?? [],
      filleuls: referrals.map((r) => ({
        id: r.id,
        name: r.referred.name,
        status: r.referred.subscriptionStatus,
        convertedToPaid: r.convertedToPaid,
        rewardMonths: r.rewardMonths,
        createdAt: r.createdAt,
      })),
    };
  }
}
