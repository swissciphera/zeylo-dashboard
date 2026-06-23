import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ClientJwtGuard } from '../../../auth/guards/client-jwt.guard';
import { CurrentCompany } from '../../../common/decorators/current-user.decorator';
import {
  CompanyVerificationService,
  SearchCompanyDto,
  CompanyUrlDto,
} from './company-verification.service';

@UseGuards(ClientJwtGuard)
@Controller('app/company-verification')
export class CompanyVerificationController {
  constructor(private readonly service: CompanyVerificationService) {}

  // Scraping is rate-limited to stay friendly with the proxy + sources.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('search')
  search(@Body() dto: SearchCompanyDto) {
    return this.service.search(dto.query);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('details')
  details(@Body() dto: CompanyUrlDto) {
    return this.service.details(dto.url);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('save')
  save(@CurrentCompany() companyId: string, @Body() dto: CompanyUrlDto) {
    return this.service.saveToCompany(companyId, dto.url);
  }
}
