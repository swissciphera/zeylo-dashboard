import { BadRequestException, Injectable, Logger } from '@nestjs/common';

// Geolocates an IP via ip-api.com (free, server-side HTTP call). No API key.
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

  async lookup(ip: string) {
    const clean = (ip || '').trim();
    if (!clean) throw new BadRequestException('Adresse IP manquante.');

    if (this.isPrivate(clean)) {
      return {
        ip: clean,
        private: true,
        type: 'Réseau interne',
      };
    }

    const fields =
      'status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting,query';
    try {
      const res = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(clean)}?fields=${fields}&lang=fr`,
      );
      const data: any = await res.json();
      if (data.status !== 'success') {
        throw new BadRequestException(
          data.message === 'private range'
            ? 'Adresse IP privée.'
            : 'Localisation impossible pour cette adresse.',
        );
      }

      const asn = typeof data.as === 'string' ? data.as.split(' ')[0] : null;
      let type = 'Résidentiel / Entreprise';
      if (data.proxy) type = 'VPN / Proxy';
      else if (data.hosting) type = 'Hébergement / Datacenter';
      else if (data.mobile) type = 'Mobile';

      return {
        ip: data.query,
        private: false,
        country: data.country,
        countryCode: data.countryCode,
        region: data.regionName,
        city: data.city,
        zip: data.zip || null,
        lat: data.lat,
        lon: data.lon,
        timezone: data.timezone,
        isp: data.isp,
        org: data.org || null,
        asn,
        asName: data.asname || null,
        hostname: data.reverse || null,
        proxy: Boolean(data.proxy),
        hosting: Boolean(data.hosting),
        mobile: Boolean(data.mobile),
        type,
      };
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      this.logger.error(`IP lookup failed: ${(e as Error).message}`);
      throw new BadRequestException('Service de localisation indisponible.');
    }
  }
}
