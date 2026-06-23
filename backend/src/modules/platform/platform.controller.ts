import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminJwtGuard } from '../../auth/guards/admin-jwt.guard';
import { CurrentAdmin } from '../../common/decorators/current-user.decorator';
import { AdminPrincipal } from '../../common/types';
import { OverviewService } from './overview.service';
import { CompaniesAdminService } from './companies-admin.service';
import {
  PlatformSettingsService,
  UpdateSettingsDto,
  TestEmailDto,
} from './platform-settings.service';
import { PlatformMiscService } from './platform-misc.service';
import { SystemHealthService } from './system-health.service';
import { SupportAccessService, SupportAccessDto } from './support-access.service';

// All platform/admin endpoints live under /api/admin and require an admin token.
@UseGuards(AdminJwtGuard)
@Controller('admin')
export class PlatformController {
  constructor(
    private readonly overview: OverviewService,
    private readonly companies: CompaniesAdminService,
    private readonly settings: PlatformSettingsService,
    private readonly misc: PlatformMiscService,
    private readonly health: SystemHealthService,
    private readonly support: SupportAccessService,
  ) {}

  @Get('overview')
  getOverview() {
    return this.overview.getStats();
  }

  @Get('companies')
  listCompanies(@Query('search') search?: string) {
    return this.companies.list(search);
  }

  @Get('companies/:id')
  companyDetail(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
  ) {
    return this.companies.detail(id, admin.sub, admin.name);
  }

  @Post('companies/:id/support-access')
  supportAccess(
    @Param('id') id: string,
    @Body() dto: SupportAccessDto,
    @CurrentAdmin() admin: AdminPrincipal,
  ) {
    return this.support.access(id, dto, admin.sub, admin.name);
  }

  @Get('billing')
  billing() {
    return this.misc.billing();
  }

  @Get('referrals')
  referrals() {
    return this.misc.referrals();
  }

  @Get('audit')
  audit(@Query('companyId') companyId?: string) {
    return this.misc.auditLog(companyId);
  }

  @Get('system-health')
  systemHealth() {
    return this.health.status();
  }

  @Get('settings')
  getSettings() {
    return this.settings.get();
  }

  @Put('settings')
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }

  @Post('settings/test-email')
  testEmail(@Body() dto: TestEmailDto) {
    return this.settings.sendTestEmail(dto.to);
  }
}
