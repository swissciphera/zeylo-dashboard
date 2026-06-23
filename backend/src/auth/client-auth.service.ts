import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import { BruteForceService } from './brute-force.service';
import { AuditService } from '../common/audit/audit.service';
import { LoginDto, RegisterClientDto } from './dto/auth.dto';
import { generateReferralCode } from '../common/utils';

@Injectable()
export class ClientAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly bruteForce: BruteForceService,
    private readonly audit: AuditService,
  ) {}

  // Self-service signup: creates a tenant Company + its OWNER user.
  async register(dto: RegisterClientDto, ip?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email déjà utilisé.');

    let referredBy: { id: string } | null = null;
    if (dto.referralCode) {
      referredBy = await this.prisma.company.findUnique({
        where: { referralCode: dto.referralCode.trim().toUpperCase() },
      });
      if (!referredBy) {
        throw new BadRequestException('Code de parrainage invalide.');
      }
    }

    const settings = await this.prisma.platformSettings.findUnique({
      where: { id: 'default' },
    });
    const trialDays = settings?.trialDays ?? 14;

    const result = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.companyName,
          sector: dto.sector,
          subscriptionStatus: 'TRIAL',
          trialEndsAt: new Date(Date.now() + trialDays * 86400_000),
          referralCode: await this.uniqueReferralCode(tx),
          referredById: referredBy?.id,
        },
      });
      const user = await tx.user.create({
        data: {
          companyId: company.id,
          email: dto.email.toLowerCase(),
          passwordHash: await TokenService.hashPassword(dto.password),
          name: dto.name,
          role: 'OWNER',
        },
      });
      if (referredBy) {
        await tx.referral.create({
          data: { referrerId: referredBy.id, referredId: company.id },
        });
      }
      return { company, user };
    });

    await this.audit.log({
      actorType: 'CLIENT',
      actorId: result.user.id,
      companyId: result.company.id,
      actorName: result.user.name,
      action: 'client.register',
      ip,
    });

    return this.issueFor(result.user);
  }

  async login(dto: LoginDto, ip?: string) {
    await this.bruteForce.assertNotLocked('CLIENT', dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    const ok =
      user &&
      user.isActive &&
      (await TokenService.verifyPassword(user.passwordHash, dto.password));
    if (!ok) {
      await this.bruteForce.record('CLIENT', dto.email, false, ip);
      throw new UnauthorizedException('Identifiants invalides.');
    }
    await this.bruteForce.record('CLIENT', dto.email, true, ip);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.audit.log({
      actorType: 'CLIENT',
      actorId: user.id,
      companyId: user.companyId,
      actorName: user.name,
      action: 'client.login',
      ip,
    });
    return this.issueFor(user);
  }

  async refresh(refreshToken: string) {
    const userId = await this.tokens.verifyAndConsumeRefresh(
      'CLIENT',
      refreshToken,
    );
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Compte invalide.');
    }
    return this.issueFor(user);
  }

  async logout(userId: string) {
    await this.tokens.revokeAll('CLIENT', userId);
    return { ok: true };
  }

  private async issueFor(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
  }) {
    const pair = await this.tokens.issuePair('CLIENT', {
      actor: 'CLIENT',
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
    });
    return {
      ...pair,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }

  private async uniqueReferralCode(tx: any): Promise<string> {
    for (let i = 0; i < 6; i++) {
      const code = generateReferralCode();
      const exists = await tx.company.findUnique({
        where: { referralCode: code },
      });
      if (!exists) return code;
    }
    return generateReferralCode();
  }
}
