import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createHash, createHmac } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { AppConfig } from '../config/app.config';

const signatures: Array<{ ext: string; mime: string; check: (b: Buffer) => boolean }> = [
  {
    ext: 'jpg',
    mime: 'image/jpeg',
    check: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: 'png',
    mime: 'image/png',
    check: (b) =>
      b.length > 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    ext: 'gif',
    mime: 'image/gif',
    check: (b) =>
      b.length > 6 &&
      b[0] === 0x47 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x38,
  },
  {
    ext: 'webp',
    mime: 'image/webp',
    check: (b) =>
      b.length > 12 &&
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
];

@Injectable()
export class StorageService {
  constructor(private readonly config: AppConfig) {}

  async save(
    buffer: Buffer,
    originalName: string,
  ): Promise<{ url: string; width?: number; height?: number; size: number }> {
    if (buffer.length > this.config.maxUploadBytes) {
      throw new BadRequestException('File is too large');
    }

    const sig = signatures.find((s) => s.check(buffer));
    if (!sig) {
      throw new BadRequestException('Only JPEG, PNG, GIF and WebP images are allowed');
    }

    const name = `${randomUUID()}.${sig.ext}`;

    if (this.config.storageDriver === 's3') {
      const url = await this.putObject(name, buffer, sig.mime);
      return { url, size: buffer.length };
    }

    const dir = join(process.cwd(), this.config.uploadDir, 'images');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), buffer);
    return { url: `/api/uploads/images/${name}`, size: buffer.length };
  }

  async resolve(filename: string): Promise<{ path: string } | null> {
    if (this.config.storageDriver !== 'local') return null;
    const dir = join(process.cwd(), this.config.uploadDir, 'images');
    const file = join(dir, filename);
    if (!existsSync(file)) return null;
    return { path: file };
  }

  private async putObject(key: string, body: Buffer, contentType: string): Promise<string> {
    const s3 = this.config.s3;
    const bucket = s3.bucket;
    if (!bucket) throw new BadRequestException('S3 is not configured');

    const endpoint = new URL(
      s3.endpoint.startsWith('http') ? s3.endpoint : `https://${s3.endpoint}`,
    );
    const host = endpoint.host;
    const path = `/${key}`;
    const method = 'PUT';
    const region = s3.region;
    const service = 's3';
    const now = new Date();

    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const payloadHash = createHash('sha256').update(body).digest('hex');

    const canonicalHeaders = [
      `content-type:${contentType}`,
      `host:${host}`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
    ].join('\n');

    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [
      method,
      path,
      '',
      canonicalHeaders,
      '',
      signedHeaders,
      payloadHash,
    ].join('\n');

    const scope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const hmac = (key: Buffer, value: string) => createHmac('sha256', key).update(value).digest();
    const kDate = hmac(Buffer.from(`AWS4${s3.secretAccessKey}`, 'utf8'), dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    const kSigning = hmac(kService, 'aws4_request');
    const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const authorization = `AWS4-HMAC-SHA256 Credential=${s3.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(`${endpoint.origin}${path}`, {
      method,
      headers: {
        'Content-Type': contentType,
        Host: host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        Authorization: authorization,
      },
      body: new Uint8Array(body),
    });

    if (!res.ok) {
      throw new BadRequestException(`Failed to upload image (${res.status})`);
    }

    if (s3.publicUrl) {
      return `${s3.publicUrl.replace(/\/$/, '')}/${key}`;
    }
    return `${endpoint.origin}/${bucket}/${key}`;
  }
}
