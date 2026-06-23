import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ActorType } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

interface AccessPayload {
  actor: 'ADMIN' | 'CLIENT';
  sub: string;
  email: string;
  name: string;
  role: string;
  companyId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private secrets(actor: ActorType) {
    return actor === 'ADMIN'
      ? {
          access:
            process.env.JWT_ADMIN_ACCESS_SECRET ?? 'dev-admin-access',
          refresh:
            process.env.JWT_ADMIN_REFRESH_SECRET ?? 'dev-admin-refresh',
        }
      : {
          access:
            process.env.JWT_CLIENT_ACCESS_SECRET ?? 'dev-client-access',
          refresh:
            process.env.JWT_CLIENT_REFRESH_SECRET ?? 'dev-client-refresh',
        };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async issuePair(
    actor: ActorType,
    payload: AccessPayload,
  ): Promise<TokenPair> {
    const secrets = this.secrets(actor);
    const accessToken = await this.jwt.signAsync(payload, {
      secret: secrets.access,
      expiresIn: process.env.JWT_ACCESS_TTL ?? '900s',
    });

    // Opaque-ish refresh token: signed JWT carrying a random jti we persist.
    const jti = randomBytes(32).toString('hex');
    const refreshToken = await this.jwt.signAsync(
      { sub: payload.sub, actor: payload.actor, jti },
      {
        secret: secrets.refresh,
        expiresIn: process.env.JWT_REFRESH_TTL ?? '30d',
      },
    );

    const decoded: any = this.jwt.decode(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        actorType: actor,
        actorId: payload.sub,
        tokenHash: this.hashToken(jti),
        expiresAt: new Date(decoded.exp * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  // Verifies + rotates a refresh token. Returns the actorId on success.
  async verifyAndConsumeRefresh(
    actor: ActorType,
    refreshToken: string,
  ): Promise<string> {
    const secrets = this.secrets(actor);
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: secrets.refresh,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.actor !== actor) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(payload.jti);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        actorType: actor,
        actorId: payload.sub,
        tokenHash,
        revokedAt: null,
      },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    // Rotation: revoke the consumed token.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return payload.sub;
  }

  async revokeAll(actor: ActorType, actorId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { actorType: actor, actorId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  static async hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  static async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
