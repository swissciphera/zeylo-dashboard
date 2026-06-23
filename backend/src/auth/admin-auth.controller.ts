import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminAuthService } from './admin-auth.service';
import { LoginDto, RefreshDto, SetupAdminDto } from './dto/auth.dto';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { CurrentAdmin } from '../common/decorators/current-user.decorator';
import { AdminPrincipal } from '../common/types';

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  // First-run setup status (used by /admin frontend to decide setup vs login)
  @Get('setup/status')
  async setupStatus() {
    return { needsSetup: await this.auth.needsSetup() };
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('setup')
  async setup(@Body() dto: SetupAdminDto, @Ip() ip: string) {
    return this.auth.setupFirstAdmin(dto, ip);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('auth/login')
  async login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.auth.login(dto, ip);
  }

  @HttpCode(200)
  @Post('auth/refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @UseGuards(AdminJwtGuard)
  @HttpCode(200)
  @Post('auth/logout')
  async logout(@CurrentAdmin() admin: AdminPrincipal) {
    return this.auth.logout(admin.sub);
  }

  @UseGuards(AdminJwtGuard)
  @Get('auth/me')
  async me(@CurrentAdmin() admin: AdminPrincipal) {
    return {
      id: admin.sub,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
  }
}
