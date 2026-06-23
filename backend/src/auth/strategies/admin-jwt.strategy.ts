import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminPrincipal } from '../../common/types';

// Validates admin access tokens. The `actor` claim MUST be ADMIN so that a
// client token can never authenticate against /admin routes.
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ADMIN_ACCESS_SECRET ?? 'dev-admin-access',
    });
  }

  async validate(payload: any): Promise<AdminPrincipal> {
    if (payload?.actor !== 'ADMIN') {
      throw new UnauthorizedException('Invalid token audience');
    }
    return {
      actor: 'ADMIN',
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  }
}
