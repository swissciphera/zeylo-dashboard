import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminAuthService } from './admin-auth.service';
import { ClientAuthService } from './client-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { ClientAuthController } from './client-auth.controller';
import { TokenService } from './token.service';
import { BruteForceService } from './brute-force.service';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { ClientJwtStrategy } from './strategies/client-jwt.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AdminAuthController, ClientAuthController],
  providers: [
    AdminAuthService,
    ClientAuthService,
    TokenService,
    BruteForceService,
    AdminJwtStrategy,
    ClientJwtStrategy,
  ],
  exports: [TokenService],
})
export class AuthModule {}
