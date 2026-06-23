import { BadRequestException, Injectable, Logger } from '@nestjs/common';

// Geolocates + classifies an IP. Combines two free sources (server-side):
//  - ip-api.com    → geo (city/region/lat/lon/timezone), ISP/ASN, reverse host
//  - proxycheck.io → VPN/Proxy/Tor detection, provider name, risk score
// Optional PROXYCHECK_API_KEY raises the daily quota (works without a key too).
@Injectable()
export class IpLookupService {
  private readonly logger = new Logger('IpLookup');

  private isPrivate(ip: string): boolean {
    return (
      /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip) ||
      ip === '::1' ||
      /^f[cd]/i.test(ip)
    );
  }

  private translateType(type?: string, hosting?: boolean): string {
    if (!type) return hosting ? 'Hébergement / Datacenter' : 'Résidentiel / Entreprise';
    const map: Record<string, string> = {
      VPN: 'VPN',
      'Public Proxy': 'Proxy public',
      'Web Proxy': 'Proxy web',
      Proxy: 'Proxy',
      Tor: 'Tor',
      'Residential Proxy': 'Proxy résidentiel',
      Residential: 'Résidentiel',
      Hosting: 'Hébergement / Datacenter',
      'Compromised Server': 'Serveur compromis',
      Business: 'Entreprise',
      Wireless: 'Réseau mobile',
    };
    return map[type] ?? type;
  }

  private async fetchIpApi(ip: string) {
    const fields =
      'status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting,query';
    try {
      const res = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${fields}&lang=fr`,
      );
      const data: any = await res.json();
      if (data.status !== 'success') return null;
      return data;
    } catch {
      return null;
    }
  }

  private async fetchProxyCheck(ip: string) {
    const key = process.env.PROXYCHECK_API_KEY;
    try {
      const res = await fetch(
        `https://proxycheck.io/v2/${encodeURIComponent(ip)}?vpn=1&asn=1&risk=1${
          key ? `&key=${key}` : ''
        }`,
      );
      const data: any = await res.json();
      if (data.status !== 'ok' && data.status !== 'warning') return null;
      return data[ip] ?? null;
    } catch {
      return null;
    }
  }

  async lookup(ip: string) {
    const clean = (ip || '').trim();
    if (!clean) throw new BadRequestException('Adresse IP manquante.');

    if (this.isPrivate(clean)) {
      return { ip: clean, private: true, type: 'Réseau interne' };
    }

    const [geo, pc] = await Promise.all([
      this.fetchIpApi(clean),
      this.fetchProxyCheck(clean),
    ]);

    if (!geo && !pc) {
      throw new BadRequestException('Localisation impossible pour cette adresse.');
    }

    const proxy = pc?.proxy === 'yes' || Boolean(geo?.proxy);
    const isVpn = (pc?.type ?? '').toLowerCase().includes('vpn');
    const isTor = (pc?.type ?? '').toLowerCase().includes('tor');
    const hosting = Boolean(geo?.hosting);
    const type = this.translateType(pc?.type, hosting);

    // Network operator (FAI / hébergeur)
    const networkProvider =
      geo?.isp || pc?.provider || pc?.organisation || geo?.org || null;
    // VPN/proxy operator, when flagged as such
    const proxyProvider = proxy ? pc?.provider || geo?.org || geo?.isp || null : null;

    const asnRaw = geo?.as || (pc?.asn ? `${pc.asn} ${pc.provider ?? ''}` : null);
    const asn = asnRaw ? String(asnRaw).split(' ')[0] : pc?.asn ?? null;

    const lat = geo?.lat ?? (pc?.latitude ? Number(pc.latitude) : undefined);
    const lon = geo?.lon ?? (pc?.longitude ? Number(pc.longitude) : undefined);

    return {
      ip: geo?.query || clean,
      private: false,
      // Geo
      country: geo?.country || pc?.country || null,
      countryCode: geo?.countryCode || pc?.isocode || null,
      region: geo?.regionName || pc?.region || null,
      city: geo?.city || pc?.city || null,
      zip: geo?.zip || null,
      lat,
      lon,
      timezone: geo?.timezone || pc?.timezone || null,
      // Network
      isp: networkProvider,
      org: geo?.org || pc?.organisation || null,
      asn,
      asName: geo?.asname || pc?.provider || null,
      hostname: geo?.reverse || null,
      mobile: Boolean(geo?.mobile),
      hosting,
      // Threat / proxy classification
      proxy,
      vpn: isVpn,
      tor: isTor,
      type,
      proxyProvider,
      risk: typeof pc?.risk === 'number' ? pc.risk : pc?.risk ? Number(pc.risk) : null,
      source: pc ? 'proxycheck+ipapi' : 'ipapi',
    };
  }
}
