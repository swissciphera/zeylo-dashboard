import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  PublicService,
  VerifyAccessDto,
  SubmitRatingDto,
} from './public.service';

// Token-based public endpoints — no authentication, rate-limited.
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('access/:token')
  accessInfo(@Param('token') token: string) {
    return this.publicService.accessInfo(token);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('access/:token/verify')
  verifyAccess(@Param('token') token: string, @Body() dto: VerifyAccessDto) {
    return this.publicService.verifyAccess(token, dto);
  }

  @Get('rate/:token')
  ratingInfo(@Param('token') token: string) {
    return this.publicService.ratingInfo(token);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('rate/:token')
  submitRating(@Param('token') token: string, @Body() dto: SubmitRatingDto) {
    return this.publicService.submitRating(token, dto);
  }
}
