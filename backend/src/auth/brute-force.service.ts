import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ActorType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Simple DB-backed brute-force protection: blocks after N failed attempts
// within a sliding window, per (actorType, identifier).
@Injectable()
export class BruteForceService {
  private readonly MAX_ATTEMPTS = 5;
  private readonly WINDOW_MINUTES = 15;

  constructor(private readonly prisma: PrismaService) {}

  async assertNotLocked(actor: ActorType, identifier: string): Promise<void> {
    const since = new Date(Date.now() - this.WINDOW_MINUTES * 60_000);
    const fails = await this.prisma.loginAttempt.count({
      where: {
        actorType: actor,
        identifier: identifier.toLowerCase(),
        success: false,
        createdAt: { gte: since },
      },
    });
    if (fails >= this.MAX_ATTEMPTS) {
      throw new HttpException(
        'Trop de tentatives. Réessayez dans quelques minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async record(
    actor: ActorType,
    identifier: string,
    success: boolean,
    ip?: string,
  ): Promise<void> {
    await this.prisma.loginAttempt.create({
      data: {
        actorType: actor,
        identifier: identifier.toLowerCase(),
        success,
        ip,
      },
    });
  }
}
