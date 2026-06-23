import { Global, Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { EmailService } from './email.service';
import { IpLookupService } from './ip-lookup.service';

@Global()
@Module({
  providers: [SmsService, EmailService, IpLookupService],
  exports: [SmsService, EmailService, IpLookupService],
})
export class IntegrationsModule {}
