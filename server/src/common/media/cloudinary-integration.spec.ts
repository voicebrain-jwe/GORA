import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../app.module';
import { PostPhotosService } from '../../posts/post-photos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../../users/users.service';
import { CloudPhotosService } from './cloud-photos.service';

it('wires the Cloudinary media providers into the existing application', async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  expect(module.get(CloudPhotosService)).toBeDefined();
  expect(module.get(PostPhotosService)).toBeDefined();
  await module.close();
});

function photos() {
  const prisma = { postMedia: { findFirst: jest.fn() } };
  const users = { findActiveById: jest.fn().mockResolvedValue({ id: 'viewer' }) };
  const cloud = { read: jest.fn().mockResolvedValue(Buffer.from([1, 2, 3])), save: jest.fn() };
  const service = new PostPhotosService(new ConfigService({ JWT_SECRET: 'test-photo-secret' }),
    prisma as unknown as PrismaService, users as unknown as UsersService, cloud as unknown as CloudPhotosService);
  const post = '11111111-1111-4111-8111-111111111111';
  const media = '22222222-2222-4222-8222-222222222222';
  const viewer = '33333333-3333-4333-8333-333333333333';
  const token = new URL(service.url(post, media, viewer), 'https://gora.example').searchParams.get('token');
  return { service, prisma, users, cloud, post, media, token };
}

it('checks post audience before retrieving Cloudinary bytes', async () => {
  const { service, prisma, cloud, post, media, token } = photos();
  prisma.postMedia.findFirst.mockResolvedValue(null);
  await expect(service.read(post, media, token)).rejects.toThrow('Photo not found');
  expect(cloud.read).not.toHaveBeenCalled();
  expect(prisma.postMedia.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ post: expect.anything() }) }));
});

it('reads authorized Cloudinary photos and legacy database bytes through the same API', async () => {
  const { service, prisma, cloud, post, media, token } = photos();
  const reference = 'cloudinary:gora/photos/44444444-4444-4444-8444-444444444444.png';
  prisma.postMedia.findFirst.mockResolvedValue({ mediaUrl: reference, contentType: 'image/png', photoData: null });
  expect(await service.read(post, media, token)).toEqual({ data: Buffer.from([1, 2, 3]), contentType: 'image/png' });
  expect(cloud.read).toHaveBeenCalledWith(reference);
  cloud.read.mockClear();
  prisma.postMedia.findFirst.mockResolvedValue({ mediaUrl: 'postgres:photo', contentType: 'image/png', photoData: new Uint8Array([4, 5]) });
  expect(await service.read(post, media, token)).toEqual({ data: Buffer.from([4, 5]), contentType: 'image/png' });
  expect(cloud.read).not.toHaveBeenCalled();
});

it('rejects a tampered photo token before touching storage or database', async () => {
  const { service, prisma, cloud, post, media } = photos();
  await expect(service.read(post, media, 'tampered')).rejects.toThrow('Photo link expired');
  expect(prisma.postMedia.findFirst).not.toHaveBeenCalled();
  expect(cloud.read).not.toHaveBeenCalled();
});
