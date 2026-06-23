import { Injectable, Logger } from '@nestjs/common';
import { ProxyAgent } from 'undici';

// Centralizes outbound proxy handling so it works with ANY HTTP/HTTPS proxy
// (Bright Data, Smartproxy, a self-hosted Squid, etc.) and can be health-checked.
@Injectable()
export class ProxyService {
  private readonly logger = new Logger('Proxy');

  // True when a proxy is configured.
  get configured(): boolean {
    return Boolean((process.env.PROXY_URL || '').trim());
  }

  // Normalizes the proxy URL: accepts "host:port", "user:pass@host:port",
  // or a full "http(s)://..." URL. Defaults to http:// when no scheme.
  get url(): string | null {
    const raw = (process.env.PROXY_URL || '').trim();
    if (!raw) return null;
    return /^[a-z]+:\/\//i.test(raw) ? raw : `http://${raw}`;
  }

  // undici dispatcher to pass to fetch(), or undefined when no proxy.
  dispatcher(): ProxyAgent | undefined {
    const url = this.url;
    return url ? new ProxyAgent(url) : undefined;
  }

  // Health check: routes a tiny request through the proxy and reports the
  // egress IP + latency.
  async test(): Promise<{
    configured: boolean;
    ok: boolean;
    ip?: string;
    country?: string;
    latencyMs?: number;
    error?: string;
  }> {
    if (!this.configured) return { configured: false, ok: false };
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const { fetch: undiciFetch } = await import('undici');
      const res = await undiciFetch(
        'http://ip-api.com/json/?fields=query,country',
        { dispatcher: this.dispatcher(), signal: controller.signal },
      );
      const data: any = await res.json();
      return {
        configured: true,
        ok: true,
        ip: data.query,
        country: data.country,
        latencyMs: Date.now() - started,
      };
    } catch (e: any) {
      this.logger.warn(`Proxy test failed: ${e?.message}`);
      return { configured: true, ok: false, error: e?.message ?? 'Erreur' };
    } finally {
      clearTimeout(timer);
    }
  }
}
