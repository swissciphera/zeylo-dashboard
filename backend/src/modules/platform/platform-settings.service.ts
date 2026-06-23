import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsInt() @Min(0) monthlyPriceCents?: number;
  @IsOptional() @IsInt() @Min(0) yearlyPriceCents?: number;
  @IsOptional() @IsInt() @Min(0) trialDays?: number;
  @IsOptional() @IsInt() @Min(0) referralRewardMonths?: number;
  @IsOptional() @IsInt() @Min(0) referralDiscountPercent?: number;
  @IsOptional() @IsArray() referralTiers?: any[];
}

@Injectable()
export class PlatformSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    return this.prisma.platformSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });
  }

  async update(dto: UpdateSettingsDto) {
    return this.prisma.platformSettings.upsert({
      where: { id: 'default' },
      update: { ...dto },
      create: { id: 'default', ...dto },
    });
  }
}
