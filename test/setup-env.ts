/**
 * `ConfigModule.forRoot({ validate })` runs when `app.module.ts` is imported, so the
 * environment has to exist before any spec pulls that module in. Jest loads this via
 * `setupFiles`, which runs ahead of the test file's imports.
 */
process.env.MONGO_URI ??= 'mongodb://127.0.0.1:27017/blog-test';
process.env.JWT_SECURE_CODE ??= 'test-secret';
process.env.JWT_EXPIRES_IN ??= '9d';
process.env.PORT ??= '8000';
