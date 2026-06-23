import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import { BruteForceService } from './brute-force.service';
import { AuditService } from '../common/audit/audit.service';
import { LoginDto, SetupAdminDto } from './dto/auth.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly bruteForce: BruteForceService,
    private readonly audit: AuditService,
  ) {}

  // ── First-run setup (n8n / Chatwoot style) ──────────────────
  async needsSetup(): Promise<boolean> {
    const count = await this.prisma.platformAdmin.count();
    return count === 0;
  }

  async setupFirstAdmin(dto: SetupAdminDto, ip?: string) {
    // Hard guard: only allowed when no admin exists yet.
    const count = await this.prisma.platformAdmin.count();
    if (count > 0) {
      throw new ForbiddenException('Le setup initial est déjà effectué.');
    }
    const existing = await this.prisma.platformAdmin.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email déjà utilisé.');

    const admin = await this.prisma.platformAdmin.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: await TokenService.hashPassword(dto.password),
        name: dto.name,
        role: 'SUPERADMIN',
      },
    });
    await this.audit.log({
      actorType: 'ADMIN',
      actorId: admin.id,
      adminId: admin.id,
      actorName: admin.name,
      action: 'admin.setup',
      ip,
    });
    return { id: admin.id, email: admin.email };
  }

  // ── Login / refresh / logout ────────────────────────────────
  async login(dto: LoginDto, ip?: string) {
    await this.bruteForce.assertNotLocked('ADMIN', dto.email);
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    const ok =
      admin &&
      admin.isActive &&
      (await TokenService.verifyPassword(admin.passwordHash, dto.password));
    if (!ok) {
      await this.bruteForce.record('ADMIN', dto.email, false, ip);
      throw new UnauthorizedException('Identifiants invalides.');
    }
    await this.bruteForce.record('ADMIN', dto.email, true, ip);
    await this.prisma.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });
    await this.audit.log({
      actorType: 'ADMIN',
      actorId: admin.id,
      adminId: admin.id,
      actorName: admin.name,
      action: 'admin.login',
      ip,
    });

    const pair = await this.tokens.issuePair('ADMIN', {
      actor: 'ADMIN',
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });
    return { ...pair, user: this.publicUser(admin) };
  }

  async refresh(refreshToken: string) {
    const adminId = await this.tokens.verifyAndConsumeRefresh(
      'ADMIN',
      refreshToken,
    );
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
    });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Compte invalide.');
    }
    const pair = await this.tokens.issuePair('ADMIN', {
      actor: 'ADMIN',
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });
    return { ...pair, user: this.publicUser(admin) };
  }

  async logout(adminId: string) {
    await this.tokens.revokeAll('ADMIN', adminId);
    return { ok: true };
  }

  private publicUser(admin: {
    id: string;
    email: string;
    name: string;
    role: string;
  }) {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
  }
}
