import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PlatformController } from './platform.controller';
import { OverviewService } from './overview.service';
import { CompaniesAdminService } from './companies-admin.service';
import { PlatformSettingsService } from './platform-settings.service';
import { PlatformMiscService } from './platform-misc.service';
import { SystemHealthService } from './system-health.service';
import { SupportAccessService } from './support-access.service';
import { EmailTemplatesService } from './email-templates.service';
import { UsersAdminService } from './users-admin.service';

@Module({
  imports: [AuthModule], // for TokenService (password hashing + token revoke)
  controllers: [PlatformController],
  providers: [
    OverviewService,
    CompaniesAdminService,
    PlatformSettingsService,
    PlatformMiscService,
    SystemHealthService,
    SupportAccessService,
    EmailTemplatesService,
    UsersAdminService,
  ],
})
export class PlatformModule {}
