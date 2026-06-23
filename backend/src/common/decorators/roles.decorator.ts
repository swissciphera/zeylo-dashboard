import { SetMetadata } from '@nestjs/common';
import { AdminRole, UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Restrict a route to specific roles (admin or client roles).
export const Roles = (...roles: Array<AdminRole | UserRole>) =>
  SetMetadata(ROLES_KEY, roles);
