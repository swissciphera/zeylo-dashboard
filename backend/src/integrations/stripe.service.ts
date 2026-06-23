import { Injectable, Logger } from '@nestjs/common';

// Stripe — stubbed integration with a real connectivity check when a key is set.
@Injectable()
export class StripeService {
  private readonly logger = new Logger('StripeService');

  get configured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }

  // Health check: pings the Stripe API (balance endpoint) to validate the key.
  async test(): Promise<{
    configured: boolean;
    ok: boolean;
    mode?: 'live' | 'test';
    latencyMs?: number;
    error?: string;
  }> {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return { configured: false, ok: false };

    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal,
      });
      const mode = key.startsWith('sk_live') ? 'live' : 'test';
      if (!res.ok) {
        const body: any = await res.json().catch(() => ({}));
        return {
          configured: true,
          ok: false,
          mode,
          error: body?.error?.message ?? `HTTP ${res.status}`,
        };
      }
      return { configured: true, ok: true, mode, latencyMs: Date.now() - started };
    } catch (e: any) {
      this.logger.warn(`Stripe test failed: ${e?.message}`);
      return { configured: true, ok: false, error: e?.message ?? 'Erreur' };
    } finally {
      clearTimeout(timer);
    }
  }
}
