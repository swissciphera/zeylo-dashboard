import { Injectable } from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface AuditInput {
  actorType: ActorType;
  actorId?: string;
  actorName?: string;
  adminId?: string;
  companyId?: string;
  action: string;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
  city?: string;
  country?: string;
}

// Central place to record sensitive actions into the audit log.
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorType: input.actorType,
        actorId: input.actorId,
        actorName: input.actorName,
        adminId: input.adminId,
        companyId: input.companyId,
        action: input.action,
        reason: input.reason,
        metadata: input.metadata,
        ip: input.ip,
        city: input.city,
        country: input.country,
      },
    });
  }
}
