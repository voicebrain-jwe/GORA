import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CloudinaryGateway } from './cloudinary.gateway';
import { decodePhotoPayload, PHOTO_PAYLOAD_MAX_BYTES } from './photo-payload';
import { MEDIA_TYPES } from './cloud-media.dto';

@Injectable()
export class CloudPhotosService {
  constructor(private readonly cloud: CloudinaryGateway) {}

  async save(photo: ReturnType<typeof decodePhotoPayload>) {
    if (!this.cloud.enabled())
      return { storageRef: null, data: photo.photoData };
    const extension =
      MEDIA_TYPES[photo.contentType as keyof typeof MEDIA_TYPES];
    const path = `gora/photos/${randomUUID()}.${extension}`;
    await this.cloud.put(path, {
      buffer: Buffer.from(photo.photoData),
      mimetype: photo.contentType,
      size: photo.photoData.length,
    });
    return { storageRef: `cloudinary:${path}`, data: null };
  }

  async read(reference: string): Promise<Buffer> {
    const path = this.path(reference);
    const response = await this.cloud.get(path);
    const reader = response.stream.getReader();
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > PHOTO_PAYLOAD_MAX_BYTES)
          throw new NotFoundException('Photo not found.');
        chunks.push(Buffer.from(part.value));
      }
    } finally {
      await reader.cancel();
    }
    return Buffer.concat(chunks);
  }

  async remove(reference: string | null | undefined) {
    if (reference?.startsWith('cloudinary:'))
      await this.cloud.remove(this.path(reference));
  }

  private path(reference: string) {
    if (
      !/^cloudinary:gora\/photos\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(
        reference,
      )
    )
      throw new NotFoundException('Photo not found.');
    return reference.slice('cloudinary:'.length);
  }
}
