import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../integrations/email.service';
import {
  IsArray,
  IsEmail,
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
  @IsOptional() @IsString() emailSubject?: string;
  @IsOptional() @IsString() emailTemplateHtml?: string;
}

export class TestEmailDto {
  @IsEmail() to!: string;
}

@Injectable()
export class PlatformSettingsService implements OnModuleInit {
  private readonly logger = new Logger('PlatformSettings');

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // Ensure the singleton settings row exists on boot (replaces the seed step).
  async onModuleInit() {
    try {
      await this.get();
    } catch (e) {
      this.logger.warn(
        `Could not ensure platform settings on boot: ${(e as Error).message}`,
      );
    }
  }

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

  // Send a test email using the saved subject + HTML template via Resend.
  async sendTestEmail(to: string) {
    const settings = await this.get();
    const result = await this.email.send(
      to,
      settings.emailSubject,
      settings.emailTemplateHtml,
    );
    return {
      ok: true,
      mock: result.mock,
      id: result.id,
      message: result.mock
        ? "Mode démo : aucune clé Resend configurée, l'email n'a pas été réellement envoyé (voir les logs serveur)."
        : `Email envoyé à ${to}.`,
    };
  }
}
