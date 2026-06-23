import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ClientPrincipal } from '../../common/types';

// Validates client/patron access tokens. The `actor` claim MUST be CLIENT and
// the token MUST carry a companyId for tenant scoping.
@Injectable()
export class ClientJwtStrategy extends PassportStrategy(Strategy, 'client-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_CLIENT_ACCESS_SECRET ?? 'dev-client-access',
    });
  }

  async validate(payload: any): Promise<ClientPrincipal> {
    if (payload?.actor !== 'CLIENT' || !payload?.companyId) {
      throw new UnauthorizedException('Invalid token audience');
    }
    return {
      actor: 'CLIENT',
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      companyId: payload.companyId,
    };
  }
}
