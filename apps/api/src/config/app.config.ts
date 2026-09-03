import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService) {}

  get port(): number {
    return this.config.get<number>('PORT') ?? 3000;
  }

  get allowedOrigins(): string[] | string {
    const raw = this.config.get<string>('ALLOWED_ORIGINS');
    if (!raw || raw === '*') return '*';
    return raw.split(',').map((s) => s.trim());
  }

  get accessSecret(): string {
    return this.config.get<string>('JWT_ACCESS_SECRET') ?? '';
  }

  get refreshSecret(): string {
    return this.config.get<string>('JWT_REFRESH_SECRET') ?? '';
  }

  get accessTtl(): string {
    return this.config.get<string>('JWT_ACCESS_TTL') ?? '15m';
  }

  get refreshTtl(): string {
    return this.config.get<string>('JWT_REFRESH_TTL') ?? '30d';
  }

  get storageDriver(): 'local' | 's3' {
    return (this.config.get<string>('STORAGE_DRIVER') as 'local' | 's3') ?? 'local';
  }

  get uploadDir(): string {
    return this.config.get<string>('UPLOAD_DIR') ?? './uploads';
  }

  get maxUploadBytes(): number {
    return this.config.get<number>('MAX_UPLOAD_BYTES') ?? 10 * 1024 * 1024;
  }

  get s3(): {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    publicUrl: string;
  } {
    return {
      endpoint: this.config.get<string>('S3_ENDPOINT') ?? '',
      region: this.config.get<string>('S3_REGION') ?? 'auto',
      bucket: this.config.get<string>('S3_BUCKET') ?? '',
      accessKeyId: this.config.get<string>('S3_ACCESS_KEY_ID') ?? '',
      secretAccessKey: this.config.get<string>('S3_SECRET_ACCESS_KEY') ?? '',
      publicUrl: this.config.get<string>('S3_PUBLIC_URL') ?? '',
    };
  }
}
