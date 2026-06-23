import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AppClientController } from './app-client.controller';
import { DashboardService } from './dashboard.service';
import { CompanyProfileService } from './company-profile.service';
import { EmployeesService } from './employees.service';
import { ServicesService } from './services.service';
import { ProjectsService } from './projects.service';
import { ContactsService } from './contacts.service';
import { SubscriptionService } from './subscription.service';
import { DomainService } from './domain.service';

@Module({
  imports: [AuthModule], // ProjectsService uses TokenService for SMS code hashing
  controllers: [AppClientController],
  providers: [
    DashboardService,
    CompanyProfileService,
    EmployeesService,
    ServicesService,
    ProjectsService,
    ContactsService,
    SubscriptionService,
    DomainService,
  ],
})
export class AppClientModule {}
