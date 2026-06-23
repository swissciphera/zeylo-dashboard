import { Module } from '@nestjs/common';
import { CompanyVerificationController } from './company-verification.controller';
import { CompanyVerificationService } from './company-verification.service';
import { CompanyScraperService } from './company-scraper.service';
import { AutoVerificationService } from './auto-verification.service';

@Module({
  controllers: [CompanyVerificationController],
  providers: [
    CompanyVerificationService,
    CompanyScraperService,
    AutoVerificationService,
  ],
  exports: [CompanyScraperService],
})
export class CompanyVerificationModule {}
