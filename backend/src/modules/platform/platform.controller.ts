import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminJwtGuard } from '../../auth/guards/admin-jwt.guard';
import { CurrentAdmin } from '../../common/decorators/current-user.decorator';
import {
  ClientMeta,
  ClientMetaInfo,
} from '../../common/decorators/client-meta.decorator';
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
import {
  EmailTemplatesService,
  UpdateTemplateDto,
  TestTemplateDto,
} from './email-templates.service';
import {
  UsersAdminService,
  CreateUserDto,
  UpdateUserDto,
} from './users-admin.service';

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
    private readonly emailTemplates: EmailTemplatesService,
    private readonly users: UsersAdminService,
  ) {}

  // ── Users (client/patron accounts) ──────────────────────────
  @Get('users')
  listUsers(@Query('search') search?: string) {
    return this.users.list(search);
  }

  @Get('users/company-options')
  companyOptions() {
    return this.users.companyOptions();
  }

  @Post('users')
  createUser(
    @Body() dto: CreateUserDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @ClientMeta() meta: ClientMetaInfo,
  ) {
    return this.users.create(dto, admin.sub, meta);
  }

  @Put('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @ClientMeta() meta: ClientMetaInfo,
  ) {
    return this.users.update(id, dto, admin.sub, meta);
  }

  @Post('users/:id/block')
  blockUser(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @ClientMeta() meta: ClientMetaInfo,
  ) {
    return this.users.setBlocked(id, true, admin.sub, meta);
  }

  @Post('users/:id/unblock')
  unblockUser(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @ClientMeta() meta: ClientMetaInfo,
  ) {
    return this.users.setBlocked(id, false, admin.sub, meta);
  }

  @Delete('users/:id')
  deleteUser(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @ClientMeta() meta: ClientMetaInfo,
  ) {
    return this.users.remove(id, admin.sub, meta);
  }

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
    @ClientMeta() meta: ClientMetaInfo,
  ) {
    return this.companies.detail(id, admin.sub, admin.name, meta);
  }

  @Post('companies/:id/support-access')
  supportAccess(
    @Param('id') id: string,
    @Body() dto: SupportAccessDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @ClientMeta() meta: ClientMetaInfo,
  ) {
    return this.support.access(id, dto, admin.sub, admin.name, meta);
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

  // ── Email templates ─────────────────────────────────────────
  @Get('email-templates')
  listTemplates() {
    return this.emailTemplates.list();
  }

  @Put('email-templates/:key')
  updateTemplate(@Param('key') key: string, @Body() dto: UpdateTemplateDto) {
    return this.emailTemplates.update(key, dto);
  }

  @Post('email-templates/:key/reset')
  resetTemplate(@Param('key') key: string) {
    return this.emailTemplates.reset(key);
  }

  @Post('email-templates/:key/test')
  testTemplate(@Param('key') key: string, @Body() dto: TestTemplateDto) {
    return this.emailTemplates.test(key, dto);
  }
}
