import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserRole } from '../enums/user-role.enum';
import { RolesGuard } from './roles.guard';

const contextFor = (role?: UserRole): ExecutionContext =>
  ({
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const guardWithRequiredRoles = (roles: UserRole[] | undefined) => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
    return new RolesGuard(reflector);
  };

  it('allows a route with no @Roles() decorator', () => {
    expect(guardWithRequiredRoles(undefined).canActivate(contextFor(UserRole.USER))).toBe(true);
  });

  it('allows a user whose role is listed', () => {
    const guard = guardWithRequiredRoles([UserRole.ADMIN]);

    expect(guard.canActivate(contextFor(UserRole.ADMIN))).toBe(true);
  });

  it('blocks a user whose role is not listed', () => {
    const guard = guardWithRequiredRoles([UserRole.ADMIN]);

    expect(() => guard.canActivate(contextFor(UserRole.USER))).toThrow(ForbiddenException);
  });

  it('blocks an unauthenticated request', () => {
    const guard = guardWithRequiredRoles([UserRole.USER]);

    expect(() => guard.canActivate(contextFor(undefined))).toThrow(ForbiddenException);
  });
});
