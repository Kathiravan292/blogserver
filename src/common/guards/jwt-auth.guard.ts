import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Validates the `Authorization: Bearer <token>` header via `JwtStrategy`.
 * Replaces the old `authentication` middleware.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException('Authentication Failed');
    }

    return user;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
