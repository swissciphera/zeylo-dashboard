import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsService } from '../../integrations/sms.service';
import { EmailService } from '../../integrations/email.service';
import { ProxyService } from '../../integrations/proxy.service';

@Injectable()
export class SystemHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly email: EmailService,
    private readonly proxy: ProxyService,
  ) {}

  async status() {
    let dbOk = true;
    let dbLatency = 0;
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
    } catch {
      dbOk = false;
    }

    const proxyTest = await this.proxy.test();
    const proxyService = {
      key: 'proxy',
      label: 'Proxy (scraping)',
      status: !proxyTest.configured
        ? 'mock'
        : proxyTest.ok
          ? 'operational'
          : 'down',
      detail: !proxyTest.configured
        ? 'Aucun proxy configuré (recherche auto désactivée)'
        : proxyTest.ok
          ? `IP ${proxyTest.ip ?? '?'}${proxyTest.country ? ` · ${proxyTest.country}` : ''} · ${proxyTest.latencyMs} ms`
          : `Échec : ${proxyTest.error ?? 'connexion impossible'}`,
    };

    const services = [
      {
        key: 'postgres',
        label: 'PostgreSQL',
        status: dbOk ? 'operational' : 'down',
        detail: dbOk ? `${dbLatency} ms` : 'Connexion impossible',
      },
      {
        key: 'twilio',
        label: 'Twilio SMS',
        status: this.sms.configured ? 'operational' : 'mock',
        detail: this.sms.configured
          ? 'Connecté'
          : 'Mode démo (clé non configurée)',
      },
      {
        key: 'resend',
        label: 'Resend Email',
        status: this.email.configured ? 'operational' : 'mock',
        detail: this.email.configured
          ? 'Connecté'
          : 'Mode démo (clé non configurée)',
      },
      {
        key: 'storage',
        label: 'Stockage fichiers',
        status: 'operational',
        detail: process.env.FILE_STORAGE_DIR ?? '/app/storage',
      },
      proxyService,
    ];

    // Recent errors / technical alerts pulled from the audit log.
    const recentErrors = await this.prisma.auditLog.findMany({
      where: { action: { contains: 'error' } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      services,
      recentErrors,
      checkedAt: new Date().toISOString(),
    };
  }
}
