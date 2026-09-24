/**
 * Claims embedded in the signed access token. The shape is kept identical to the
 * previous Express implementation so tokens issued before the migration stay valid.
 */
export interface JwtPayload {
  id: string;
  userName: string;
  iat?: number;
  exp?: number;
}
