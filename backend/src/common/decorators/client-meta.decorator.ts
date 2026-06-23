import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ClientMetaInfo {
  ip?: string;
  city?: string;
  country?: string;
}

function headerValue(v: unknown): string | undefined {
  if (Array.isArray(v)) return v[0];
  if (typeof v === 'string') return v;
  return undefined;
}

// Extracts the real visitor IP + geo, accounting for the
// Cloudflare → Traefik → nginx → backend chain.
// Cloudflare sets CF-Connecting-IP (true client IP); city/country come from
// Cloudflare's "Add visitor location headers" managed transform when enabled.
export const ClientMeta = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientMetaInfo => {
    const req = ctx.switchToHttp().getRequest();
    const h = req.headers ?? {};

    const xff = headerValue(h['x-forwarded-for']);
    const ip =
      headerValue(h['cf-connecting-ip']) ||
      (xff ? xff.split(',')[0].trim() : undefined) ||
      headerValue(h['x-real-ip']) ||
      req.ip ||
      req.socket?.remoteAddress ||
      undefined;

    const rawCity = headerValue(h['cf-ipcity']);
    let city: string | undefined;
    if (rawCity) {
      try {
        city = decodeURIComponent(rawCity);
      } catch {
        city = rawCity;
      }
    }
    const country = headerValue(h['cf-ipcountry']);

    return { ip, city, country: country && country !== 'XX' ? country : undefined };
  },
);
