import { plainToInstance } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsOptional()
  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_TTL: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_TTL: string;

  @IsOptional()
  @IsInt()
  PORT: number;

  @IsOptional()
  @IsString()
  ALLOWED_ORIGINS: string;

  @IsOptional()
  @IsIn(['local', 's3'])
  STORAGE_DRIVER: string;

  @IsOptional()
  @IsString()
  UPLOAD_DIR: string;

  @IsOptional()
  @IsInt()
  MAX_UPLOAD_BYTES: number;

  @IsOptional()
  @IsString()
  S3_ENDPOINT: string;

  @IsOptional()
  @IsString()
  S3_REGION: string;

  @IsOptional()
  @IsString()
  S3_BUCKET: string;

  @IsOptional()
  @IsString()
  S3_ACCESS_KEY_ID: string;

  @IsOptional()
  @IsString()
  S3_SECRET_ACCESS_KEY: string;

  @IsOptional()
  @IsString()
  S3_PUBLIC_URL: string;
}

export function configValidation(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
  });

  if (errors.length > 0) {
    throw new Error(
      errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('; '),
    );
  }

  return config;
}
