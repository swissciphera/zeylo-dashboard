import { Global, Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { EmailService } from './email.service';
import { IpLookupService } from './ip-lookup.service';
import { ProxyService } from './proxy.service';
import { StripeService } from './stripe.service';
import { CaddyService } from './caddy.service';

@Global()
@Module({
  providers: [SmsService, EmailService, IpLookupService, ProxyService, StripeService, CaddyService],
  exports: [SmsService, EmailService, IpLookupService, ProxyService, StripeService, CaddyService],
})
export class IntegrationsModule {}
