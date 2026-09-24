export interface AppConfig {
  port: number;
  mongoUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigins: string[];
}

const DEFAULT_CORS_ORIGINS = ['http://localhost:5173', 'https://blogclient-chi.vercel.app'];

/**
 * Turns the raw environment into a typed, namespaced config object reachable as
 * `configService.get('app.jwtSecret')`.
 */
export default (): { app: AppConfig } => ({
  app: {
    port: Number.parseInt(process.env.PORT ?? '8000', 10),
    mongoUri: process.env.MONGO_URI as string,
    jwtSecret: process.env.JWT_SECURE_CODE as string,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '9d',
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
          .map((origin) => origin.trim())
          .filter(Boolean)
      : DEFAULT_CORS_ORIGINS,
  },
});
