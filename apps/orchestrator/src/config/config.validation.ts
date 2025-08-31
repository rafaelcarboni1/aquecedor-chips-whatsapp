import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsOptional, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  NODE_ENV: string = 'development';

  @IsNumber()
  PORT: number = 3001;

  // Supabase
  @IsString()
  SUPABASE_URL: string;

  @IsString()
  SUPABASE_ANON_KEY: string;

  @IsString()
  SUPABASE_SERVICE_ROLE_KEY: string;

  // Redis
  @IsString()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  REDIS_PORT: number = 6379;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  // Evolution API
  @IsOptional()
  @IsString()
  EVOLUTION_API_URL?: string;

  @IsOptional()
  @IsString()
  EVOLUTION_API_KEY?: string;

  // JWT
  @IsString()
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string = '7d';

  // OpenAI
  @IsOptional()
  @IsString()
  OPENAI_API_KEY?: string;

  // Webhook
  @IsOptional()
  @IsString()
  WEBHOOK_SECRET?: string;
}

export function configValidation(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation error: ${errors
        .map((error) => Object.values(error.constraints || {}).join(', '))
        .join('; ')}`
    );
  }

  return validatedConfig;
}