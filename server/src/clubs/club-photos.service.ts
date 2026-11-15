import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client';
import { decodePhotoPayload } from '../common/media/photo-payload';
import { PrismaService } from '../prisma/prisma.service';
import { CloudPhotosService } from '../common/media/cloud-photos.service';

interface ClubPhotoInput {
  profilePhoto?: string | null;
  coverPhoto?: string | null;
  profileImageUrl?: string | null;
  coverImageUrl?: string | null;
}

interface PreparedClubPhotos {
  input: ClubPhotoInput;
  uploads: Partial<
    Record<
      'profile' | 'cover',
      {
        revision: string;
        contentType: string;
        data: Uint8Array<ArrayBuffer> | null;
        storageRef: string | null;
      }
    >
  >;
}

@Injectable()
export class ClubPhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloud: CloudPhotosService,
  ) {}

  /** Validate and upload before opening a database transaction or locking a club. */
  async withPrepared<T>(
    input: ClubPhotoInput,
    write: (prepared: PreparedClubPhotos) => Promise<T>,
  ): Promise<T> {
    const photos = (['profile', 'cover'] as const).map((kind) => {
      const photo = kind === 'profile' ? input.profilePhoto : input.coverPhoto;
      const url =
        kind === 'profile' ? input.profileImageUrl : input.coverImageUrl;
      if (photo != null && url != null)
        throw new BadRequestException(
          'Choose a photo upload or a URL, not both.',
        );
      return {
        kind,
        decoded: photo == null ? null : decodePhotoPayload(photo),
      };
    });
    const prepared: PreparedClubPhotos = { input, uploads: {} };
    try {
      const results = await Promise.allSettled(
        photos.map(async ({ kind, decoded }) => {
          if (!decoded) return;
          const stored = await this.cloud.save(decoded);
          prepared.uploads[kind] = {
            ...stored,
            revision: randomUUID(),
            contentType: decoded.contentType,
          };
        }),
      );
      const failed = results.find((result) => result.status === 'rejected');
      if (failed?.status === 'rejected') throw failed.reason;
      return await write(prepared);
    } catch (error) {
      await Promise.all(
        Object.values(prepared.uploads).map((photo) =>
          this.cloud.remove(photo.storageRef).catch(() => undefined),
        ),
      );
      throw error;
    }
  }

  /** Database writes only: no Cloudinary network calls inside this transaction. */
  async apply(
    tx: Prisma.TransactionClient,
    clubId: string,
    prepared: PreparedClubPhotos,
  ): Promise<void> {
    const { input } = prepared;
    for (const kind of ['profile', 'cover'] as const) {
      const photo = kind === 'profile' ? input.profilePhoto : input.coverPhoto;
      const urlField = kind === 'profile' ? 'profileImageUrl' : 'coverImageUrl';
      const url = input[urlField];
      if (photo === undefined) {
        // A legacy URL replacement/removal invalidates any previously uploaded file.
        if (url !== undefined)
          await tx.clubPhoto.deleteMany({ where: { clubId, kind } });
        continue;
      }
      if (photo !== null && url != null)
        throw new BadRequestException(
          'Choose a photo upload or a URL, not both.',
        );
      if (photo === null) {
        await tx.clubPhoto.deleteMany({ where: { clubId, kind } });
        await tx.club.update({
          where: { id: clubId },
          data: { [urlField]: null },
        });
        continue;
      }
      const stored = prepared.uploads[kind];
      if (!stored) throw new BadRequestException('Choose a valid club photo.');
      const { contentType, revision } = stored;
      await tx.clubPhoto.upsert({
        where: { clubId_kind: { clubId, kind } },
        create: {
          clubId,
          kind,
          revision,
          contentType,
          data: stored.data,
          storageRef: stored.storageRef,
        },
        update: {
          revision,
          contentType,
          data: stored.data,
          storageRef: stored.storageRef,
        },
      });
      await tx.club.update({
        where: { id: clubId },
        data: {
          [urlField]: `/api/v1/clubs/${clubId}/photos/${kind}/${revision}`,
        },
      });
    }
  }

  async read(clubId: string, kind: string, revision: string) {
    if (kind !== 'profile' && kind !== 'cover')
      throw new NotFoundException('Club photo not found.');
    const photo = await this.prisma.clubPhoto.findFirst({
      where: { clubId, kind, revision, club: { isActive: true } },
      select: { data: true, contentType: true, storageRef: true },
    });
    if (!photo || (!photo.data && !photo.storageRef))
      throw new NotFoundException('Club photo not found.');
    return {
      data: photo.storageRef
        ? await this.cloud.read(photo.storageRef)
        : Buffer.from(photo.data!),
      contentType: photo.contentType,
    };
  }
}
