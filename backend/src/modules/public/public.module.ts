import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { CompanyVerificationModule } from '../app/company-verification/company-verification.module';

@Module({
  imports: [CompanyVerificationModule], // for CompanyScraperService
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
