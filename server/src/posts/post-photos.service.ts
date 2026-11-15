import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { visiblePostsWhere } from './post-visibility';
import { decodePhotoPayload } from '../common/media/photo-payload';
import { CloudPhotosService } from '../common/media/cloud-photos.service';

/** Cloudinary photos and legacy database photos share audience-checked API URLs. */
@Injectable()
export class PostPhotosService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly cloud: CloudPhotosService,
  ) {}

  async decode(dataUrl: string, sortOrder: number) {
    const photo = decodePhotoPayload(dataUrl);
    const stored = await this.cloud.save(photo);
    return {
      mediaType: 'IMAGE' as const,
      mediaUrl: stored.storageRef ?? 'postgres:photo',
      contentType: photo.contentType,
      photoData: stored.data,
      sortOrder,
    };
  }
  async discard(media: { mediaUrl: string }[]) {
    await Promise.all(
      media.map((item) =>
        this.cloud.remove(item.mediaUrl).catch(() => undefined),
      ),
    );
  }

  url(postId: string, mediaId: string, viewerId: string): string {
    const expires = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
    const signature = this.sign(`${postId}:${mediaId}:${viewerId}:${expires}`);
    return `/api/v1/posts/${postId}/media/${mediaId}?token=${viewerId}.${expires}.${signature}`;
  }

  async read(postId: string, mediaId: string, token: unknown) {
    const invalid = () =>
      new UnauthorizedException('Photo link expired. Refresh to try again.');
    if (typeof token !== 'string' || token.length > 200) throw invalid();
    const match = /^([a-f0-9-]{36})\.(\d{10})\.([a-f0-9]{64})$/.exec(token);
    if (!match) throw invalid();
    const [, viewerId, expiry, signature] = match;
    const expected = this.sign(`${postId}:${mediaId}:${viewerId}:${expiry}`);
    if (
      Number(expiry) <= Math.floor(Date.now() / 1000) ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      throw invalid();
    if (!(await this.users.findActiveById(viewerId)))
      throw new NotFoundException('Photo not found.');
    const photo = await this.prisma.postMedia.findFirst({
      where: { id: mediaId, postId, post: visiblePostsWhere(viewerId) },
      select: { photoData: true, contentType: true, mediaUrl: true },
    });
    if (
      !photo?.contentType ||
      (!photo.photoData && !photo.mediaUrl.startsWith('cloudinary:'))
    )
      throw new NotFoundException('Photo not found.');
    return {
      data: photo.mediaUrl.startsWith('cloudinary:')
        ? await this.cloud.read(photo.mediaUrl)
        : Buffer.from(photo.photoData!),
      contentType: photo.contentType,
    };
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
      .update(`post-photo:${payload}`)
      .digest('hex');
  }
}
