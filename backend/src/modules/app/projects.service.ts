import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsService } from '../../integrations/sms.service';
import { TokenService } from '../../auth/token.service';
import { generateToken, generateSmsCode } from '../../common/utils';

export class CreateProjectDto {
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() clientName?: string;
  @IsOptional() @IsString() clientPhone?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class UpdateProjectStatusDto {
  @IsEnum(ProjectStatus) status!: ProjectStatus;
  @IsOptional() @IsString() refusalReason?: string;
}

export class AssignEmployeeDto {
  @IsString() employeeId!: string;
}

export class TempAccessDto {
  @IsString() phone!: string;
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
  ) {}

  list(companyId: string, status?: ProjectStatus) {
    return this.prisma.project.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        assignments: { include: { employee: true } },
        _count: { select: { ratings: true } },
      },
    });
  }

  async detail(companyId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, companyId },
      include: {
        assignments: { include: { employee: true } },
        ratings: { orderBy: { createdAt: 'desc' } },
        tempAccesses: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!project) throw new NotFoundException('Chantier introuvable.');
    return project;
  }

  create(companyId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        companyId,
        title: dto.title,
        description: dto.description,
        address: dto.address,
        clientName: dto.clientName,
        clientPhone: dto.clientPhone,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });
  }

  async updateStatus(companyId: string, id: string, dto: UpdateProjectStatusDto) {
    await this.ensureOwned(companyId, id);
    if (dto.status === 'REFUSED' && !dto.refusalReason) {
      throw new BadRequestException('Un motif de refus est requis.');
    }
    return this.prisma.project.update({
      where: { id },
      data: {
        status: dto.status,
        refusalReason: dto.status === 'REFUSED' ? dto.refusalReason : null,
      },
    });
  }

  async assign(companyId: string, id: string, dto: AssignEmployeeDto) {
    await this.ensureOwned(companyId, id);
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Employé introuvable.');
    return this.prisma.projectAssignment.upsert({
      where: {
        projectId_employeeId: { projectId: id, employeeId: dto.employeeId },
      },
      update: {},
      create: { companyId, projectId: id, employeeId: dto.employeeId },
    });
  }

  async unassign(companyId: string, id: string, employeeId: string) {
    await this.ensureOwned(companyId, id);
    await this.prisma.projectAssignment.deleteMany({
      where: { companyId, projectId: id, employeeId },
    });
    return { ok: true };
  }

  // Base URL for branded links: the company's verified custom domain if any,
  // otherwise the platform's public URL.
  private async linkBase(companyId: string): Promise<string> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { linkDomain: true, linkDomainStatus: true },
    });
    if (company?.linkDomainStatus === 'VERIFIED' && company.linkDomain) {
      return `https://${company.linkDomain}`;
    }
    return (process.env.PUBLIC_APP_URL || '').replace(/\/$/, '');
  }

  // Temporary employee access: one-time link + SMS code, single project scope.
  async createTempAccess(companyId: string, id: string, dto: TempAccessDto) {
    await this.ensureOwned(companyId, id);
    const token = generateToken();
    const code = generateSmsCode();
    const access = await this.prisma.projectTempAccess.create({
      data: {
        companyId,
        projectId: id,
        token,
        smsCodeHash: await TokenService.hashPassword(code),
        phone: dto.phone,
        expiresAt: new Date(Date.now() + 24 * 3600_000),
      },
    });
    const base = await this.linkBase(companyId);
    const url = base ? `${base}/access/${token}` : null;
    await this.sms.send(
      dto.phone,
      `Zeylo : votre code d'accès chantier est ${code}`,
    );
    return { id: access.id, token, url, expiresAt: access.expiresAt };
  }

  // Generate a one-time client rating link for the project.
  async createRatingLink(companyId: string, id: string) {
    await this.ensureOwned(companyId, id);
    const token = generateToken();
    const rating = await this.prisma.clientRating.create({
      data: {
        companyId,
        projectId: id,
        token,
        expiresAt: new Date(Date.now() + 14 * 86400_000),
      },
    });
    const base = await this.linkBase(companyId);
    const url = base ? `${base}/rate/${token}` : null;
    return { token, url, expiresAt: rating.expiresAt };
  }

  private async ensureOwned(companyId: string, id: string) {
    const found = await this.prisma.project.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Chantier introuvable.');
  }
}
