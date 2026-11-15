import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { decodePhotoPayload } from '../common/media/photo-payload';
import { PrismaService } from '../prisma/prisma.service';
import { CloudPhotosService } from '../common/media/cloud-photos.service';

@Injectable()
export class ProfilePhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloud: CloudPhotosService,
  ) {}

  async save(userId: string, photo: string): Promise<string> {
    const { contentType, photoData } = decodePhotoPayload(photo);
    const revision = randomUUID();
    const url = `/api/v1/profiles/${userId}/photo/${revision}`;
    const previous = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: { profilePhotoStorageRef: true },
    });
    if (!previous) throw new NotFoundException('User not found.');
    const stored = await this.cloud.save({ contentType, photoData });
    try {
      const result = await this.prisma.user.updateMany({
        where: { id: userId, isActive: true },
        data: {
          profileImageUrl: url,
          profilePhotoRevision: revision,
          profilePhotoData: stored.data,
          profilePhotoStorageRef: stored.storageRef,
          profilePhotoType: contentType,
        },
      });
      if (!result.count) throw new NotFoundException('User not found.');
    } catch (error) {
      await this.cloud.remove(stored.storageRef).catch(() => undefined);
      throw error;
    }
    await this.cloud
      .remove(previous.profilePhotoStorageRef)
      .catch(() => undefined);
    return url;
  }

  async remove(userId: string): Promise<void> {
    const previous = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { profilePhotoStorageRef: true },
    });
    const result = await this.prisma.user.updateMany({
      where: { id: userId, isActive: true },
      data: {
        profileImageUrl: null,
        profilePhotoRevision: null,
        profilePhotoData: null,
        profilePhotoStorageRef: null,
        profilePhotoType: null,
      },
    });
    if (!result.count) throw new NotFoundException('User not found.');
    await this.cloud
      .remove(previous?.profilePhotoStorageRef)
      .catch(() => undefined);
  }

  async read(
    userId: string,
    revision: string,
  ): Promise<{ data: Buffer; contentType: string }> {
    const photo = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true, profilePhotoRevision: revision },
      select: {
        profilePhotoData: true,
        profilePhotoType: true,
        profilePhotoStorageRef: true,
      },
    });
    if (
      !photo?.profilePhotoType ||
      (!photo.profilePhotoData && !photo.profilePhotoStorageRef)
    )
      throw new NotFoundException('Profile photo not found.');
    return {
      data: photo.profilePhotoStorageRef
        ? await this.cloud.read(photo.profilePhotoStorageRef)
        : Buffer.from(photo.profilePhotoData!),
      contentType: photo.profilePhotoType,
    };
  }
}
