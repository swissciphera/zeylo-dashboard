import { Injectable, Logger } from '@nestjs/common';

// Provisions per-domain TLS in Caddy via its Admin API, so each verified
// custom domain gets a real Let's Encrypt certificate (Cloudflare Full strict
// compatible) issued under the owner's email. No-op when CADDY_ADMIN_URL is
// unset (e.g. nginx/Traefik deployments) — on-demand TLS still covers it.
@Injectable()
export class CaddyService {
  private readonly logger = new Logger('Caddy');

  private get admin(): string | null {
    return process.env.CADDY_ADMIN_URL || null;
  }

  get enabled(): boolean {
    return Boolean(this.admin);
  }

  // Add (or refresh) a TLS automation policy for `domain` using `email`.
  // Returns a status so callers can surface it in the domain log.
  async ensureDomain(
    domain: string,
    email?: string,
  ): Promise<{ ok: boolean; skipped?: boolean; detail: string }> {
    if (!this.admin) {
      return {
        ok: false,
        skipped: true,
        detail:
          'SSL géré par votre proxy (Cloudflare en mode Full). Émission auto à l’origine non activée (déploiement Caddy requis).',
      };
    }
    const id = `zeylo-${domain}`;
    const acmeEmail = email || process.env.ACME_EMAIL || undefined;
    const policy: any = {
      '@id': id,
      subjects: [domain],
      issuers: [{ module: 'acme', email: acmeEmail }],
    };
    try {
      await fetch(`${this.admin}/id/${id}`, { method: 'DELETE' }).catch(() => {});
      const res = await fetch(
        `${this.admin}/config/apps/tls/automation/policies/0`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(policy),
        },
      );
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        this.logger.warn(`ensureDomain ${domain}: HTTP ${res.status} ${t}`);
        return { ok: false, detail: `Erreur Caddy ${res.status}.` };
      }
      this.logger.log(`TLS provisioned for ${domain} (email: ${acmeEmail})`);
      return {
        ok: true,
        detail: `Certificat TLS demandé pour ${domain} (email : ${acmeEmail ?? 'défaut'}).`,
      };
    } catch (e: any) {
      this.logger.warn(`ensureDomain ${domain} failed: ${e?.message}`);
      return { ok: false, detail: `Caddy injoignable : ${e?.message}` };
    }
  }

  async removeDomain(domain: string): Promise<void> {
    if (!this.admin) return;
    try {
      await fetch(`${this.admin}/id/zeylo-${domain}`, { method: 'DELETE' });
    } catch (e: any) {
      this.logger.warn(`removeDomain ${domain} failed: ${e?.message}`);
    }
  }
}
