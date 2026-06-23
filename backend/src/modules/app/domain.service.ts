import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { promises as dns } from 'dns';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CaddyService } from '../../integrations/caddy.service';

export class SetDomainDto {
  @IsString() @MinLength(3) domain!: string;
}

export class CloudflareDto {
  @IsString() @MinLength(10) apiToken!: string;
  @IsOptional() @IsString() domain?: string;
}

// CNAME target visitors' domains should point to (the platform public host).
function target(): string {
  return (
    process.env.PUBLIC_LINK_TARGET ||
    (process.env.PUBLIC_APP_URL || 'dashboard.ciphera.ch')
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
  );
}

@Injectable()
export class DomainService {
  private readonly logger = new Logger('Domain');

  constructor(
    private readonly prisma: PrismaService,
    private readonly caddy: CaddyService,
  ) {}

  // ACME email = company email, else the OWNER user's email, else default.
  private async ownerEmail(companyId: string): Promise<string | undefined> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { email: true },
    });
    if (company?.email) return company.email;
    const owner = await this.prisma.user.findFirst({
      where: { companyId, role: 'OWNER' },
      select: { email: true },
    });
    return owner?.email ?? undefined;
  }

  private cleanDomain(input: string): string {
    const d = (input || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/\.$/, '');
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(d)) {
      throw new BadRequestException('Domaine invalide (ex. liens.monentreprise.ch).');
    }
    return d;
  }

  private instructions(domain: string, token: string) {
    return {
      target: target(),
      records: [
        {
          type: 'CNAME',
          name: domain,
          value: target(),
          note: 'Pointe votre domaine vers Zeylo.',
        },
        {
          type: 'TXT',
          name: `_zeylo-verify.${domain}`,
          value: token,
          note: 'Prouve que le domaine vous appartient.',
        },
      ],
    };
  }

  async get(companyId: string) {
    const c = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        linkDomain: true,
        linkDomainStatus: true,
        linkDomainToken: true,
        linkDomainVerifiedAt: true,
      },
    });
    return {
      domain: c?.linkDomain ?? null,
      status: c?.linkDomainStatus ?? 'NONE',
      verifiedAt: c?.linkDomainVerifiedAt ?? null,
      instructions:
        c?.linkDomain && c?.linkDomainToken
          ? this.instructions(c.linkDomain, c.linkDomainToken)
          : null,
    };
  }

  async set(companyId: string, dto: SetDomainDto) {
    const domain = this.cleanDomain(dto.domain);
    const existing = await this.prisma.company.findFirst({
      where: { linkDomain: domain, NOT: { id: companyId } },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('Ce domaine est déjà utilisé.');

    // If switching from a previously configured domain, deprovision it.
    const prev = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { linkDomain: true },
    });
    if (prev?.linkDomain && prev.linkDomain !== domain) {
      await this.caddy.removeDomain(prev.linkDomain);
    }

    const token = `zeylo-verify=${randomBytes(16).toString('hex')}`;
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        linkDomain: domain,
        linkDomainToken: token,
        linkDomainStatus: 'PENDING',
        linkDomainVerifiedAt: null,
      },
    });
    return this.get(companyId);
  }

  async remove(companyId: string) {
    const prev = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { linkDomain: true },
    });
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        linkDomain: null,
        linkDomainToken: null,
        linkDomainStatus: 'NONE',
        linkDomainVerifiedAt: null,
      },
    });
    if (prev?.linkDomain) await this.caddy.removeDomain(prev.linkDomain);
    return this.get(companyId);
  }

  // Verify CNAME + TXT records via DNS resolution.
  async verify(companyId: string) {
    const c = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { linkDomain: true, linkDomainToken: true },
    });
    if (!c?.linkDomain || !c?.linkDomainToken) {
      throw new BadRequestException("Aucun domaine à vérifier.");
    }
    const domain = c.linkDomain;
    const tgt = target().toLowerCase();

    let cnameOk = false;
    try {
      const cnames = await dns.resolveCname(domain);
      cnameOk = cnames.some((v) => v.toLowerCase().replace(/\.$/, '') === tgt);
    } catch {
      cnameOk = false;
    }
    // When the record is proxied (e.g. Cloudflare orange cloud), public DNS
    // hides the CNAME behind A/AAAA records. Treat a resolvable domain as ok —
    // ownership is still proven by the TXT token below.
    if (!cnameOk) {
      try {
        const a = await dns.resolve4(domain);
        if (a.length) cnameOk = true;
      } catch {
        /* ignore */
      }
      if (!cnameOk) {
        try {
          const aaaa = await dns.resolve6(domain);
          if (aaaa.length) cnameOk = true;
        } catch {
          /* ignore */
        }
      }
    }

    let txtOk = false;
    try {
      const txt = await dns.resolveTxt(`_zeylo-verify.${domain}`);
      // Strip surrounding quotes/whitespace (Cloudflare may quote TXT content).
      const want = c.linkDomainToken.trim().replace(/^"+|"+$/g, '');
      const flat = txt.flat().map((s) => s.trim().replace(/^"+|"+$/g, ''));
      txtOk = flat.includes(want);
    } catch {
      txtOk = false;
    }

    const verified = cnameOk && txtOk;
    if (verified) {
      await this.prisma.company.update({
        where: { id: companyId },
        data: { linkDomainStatus: 'VERIFIED', linkDomainVerifiedAt: new Date() },
      });
      // Provision a real TLS certificate for this domain under the owner email.
      await this.caddy.ensureDomain(domain, await this.ownerEmail(companyId));
    }
    return { verified, cnameOk, txtOk, ...(await this.get(companyId)) };
  }

  // Automatically create the DNS records in the user's Cloudflare account.
  async cloudflare(companyId: string, dto: CloudflareDto) {
    const c = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { linkDomain: true, linkDomainToken: true },
    });
    if (!c?.linkDomain || !c?.linkDomainToken) {
      throw new BadRequestException("Enregistrez d'abord votre domaine.");
    }
    const domain = c.linkDomain;
    const headers = {
      Authorization: `Bearer ${dto.apiToken}`,
      'Content-Type': 'application/json',
    };

    // Find the zone whose name is a suffix of the domain.
    let zone: { id: string; name: string } | undefined;
    try {
      const res = await fetch(
        'https://api.cloudflare.com/client/v4/zones?per_page=50',
        { headers },
      );
      const data: any = await res.json();
      if (!data.success) {
        throw new BadRequestException(
          data.errors?.[0]?.message || 'Jeton Cloudflare invalide.',
        );
      }
      zone = (data.result as any[])
        .map((z) => ({ id: z.id, name: z.name }))
        .filter((z) => domain === z.name || domain.endsWith(`.${z.name}`))
        .sort((a, b) => b.name.length - a.name.length)[0];
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Connexion à Cloudflare impossible.');
    }
    if (!zone) {
      throw new BadRequestException(
        "Aucune zone Cloudflare ne correspond à ce domaine (le jeton a-t-il accès à ce domaine ?).",
      );
    }

    await this.upsertRecord(zone.id, headers, {
      type: 'CNAME',
      name: domain,
      content: target(),
      proxied: true, // Cloudflare proxy = SSL + protection
    });
    await this.upsertRecord(zone.id, headers, {
      type: 'TXT',
      name: `_zeylo-verify.${domain}`,
      content: c.linkDomainToken,
    });

    // DNS may take a moment to propagate; attempt verification right away.
    try {
      return await this.verify(companyId);
    } catch {
      return { verified: false, cnameOk: false, txtOk: false, ...(await this.get(companyId)) };
    }
  }

  private async upsertRecord(
    zoneId: string,
    headers: Record<string, string>,
    record: { type: string; name: string; content: string; proxied?: boolean },
  ) {
    const base = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;
    // Look for an existing record of same type+name
    const listRes = await fetch(
      `${base}?type=${record.type}&name=${encodeURIComponent(record.name)}`,
      { headers },
    );
    const list: any = await listRes.json();
    const existing = list.success && list.result?.[0];
    const body = JSON.stringify(record);
    if (existing) {
      await fetch(`${base}/${existing.id}`, { method: 'PUT', headers, body });
    } else {
      const res = await fetch(base, { method: 'POST', headers, body });
      const data: any = await res.json();
      if (!data.success) {
        this.logger.warn(
          `CF record ${record.type} ${record.name}: ${data.errors?.[0]?.message}`,
        );
      }
    }
  }
}
