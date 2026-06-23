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
import { ContactType, ProjectStatus } from '@prisma/client';
import { ClientJwtGuard } from '../../auth/guards/client-jwt.guard';
import { CurrentCompany } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';
import {
  CompanyProfileService,
  UpdateCompanyDto,
} from './company-profile.service';
import {
  EmployeesService,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  CreateNoteDto,
  CreateLeaveDto,
} from './employees.service';
import {
  ServicesService,
  CreateServiceDto,
  UpdateServiceDto,
} from './services.service';
import {
  ProjectsService,
  CreateProjectDto,
  UpdateProjectStatusDto,
  AssignEmployeeDto,
  TempAccessDto,
} from './projects.service';
import { ContactsService, ContactDto } from './contacts.service';
import { SubscriptionService } from './subscription.service';

// All tenant endpoints live under /api/app and are scoped to the caller's company.
@UseGuards(ClientJwtGuard)
@Controller('app')
export class AppClientController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly company: CompanyProfileService,
    private readonly employees: EmployeesService,
    private readonly services: ServicesService,
    private readonly projects: ProjectsService,
    private readonly contacts: ContactsService,
    private readonly subscription: SubscriptionService,
  ) {}

  // ── Subscription ────────────────────────────────────────────
  @Get('subscription')
  getSubscription(@CurrentCompany() companyId: string) {
    return this.subscription.get(companyId);
  }

  @Post('subscription/free')
  selectFree(@CurrentCompany() companyId: string) {
    return this.subscription.selectFree(companyId);
  }

  @Post('subscription/trial')
  startTrial(@CurrentCompany() companyId: string) {
    return this.subscription.startTrial(companyId);
  }

  @Post('subscription/upgrade')
  upgrade(@CurrentCompany() companyId: string) {
    return this.subscription.upgrade(companyId);
  }

  @Post('subscription/cancel')
  cancelSubscription(@CurrentCompany() companyId: string) {
    return this.subscription.cancel(companyId);
  }

  // ── Dashboard ───────────────────────────────────────────────
  @Get('dashboard')
  getDashboard(@CurrentCompany() companyId: string) {
    return this.dashboard.summary(companyId);
  }

  // ── Company profile & referral ──────────────────────────────
  @Get('company')
  getCompany(@CurrentCompany() companyId: string) {
    return this.company.get(companyId);
  }

  @Put('company')
  updateCompany(
    @CurrentCompany() companyId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.company.update(companyId, dto);
  }

  @Get('referral')
  referral(@CurrentCompany() companyId: string) {
    return this.company.referralProgram(companyId);
  }

  // ── Employees ───────────────────────────────────────────────
  @Get('employees')
  listEmployees(@CurrentCompany() companyId: string) {
    return this.employees.list(companyId);
  }

  @Get('employees/:id')
  getEmployee(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.employees.detail(companyId, id);
  }

  @Post('employees')
  createEmployee(
    @CurrentCompany() companyId: string,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employees.create(companyId, dto);
  }

  @Put('employees/:id')
  updateEmployee(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employees.update(companyId, id, dto);
  }

  @Delete('employees/:id')
  removeEmployee(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.employees.remove(companyId, id);
  }

  @Post('employees/:id/notes')
  addNote(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.employees.addNote(companyId, id, dto);
  }

  @Post('employees/:id/leaves')
  addLeave(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: CreateLeaveDto,
  ) {
    return this.employees.addLeave(companyId, id, dto);
  }

  // ── Services ────────────────────────────────────────────────
  @Get('services')
  listServices(@CurrentCompany() companyId: string) {
    return this.services.list(companyId);
  }

  @Post('services')
  createService(
    @CurrentCompany() companyId: string,
    @Body() dto: CreateServiceDto,
  ) {
    return this.services.create(companyId, dto);
  }

  @Put('services/:id')
  updateService(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.services.update(companyId, id, dto);
  }

  @Delete('services/:id')
  removeService(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.services.remove(companyId, id);
  }

  // ── Projects / chantiers ────────────────────────────────────
  @Get('projects')
  listProjects(
    @CurrentCompany() companyId: string,
    @Query('status') status?: ProjectStatus,
  ) {
    return this.projects.list(companyId, status);
  }

  @Get('projects/:id')
  getProject(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.projects.detail(companyId, id);
  }

  @Post('projects')
  createProject(
    @CurrentCompany() companyId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projects.create(companyId, dto);
  }

  @Put('projects/:id/status')
  updateProjectStatus(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectStatusDto,
  ) {
    return this.projects.updateStatus(companyId, id, dto);
  }

  @Post('projects/:id/assign')
  assign(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: AssignEmployeeDto,
  ) {
    return this.projects.assign(companyId, id, dto);
  }

  @Delete('projects/:id/assign/:employeeId')
  unassign(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.projects.unassign(companyId, id, employeeId);
  }

  @Post('projects/:id/temp-access')
  tempAccess(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: TempAccessDto,
  ) {
    return this.projects.createTempAccess(companyId, id, dto);
  }

  @Post('projects/:id/rating-link')
  ratingLink(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.projects.createRatingLink(companyId, id);
  }

  // ── Contacts ────────────────────────────────────────────────
  @Get('contacts')
  listContacts(
    @CurrentCompany() companyId: string,
    @Query('type') type?: ContactType,
  ) {
    return this.contacts.list(companyId, type);
  }

  @Get('contacts/:id')
  getContact(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.contacts.detail(companyId, id);
  }

  @Post('contacts')
  createContact(@CurrentCompany() companyId: string, @Body() dto: ContactDto) {
    return this.contacts.create(companyId, dto);
  }

  @Put('contacts/:id')
  updateContact(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: ContactDto,
  ) {
    return this.contacts.update(companyId, id, dto);
  }

  @Delete('contacts/:id')
  removeContact(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.contacts.remove(companyId, id);
  }
}
