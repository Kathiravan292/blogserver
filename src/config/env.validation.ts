import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsPort, IsString, validateSync } from 'class-validator';

/**
 * Shape of the environment this API needs. Validated once at boot so a missing
 * `MONGO_URI` or `JWT_SECURE_CODE` fails loudly instead of at the first request.
 */
class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  MONGO_URI!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECURE_CODE!: string;

  @IsOptional()
  @IsPort()
  PORT?: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n  - ');

    throw new Error(`Invalid environment configuration:\n  - ${details}`);
  }

  return validated;
}
