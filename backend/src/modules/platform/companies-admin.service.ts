import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { ClientMetaInfo } from '../../common/decorators/client-meta.decorator';

@Injectable()
export class CompaniesAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(search?: string) {
    const companies = await this.prisma.company.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sector: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, employees: true } } },
    });
    return companies.map((c) => ({
      id: c.id,
      name: c.name,
      sector: c.sector,
      subscriptionStatus: c.subscriptionStatus,
      plan: c.plan,
      createdAt: c.createdAt,
      usersCount: c._count.users,
      employeesCount: c._count.employees,
    }));
  }

  // Detail view. Support access to business content is journaled separately.
  async detail(
    id: string,
    adminId: string,
    adminName: string,
    meta: ClientMetaInfo = {},
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            employees: true,
            projects: true,
            services: true,
            contacts: true,
          },
        },
      },
    });
    if (!company) throw new NotFoundException('Entreprise introuvable.');

    const [activeProjects, supportHistory, payments] = await Promise.all([
      this.prisma.project.count({
        where: { companyId: id, status: { not: 'VALIDATED' } },
      }),
      this.prisma.supportAccess.findMany({
        where: { companyId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { admin: { select: { name: true, email: true } } },
      }),
      this.prisma.payment.findMany({
        where: { companyId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Viewing the company detail itself is a (light) audit event.
    await this.audit.log({
      actorType: 'ADMIN',
      actorId: adminId,
      adminId,
      actorName: adminName,
      companyId: id,
      action: 'company.view',
      ip: meta.ip,
      city: meta.city,
      country: meta.country,
    });

    return {
      id: company.id,
      name: company.name,
      sector: company.sector,
      email: company.email,
      phone: company.phone,
      address: company.address,
      subscriptionStatus: company.subscriptionStatus,
      plan: company.plan,
      trialEndsAt: company.trialEndsAt,
      referralCode: company.referralCode,
      createdAt: company.createdAt,
      counts: {
        users: company._count.users,
        employees: company._count.employees,
        projects: company._count.projects,
        services: company._count.services,
        contacts: company._count.contacts,
        activeProjects,
      },
      supportHistory: supportHistory.map((s) => ({
        id: s.id,
        admin: s.admin.name,
        resource: s.resource,
        reason: s.reason,
        createdAt: s.createdAt,
      })),
      payments,
    };
  }
}
