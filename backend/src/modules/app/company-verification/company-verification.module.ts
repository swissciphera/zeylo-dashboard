import { Module } from '@nestjs/common';
import { CompanyVerificationController } from './company-verification.controller';
import { CompanyVerificationService } from './company-verification.service';
import { CompanyScraperService } from './company-scraper.service';

@Module({
  controllers: [CompanyVerificationController],
  providers: [CompanyVerificationService, CompanyScraperService],
})
export class CompanyVerificationModule {}
