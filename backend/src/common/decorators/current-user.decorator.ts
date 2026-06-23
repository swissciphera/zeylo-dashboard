import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminPrincipal, ClientPrincipal, Principal } from '../types';

// Returns the full authenticated principal (admin or client).
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Principal => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);

// Returns only the client principal (used in /app routes).
export const CurrentClient = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientPrincipal => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);

// Convenience: the tenant companyId of the current client.
export const CurrentCompany = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    return req.user?.companyId;
  },
);

// Returns only the admin principal (used in /admin routes).
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminPrincipal => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
