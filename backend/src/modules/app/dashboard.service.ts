import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(companyId: string) {
    const in30Days = new Date(Date.now() + 30 * 86400_000);

    const [
      employeesCount,
      activeEmployees,
      projectsByStatus,
      expiringContracts,
      recentRatings,
      recentActivity,
      servicesCount,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { companyId } }),
      this.prisma.employee.count({ where: { companyId, isActive: true } }),
      this.prisma.project.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { _all: true },
      }),
      this.prisma.employee.findMany({
        where: {
          companyId,
          isActive: true,
          contractEndDate: { not: null, lte: in30Days },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          contractEndDate: true,
        },
        orderBy: { contractEndDate: 'asc' },
        take: 10,
      }),
      this.prisma.employeeNote.findMany({
        where: { companyId, rating: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.auditLog.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.service.count({ where: { companyId, isActive: true } }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const row of projectsByStatus) statusMap[row.status] = row._count._all;

    const ratings = recentRatings
      .map((r) => r.rating)
      .filter((r): r is number => r != null);
    const avgRating = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) /
        10
      : null;

    return {
      employees: { total: employeesCount, active: activeEmployees },
      services: servicesCount,
      projects: {
        inProgress: statusMap['IN_PROGRESS'] ?? 0,
        declaredDone: statusMap['DECLARED_DONE'] ?? 0,
        photosSent: statusMap['PHOTOS_SENT'] ?? 0,
        validated: statusMap['VALIDATED'] ?? 0,
        refused: statusMap['REFUSED'] ?? 0,
        total: projectsByStatus.reduce((a, r) => a + r._count._all, 0),
      },
      avgRating,
      ratingsCount: ratings.length,
      expiringContracts,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        actorName: a.actorName,
        createdAt: a.createdAt,
      })),
    };
  }
}
