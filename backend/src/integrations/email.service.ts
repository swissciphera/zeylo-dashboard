import { Injectable, Logger } from '@nestjs/common';

// Resend email integration. Mock mode when RESEND_API_KEY is absent.
@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');

  get configured(): boolean {
    return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  }

  async send(
    to: string,
    subject: string,
    html: string,
  ): Promise<{ mock: boolean; id?: string }> {
    if (!process.env.RESEND_API_KEY) {
      this.logger.warn(`[MOCK EMAIL] to=${to} subject="${subject}"`);
      return { mock: true };
    }
    if (!process.env.RESEND_FROM_EMAIL) {
      throw new Error(
        "RESEND_FROM_EMAIL n'est pas configuré (adresse d'expéditeur).",
      );
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.logger.error(`Resend error ${res.status}: ${detail}`);
      throw new Error(`Échec de l'envoi Resend (${res.status}). ${detail}`);
    }

    const data: any = await res.json().catch(() => ({}));
    return { mock: false, id: data?.id };
  }
}
