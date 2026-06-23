import { Injectable, Logger } from '@nestjs/common';

// Twilio SMS — stubbed. When TWILIO_* env vars are absent we run in mock mode
// (codes are logged, never sent). Wire the real SDK here later.
@Injectable()
export class SmsService {
  private readonly logger = new Logger('SmsService');

  get configured(): boolean {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
    );
  }

  async send(to: string, body: string): Promise<{ mock: boolean }> {
    if (!this.configured) {
      this.logger.warn(`[MOCK SMS] to=${to} :: ${body}`);
      return { mock: true };
    }
    // TODO: integrate Twilio SDK using env credentials.
    this.logger.log(`Sending SMS to ${to}`);
    return { mock: false };
  }
}
