import { Injectable, Logger } from '@nestjs/common';

// Resend email — stubbed. Mock mode when RESEND_API_KEY is absent.
@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');

  get configured(): boolean {
    return Boolean(process.env.RESEND_API_KEY);
  }

  async send(
    to: string,
    subject: string,
    html: string,
  ): Promise<{ mock: boolean }> {
    if (!this.configured) {
      this.logger.warn(`[MOCK EMAIL] to=${to} subject="${subject}"`);
      return { mock: true };
    }
    // TODO: integrate Resend SDK using env credentials.
    this.logger.log(`Sending email to ${to}`);
    return { mock: false };
  }
}
