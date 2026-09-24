/**
 * Envelope shared by every endpoint. `data` is named per-endpoint (`blogs`, `users`,
 * `profileDetails`, ...) to stay compatible with the existing client, so each
 * controller declares its own response type on top of these primitives.
 */
export interface ApiResponse {
  message: string;
  success: boolean;
}

/** `POST /auth/register` historically returned `status` instead of `success`. */
export interface ApiStatusResponse {
  message: string;
  status: boolean;
}

export interface ApiDataResponse<T> extends ApiResponse {
  data: T;
}
