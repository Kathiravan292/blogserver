import { Request } from 'express';

import { UserDocument } from '../../modules/users/schemas/user.schema';

/**
 * An Express request after `JwtAuthGuard` has run: `user` is the hydrated user
 * document loaded from the token's `id` claim.
 */
export interface AuthenticatedRequest extends Request {
  user: UserDocument;
}
