import { Global, Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { EmailService } from './email.service';
import { IpLookupService } from './ip-lookup.service';
import { ProxyService } from './proxy.service';

@Global()
@Module({
  providers: [SmsService, EmailService, IpLookupService, ProxyService],
  exports: [SmsService, EmailService, IpLookupService, ProxyService],
})
export class IntegrationsModule {}
