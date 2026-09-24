import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { User } from '../../modules/users/schemas/user.schema';

/** Data fields of a user document — deliberately excludes Mongoose document methods. */
export type UserField = keyof User | '_id';

/**
 * Injects the authenticated user resolved by `JwtStrategy`, or one of its fields.
 *
 * @example
 * getProfile(@CurrentUser('_id') userId: string) {}
 * create(@CurrentUser() author: UserDocument) {}
 */
export const CurrentUser = createParamDecorator(
  (property: UserField | undefined, context: ExecutionContext): unknown => {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return property === undefined ? user : user[property];
  },
);
