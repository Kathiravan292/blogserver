import { SetMetadata } from '@nestjs/common';

import { UserRole } from '../enums/user-role.enum';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the given roles. Replaces the old `restrict([...])` middleware.
 * Must be combined with `JwtAuthGuard` so that `request.user` is populated.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
