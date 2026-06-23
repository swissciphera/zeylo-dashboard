import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../../auth/token.service';

export class VerifyAccessDto {
  @IsString() code!: string;
}

export class SubmitRatingDto {
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() comment?: string;
}

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

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
