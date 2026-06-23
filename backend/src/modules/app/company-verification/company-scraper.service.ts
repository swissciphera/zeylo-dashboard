import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as cheerio from 'cheerio';
import { fetch as undiciFetch } from 'undici';
import { ProxyService } from '../../../integrations/proxy.service';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8',
};

export interface SearchResult {
  nom: string;
  adresse: string | null;
  lien: string;
}

// Ports the n8n "Vérification d'entreprise" workflow into code:
// search + company sheet scraping on moneyhouse.ch, plus the uid.admin.ch
// registry, all routed through the configured proxy (PROXY_URL).
@Injectable()
export class CompanyScraperService {
  private readonly logger = new Logger('CompanyScraper');

  constructor(private readonly proxy: ProxyService) {}

  get available(): boolean {
    return this.proxy.configured;
  }

  // Auto-scraping requires a proxy; without one we fall back to manual entry.
  private assertProxy() {
    if (!this.proxy.configured) {
      throw new ServiceUnavailableException(
        'Recherche automatique indisponible : aucun proxy configuré.',
      );
    }
  }

  private async getHtml(url: string, timeoutMs = 20000): Promise<string> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await undiciFetch(url, {
        headers: HEADERS,
        dispatcher: this.proxy.dispatcher(),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new BadRequestException(
          `La source a répondu ${res.status}. Réessayez dans un instant.`,
        );
      }
      return await res.text();
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      this.logger.error(`Fetch failed for ${url}: ${e?.message}`);
      throw new BadRequestException(
        'Impossible de contacter la source (proxy/connexion).',
      );
    } finally {
      clearTimeout(t);
    }
  }

  // ── Search ──────────────────────────────────────────────────
  async search(query: string): Promise<SearchResult[]> {
    this.assertProxy();
    const q = (query || '').trim();
    if (q.length < 2) throw new BadRequestException('Recherche trop courte.');

    const url = `https://www.moneyhouse.ch/fr/search?q=${encodeURIComponent(q)}`;
    const html = await this.getHtml(url, 15000);
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    $('tbody.js-search-result-item').each((_, tbody) => {
      const $tbody = $(tbody);
      const $link = $tbody
        .find('a[href*="/fr/company/"], a[href*="/fr/entreprise/"]')
        .first();
      if (!$link.length) return;
      const nom = $link.text().trim();
      const href = $link.attr('href');
      const adresse = $tbody.find('p.minor').first().text().trim();
      if (nom && href) {
        results.push({
          nom,
          adresse: adresse || null,
          lien: 'https://www.moneyhouse.ch' + href,
        });
      }
    });

    // Fallback selector
    if (results.length === 0) {
      $('a[href*="/fr/company/"]').each((_, a) => {
        const $a = $(a);
        const nom = $a.text().trim();
        const href = $a.attr('href');
        if (!nom || !href || results.find((r) => r.lien.endsWith(href))) return;
        results.push({ nom, adresse: null, lien: 'https://www.moneyhouse.ch' + href });
      });
    }

    return results.slice(0, 20);
  }

  // ── Company sheet ───────────────────────────────────────────
  async details(url: string): Promise<Record<string, any>> {
    this.assertProxy();
    if (!/^https:\/\/www\.moneyhouse\.ch\/fr\//.test(url)) {
      throw new BadRequestException('Lien de fiche invalide.');
    }
    const html = await this.getHtml(url, 20000);
    const $ = cheerio.load(html);

    const norm = (s?: string) =>
      (s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
    const strip = (s?: string) =>
      (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
    const eqLabel = (a: string, b: string) =>
      strip(norm(a)).toLowerCase() === strip(norm(b)).toLowerCase();
    const textOrNull = ($el: cheerio.Cheerio<any>) =>
      $el && $el.length ? norm($el.first().text()) : null;
    const htmlToText = (frag: string) => {
      const $x = cheerio.load(`<div>${frag}</div>`);
      return norm($x('div').text());
    };
    const byLabelValue = (label: string) => {
      const h4 = $('h4.key')
        .filter((_, e) => eqLabel($(e).text(), label))
        .first();
      if (!h4.length) return null;
      return textOrNull(h4.nextAll('.value').first());
    };
    const moneyFmt = (s?: string | null) => {
      if (!s) return null;
      const only = s.replace(/[^0-9'\s]/g, '');
      const digits = only.replace(/\s+/g, '');
      return digits ? `${norm(only)} CHF`.replace(/\s+CHF$/, ' CHF') : norm(s);
    };

    const company_name =
      textOrNull($('.company-name h1')) || textOrNull($('.company-name'));

    const statusBlock = $('.company-status.company-info-block');
    const status =
      textOrNull(statusBlock.find('.vertical-middle').last()) ||
      textOrNull(statusBlock);

    let registry_number = textOrNull($('.chnr'));
    if (registry_number) {
      registry_number = registry_number.replace(
        /^\s*(N°\s*registre\s*commerce|Handelsregister-Nr\.?)\s*:\s*/i,
        '',
      );
    }

    let sector = textOrNull($('.branch.overview-branch-holder'));
    if (sector) sector = sector.replace(/^\s*(Secteur|Branche)\s*:\s*/i, '');

    const purposeH4 = $('h4.key')
      .filter((_, e) => /(^|\b)but\b/i.test(strip($(e).text()).toLowerCase()))
      .first();
    const purpose = purposeH4.length
      ? textOrNull(purposeH4.nextAll('p.value').first())
      : null;

    const getCardStat = (label: string) => {
      const h4 = $('h4.key')
        .filter((_, e) => eqLabel($(e).text(), label))
        .first();
      if (!h4.length) return null;
      return textOrNull(
        h4.closest('.l-grid-cell, .section, article').find('span').first(),
      );
    };
    let age_years = getCardStat("Âge de l'entreprise");
    if (age_years) {
      const m = age_years.match(/(\d+)/);
      if (m) age_years = `${m[1]} ans`;
    }
    const capital_chf = moneyFmt(getCardStat('Capital en CHF'));

    // Address
    let complement: string | null = null;
    let street: string | null = null;
    let postal_code: string | null = null;
    let city: string | null = null;
    const span = $('span.overview-item-text').first();
    if (span.length) {
      const parts = (span.html() || '')
        .split(/<br\s*\/?>/i)
        .map(htmlToText)
        .map(norm)
        .filter(Boolean)
        .filter((p) => !/^(voisinage|neighborhood|nachbarschaft)$/i.test(p));
      let cpLineIdx = -1;
      for (let i = 0; i < parts.length; i++) {
        if (/\b\d{4}\b/.test(parts[i])) {
          cpLineIdx = i;
          break;
        }
      }
      if (cpLineIdx >= 0) {
        const m = parts[cpLineIdx].match(/\b(\d{4})\b\s*(.+)?/);
        if (m) {
          postal_code = m[1] || null;
          city = norm(m[2] || '') || null;
        }
      }
      const isComp = (s: string) =>
        /^\s*(c\s*\/\s*o|c\s*\/|p\s*\/\s*a|care\s*of|bei)\b/i.test(strip(s));
      if (parts.length) {
        if (isComp(parts[0])) {
          complement = parts[0];
          street = parts.find((p, i) => i !== cpLineIdx && i !== 0) || null;
        } else {
          street = parts.find((_, i) => i !== cpLineIdx) || null;
        }
      }
    }
    // JSON-LD fallback
    if (!street && !postal_code && !city) {
      $('script[type="application/ld+json"]').each((_, s) => {
        try {
          const arr = [JSON.parse($(s).contents().text())].flat();
          for (const d of arr) {
            const a = d?.address;
            if (d?.['@type'] === 'Organization' && a) {
              street = a.streetAddress || street;
              postal_code = a.postalCode || postal_code;
              city = a.addressLocality || city;
            }
          }
        } catch {
          /* ignore */
        }
      });
    }

    const registration_date = byLabelValue(
      'Inscription au registre du commerce',
    );
    const legal_form = byLabelValue('Forme juridique');
    const domicile = byLabelValue("Siège social de l'entreprise");
    const commercial_register = byLabelValue('Registre du commerce');

    // IDE / TVA
    let ide_number: string | null = null;
    let tva_number: string | null = null;
    const ideH4 = $('h4.key')
      .filter((_, e) => /ide\s*\/?\s*tva/i.test(strip($(e).text())))
      .first();
    if (ideH4.length) {
      const p = ideH4.nextAll('p.value, p.val').first();
      if (p.length) {
        const parts = (p.html() || '')
          .split(/<br\s*\/?>/i)
          .map(htmlToText)
          .map(norm)
          .filter(Boolean);
        for (const part of parts) {
          if (/tva/i.test(part) || /mwst/i.test(part)) {
            tva_number = part.replace(/\s*(TVA|MWST)\s*$/i, '').trim();
          } else if (/^CHE[-\s][\d.]+/.test(part.trim())) {
            ide_number = part.trim();
          }
        }
        if (!ide_number && !tva_number && parts.length === 1) {
          ide_number = parts[0];
        }
      }
    }

    // Directors
    let directors: string[] = [];
    const dirBlock = $('h2')
      .filter((_, e) =>
        /(^|\b)direction\b/i.test(strip($(e).text()).toLowerCase()),
      )
      .first()
      .closest('.l-grid-cell, .section, article, div');
    if (dirBlock.length) {
      directors = Array.from(
        new Set(
          dirBlock
            .find('a[href*="/fr/person/"]')
            .map((_, a) => norm($(a).text()))
            .get()
            .filter(Boolean),
        ),
      );
    }

    // Last notification
    let last_notification: string | null = null;
    const lc = textOrNull($('.last-change a')) || textOrNull($('.last-change'));
    const mlc = lc && lc.match(/(\d{2}\.\d{2}\.\d{4})/);
    if (mlc) last_notification = mlc[1];

    // Source link points to the official UID registry (built from the IDE),
    // not the Moneyhouse page we scraped from.
    const ideMatch = (ide_number || '').match(/CHE-?\d{3}\.\d{3}\.\d{3}/);
    const cleanIde = ideMatch
      ? ideMatch[0].replace(/^CHE(?!-)/, 'CHE-')
      : null;
    const sourceUrl = cleanIde
      ? `https://www.uid.admin.ch/Detail.aspx?uid_id=${cleanIde}`
      : null;

    // Split "Avenue d'Aïre 7" -> street + number.
    let streetNumber: string | null = null;
    if (street) {
      const m = street.match(/^(.*?)[\s,]+(\d+\s?[a-zA-Z]?)$/);
      if (m) {
        street = m[1].trim();
        streetNumber = m[2].replace(/\s/g, '');
      }
    }
    let canton: string | null = null;
    let country: string | null = 'Suisse';
    // Enrich canton/country (+ fill address gaps) from the official UID registry.
    if (cleanIde) {
      try {
        const uid = await this.fetchUidDetails(cleanIde);
        canton = uid.canton ?? canton;
        if (uid.country) country = uid.country;
        if (!street && uid.street) street = uid.street;
        if (!streetNumber && uid.streetNumber) streetNumber = uid.streetNumber;
        if (!postal_code && uid.postalCode) postal_code = uid.postalCode;
        if (!city && uid.city) city = uid.city;
      } catch {
        /* best effort */
      }
    }

    return {
      sourceUrl,
      company_name,
      status,
      registry_number,
      sector,
      purpose,
      address: { complement, street, streetNumber, postal_code, city, canton, country },
      registry_info: {
        registration_date,
        legal_form,
        domicile,
        commercial_register,
        ide: ide_number,
        tva: tva_number,
      },
      stats: { age: age_years, capital: capital_chf },
      directors,
      last_notification,
    };
  }

  // ── uid.admin.ch (official IDE registry) ────────────────────
  // Extracts canton/country + structured address by matching field labels.
  private async fetchUidDetails(ide: string): Promise<{
    canton: string | null;
    country: string | null;
    street: string | null;
    streetNumber: string | null;
    postalCode: string | null;
    city: string | null;
  }> {
    const url = `https://www.uid.admin.ch/Detail.aspx?uid_id=${encodeURIComponent(ide)}&lang=fr`;
    const html = await this.getHtml(url, 15000);
    const $ = cheerio.load(html);
    const norm = (s?: string) => (s ?? '').replace(/\s+/g, ' ').trim();

    const getByLabel = (labels: string[]): string => {
      let val = '';
      const wanted = labels.map((l) => l.toLowerCase().replace(/:$/, ''));
      $('label, .control-label, .form-label, strong, td, span, div').each(
        (_, el) => {
          const t = norm($(el).text()).toLowerCase().replace(/:$/, '');
          if (!wanted.includes(t)) return;
          const cont = $(el).closest(
            '.row, .form-group, .mb-1, .mb-2, .mb-3, .col-md-9, tr',
          );
          let best = '';
          cont.find('div, span, p, td').each((_, e2) => {
            const x = norm($(e2).text());
            if (x && x.toLowerCase().replace(/:$/, '') !== t && x.length > best.length) {
              best = x;
            }
          });
          if (!best) best = norm($(el).next().text());
          if (best) {
            val = best;
            return false;
          }
        },
      );
      return val;
    };

    const canton = getByLabel(['Canton', 'Kanton']) || null;
    const pays = getByLabel(['Pays', 'Land']) || null;
    const rue = getByLabel(['Rue / Nr.', 'Rue', 'Strasse / Nr.']);
    const npa = getByLabel(['NPA / Localité', 'NPA/Localité', 'NPA']);

    let street: string | null = null;
    let streetNumber: string | null = null;
    if (rue) {
      const m = rue.match(/^(.*?)[\s,]+(\d+\s?[a-zA-Z]?)$/);
      if (m) {
        street = m[1].trim();
        streetNumber = m[2].replace(/\s/g, '');
      } else street = rue;
    }
    let postalCode: string | null = null;
    let city: string | null = null;
    if (npa) {
      const m = npa.match(/\b(\d{4})\b\s*(.+)?/);
      if (m) {
        postalCode = m[1];
        city = norm(m[2] || '') || null;
      }
    }
    return { canton, country: pays, street, streetNumber, postalCode, city };
  }
}
