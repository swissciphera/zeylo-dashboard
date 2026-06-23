import { AdminRole, UserRole } from '@prisma/client';

export interface AdminPrincipal {
  actor: 'ADMIN';
  sub: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface ClientPrincipal {
  actor: 'CLIENT';
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
}

export type Principal = AdminPrincipal | ClientPrincipal;

// Express request augmented with the authenticated principal.
export interface AuthedRequest extends Express.Request {
  user?: Principal;
  ip?: string;
}
