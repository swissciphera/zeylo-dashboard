import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ClientMeta,
  ClientMetaInfo,
} from '../common/decorators/client-meta.decorator';
import { Throttle } from '@nestjs/throttler';
import { ClientAuthService } from './client-auth.service';
import { LoginDto, RefreshDto, RegisterClientDto } from './dto/auth.dto';
import { ClientJwtGuard } from './guards/client-jwt.guard';
import { CurrentClient } from '../common/decorators/current-user.decorator';
import { ClientPrincipal } from '../common/types';

@Controller('auth')
export class ClientAuthController {
  constructor(private readonly auth: ClientAuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterClientDto,
    @ClientMeta() meta: ClientMetaInfo,
  ) {
    return this.auth.register(dto, meta);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @ClientMeta() meta: ClientMetaInfo) {
    return this.auth.login(dto, meta);
  }

  @HttpCode(200)
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @UseGuards(ClientJwtGuard)
  @HttpCode(200)
  @Post('logout')
  async logout(@CurrentClient() user: ClientPrincipal) {
    return this.auth.logout(user.sub);
  }

  @UseGuards(ClientJwtGuard)
  @Get('me')
  async me(@CurrentClient() user: ClientPrincipal) {
    return {
      id: user.sub,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
    };
  }
}
