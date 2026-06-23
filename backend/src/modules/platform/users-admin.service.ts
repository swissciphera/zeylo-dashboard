import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../../auth/token.service';
import { AuditService } from '../../common/audit/audit.service';
import { ClientMetaInfo } from '../../common/decorators/client-meta.decorator';
import { generateReferralCode } from '../../common/utils';

export class CreateUserDto {
  @IsString() @MinLength(1) firstName!: string;
  @IsString() @MinLength(1) lastName!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(10) password!: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  // Either attach to an existing company...
  @IsOptional() @IsString() companyId?: string;
  // ...or create a new company with this name.
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() sector?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Injectable()
export class UsersAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  async list(search?: string) {
    const users = await this.prisma.user.findMany({
      where: search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      include: { company: { select: { id: true, name: true } } },
    });
    return users.map((u) => this.toPublic(u));
  }

  async create(dto: CreateUserDto, adminId: string, meta: ClientMetaInfo = {}) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email déjà utilisé.');

    let companyId = dto.companyId;
    if (companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true },
      });
      if (!company) throw new NotFoundException('Entreprise introuvable.');
    } else {
      const settings = await this.prisma.platformSettings.findUnique({
        where: { id: 'default' },
      });
      const trialDays = settings?.trialDays ?? 14;
      const company = await this.prisma.company.create({
        data: {
          name:
            dto.companyName?.trim() ||
            `${dto.firstName} ${dto.lastName}`.trim(),
          sector: dto.sector,
          subscriptionStatus: 'TRIAL',
          trialEndsAt: new Date(Date.now() + trialDays * 86400_000),
          referralCode: await this.uniqueReferralCode(),
        },
      });
      companyId = company.id;
    }

    const user = await this.prisma.user.create({
      data: {
        companyId,
        email,
        passwordHash: await TokenService.hashPassword(dto.password),
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role ?? 'OWNER',
      },
      include: { company: { select: { id: true, name: true } } },
    });

    await this.audit.log({
      actorType: 'ADMIN',
      actorId: adminId,
      adminId,
      companyId,
      action: 'user.create',
      ip: meta.ip,
      city: meta.city,
      country: meta.country,
    });
    return this.toPublic(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    adminId: string,
    meta: ClientMetaInfo = {},
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const taken = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (taken) throw new ConflictException('Email déjà utilisé.');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email ? dto.email.toLowerCase() : undefined,
        role: dto.role,
        isActive: dto.isActive,
      },
      include: { company: { select: { id: true, name: true } } },
    });
    await this.audit.log({
      actorType: 'ADMIN',
      actorId: adminId,
      adminId,
      companyId: user.companyId,
      action: 'user.update',
      ip: meta.ip,
      city: meta.city,
      country: meta.country,
    });
    return this.toPublic(updated);
  }

  // Block/unblock: toggles isActive and revokes refresh tokens when blocking.
  async setBlocked(
    id: string,
    blocked: boolean,
    adminId: string,
    meta: ClientMetaInfo = {},
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !blocked },
      include: { company: { select: { id: true, name: true } } },
    });
    if (blocked) await this.tokens.revokeAll('CLIENT', id);

    await this.audit.log({
      actorType: 'ADMIN',
      actorId: adminId,
      adminId,
      companyId: user.companyId,
      action: blocked ? 'user.block' : 'user.unblock',
      ip: meta.ip,
      city: meta.city,
      country: meta.country,
    });
    return this.toPublic(updated);
  }

  async remove(id: string, adminId: string, meta: ClientMetaInfo = {}) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    await this.tokens.revokeAll('CLIENT', id);
    await this.prisma.user.delete({ where: { id } });
    await this.audit.log({
      actorType: 'ADMIN',
      actorId: adminId,
      adminId,
      companyId: user.companyId,
      action: 'user.delete',
      ip: meta.ip,
      city: meta.city,
      country: meta.country,
    });
    return { ok: true };
  }

  // Lightweight company list for the "attach to existing company" selector.
  async companyOptions() {
    const companies = await this.prisma.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return companies;
  }

  private toPublic(u: any) {
    return {
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      company: u.company?.name ?? null,
      companyId: u.companyId,
    };
  }

  private async uniqueReferralCode(): Promise<string> {
    for (let i = 0; i < 6; i++) {
      const code = generateReferralCode();
      const exists = await this.prisma.company.findUnique({
        where: { referralCode: code },
      });
      if (!exists) return code;
    }
    return generateReferralCode();
  }
}
