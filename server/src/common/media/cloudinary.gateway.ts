import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { MediaUploadFile } from './private-media.storage';
import { MEDIA_TYPES } from './cloud-media.dto';

const PATH =
  /^gora\/(stories|reels|photos)\/[a-f0-9-]{36}\.(jpg|png|webp|gif|mp4|webm)$/;

@Injectable()
export class CloudinaryGateway {
  private readonly logger = new Logger(CloudinaryGateway.name);
  constructor(private readonly config: ConfigService) {}

  enabled(): boolean {
    const values = [
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
    ].map((key) => this.config.get<string>(key)?.trim());
    if (values.some(Boolean) && !values.every(Boolean))
      throw new ServiceUnavailableException(
        'Complete the Cloudinary server configuration.',
      );
    return values.every(Boolean);
  }

  private credentials() {
    if (!this.enabled())
      throw new ServiceUnavailableException('Cloudinary is not configured.');
    const cloud_name = this.config
      .getOrThrow<string>('CLOUDINARY_CLOUD_NAME')
      .trim();
    if (!/^[a-z0-9_-]+$/i.test(cloud_name))
      throw new ServiceUnavailableException(
        'Invalid Cloudinary server configuration.',
      );
    return {
      cloud_name,
      api_key: this.config.getOrThrow<string>('CLOUDINARY_API_KEY').trim(),
      api_secret: this.config
        .getOrThrow<string>('CLOUDINARY_API_SECRET')
        .trim(),
      secure: true,
    };
  }

  private asset(pathname: string) {
    const match = PATH.exec(pathname);
    if (!match) throw new NotFoundException('Media not found.');
    const format = match[2];
    const resource_type: 'video' | 'image' = ['mp4', 'webm'].includes(format)
      ? 'video'
      : 'image';
    return {
      public_id: pathname.slice(0, -format.length - 1),
      format,
      resource_type,
      type: 'authenticated',
    };
  }

  ticket(pathname: string) {
    const credentials = this.credentials();
    const asset = this.asset(pathname);
    const params = {
      timestamp: Math.floor(Date.now() / 1000),
      public_id: asset.public_id,
      type: asset.type,
      overwrite: 'false',
      allowed_formats: asset.format,
    };
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${credentials.cloud_name}/${asset.resource_type}/upload`,
      parameters: {
        ...params,
        api_key: credentials.api_key,
        signature: cloudinary.utils.api_sign_request(
          params,
          credentials.api_secret,
        ),
      },
    };
  }

  async put(pathname: string, file: MediaUploadFile) {
    const asset = this.asset(pathname);
    try {
      await cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        {
          ...this.credentials(),
          public_id: asset.public_id,
          resource_type: asset.resource_type,
          type: asset.type,
          overwrite: false,
          allowed_formats: [asset.format],
          timeout: 20_000,
        },
      );
    } catch (error) {
      const status =
        error &&
        typeof error === 'object' &&
        'http_code' in error &&
        typeof error.http_code === 'number'
          ? error.http_code
          : undefined;
      // SDK error text can contain credentials or signed URLs. Log only a status.
      this.logger.error(
        status === 401 || status === 403
          ? 'Cloudinary upload rejected server credentials. Verify CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.'
          : `Cloudinary upload failed${status ? ` (HTTP ${status})` : ''}. Check storage availability and limits.`,
      );
      throw new ServiceUnavailableException(
        'Cloudinary upload failed. Please try again.',
      );
    }
  }

  private download(pathname: string) {
    const asset = this.asset(pathname);
    // Original authenticated CDN files support byte ranges without generating a
    // transformed video. This signed URL stays on the server, behind GORA auth.
    return cloudinary.url(asset.public_id, {
      ...this.credentials(),
      resource_type: asset.resource_type,
      type: asset.type,
      format: asset.format,
      sign_url: true,
    });
  }

  async head(pathname: string) {
    try {
      const response = await fetch(this.download(pathname), {
        method: 'HEAD',
        signal: AbortSignal.timeout(30_000),
      });
      const length = response.headers.get('content-length');
      const size = Number(length);
      const contentType = response.headers.get('content-type')?.split(';')[0];
      if (
        !response.ok ||
        !length ||
        !Number.isSafeInteger(size) ||
        size <= 0 ||
        !contentType ||
        !(contentType in MEDIA_TYPES)
      )
        throw new Error('Unexpected asset');
      return { url: this.download(pathname), size, contentType };
    } catch {
      throw new ServiceUnavailableException(
        'Unable to verify the Cloudinary upload. Please retry.',
      );
    }
  }

  async get(pathname: string, range?: string) {
    const response = await fetch(this.download(pathname), {
      headers: range ? { Range: range } : undefined,
      signal: AbortSignal.timeout(30_000),
    }).catch(() => {
      throw new ServiceUnavailableException(
        'Media storage is temporarily unavailable.',
      );
    });
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      if (response.status === 404)
        throw new NotFoundException('Media not found.');
      throw new ServiceUnavailableException(
        'Media storage is temporarily unavailable.',
      );
    }
    return {
      statusCode: 200 as const,
      headers: response.headers,
      stream: response.body,
    };
  }

  async remove(pathname: string) {
    const asset = this.asset(pathname);
    try {
      await cloudinary.uploader.destroy(asset.public_id, {
        ...this.credentials(),
        resource_type: asset.resource_type,
        type: asset.type,
        invalidate: true,
      });
    } catch {
      throw new ServiceUnavailableException(
        'Unable to remove media from storage.',
      );
    }
  }
}
