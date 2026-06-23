import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { OverviewService } from './overview.service';
import { CompaniesAdminService } from './companies-admin.service';
import { PlatformSettingsService } from './platform-settings.service';
import { PlatformMiscService } from './platform-misc.service';
import { SystemHealthService } from './system-health.service';
import { SupportAccessService } from './support-access.service';

@Module({
  controllers: [PlatformController],
  providers: [
    OverviewService,
    CompaniesAdminService,
    PlatformSettingsService,
    PlatformMiscService,
    SystemHealthService,
    SupportAccessService,
  ],
})
export class PlatformModule {}
