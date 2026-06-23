import { Injectable, NotFoundException } from '@nestjs/common';
import { IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';

export class SupportAccessDto {
  @IsIn(['employees', 'projects', 'services', 'contacts'])
  resource!: 'employees' | 'projects' | 'services' | 'contacts';

  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'Une raison est obligatoire (min. 5 caractères).' })
  reason!: string;
}

// Controlled, journaled support access to a tenant's business content.
// Every consultation is recorded in SupportAccess + AuditLog.
@Injectable()
export class SupportAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async access(
    companyId: string,
    dto: SupportAccessDto,
    adminId: string,
    adminName: string,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Entreprise introuvable.');

    await this.prisma.supportAccess.create({
      data: { adminId, companyId, resource: dto.resource, reason: dto.reason },
    });
    await this.audit.log({
      actorType: 'ADMIN',
      actorId: adminId,
      adminId,
      actorName: adminName,
      companyId,
      action: `support.access.${dto.resource}`,
      reason: dto.reason,
    });

    // Return the requested business content (read-only).
    switch (dto.resource) {
      case 'employees':
        return this.prisma.employee.findMany({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
        });
      case 'projects':
        return this.prisma.project.findMany({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
        });
      case 'services':
        return this.prisma.service.findMany({ where: { companyId } });
      case 'contacts':
        return this.prisma.contact.findMany({ where: { companyId } });
    }
  }
}
