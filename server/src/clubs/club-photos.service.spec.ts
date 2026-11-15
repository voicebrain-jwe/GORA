import { ClubPhotosService } from './club-photos.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudPhotosService } from '../common/media/cloud-photos.service';
import { ClubsService } from './clubs.service';
import { ConfigService } from '@nestjs/config';
import { GoraPointsService } from '../gora-points/gora-points.service';

const photo =
  'data:image/png;base64,' +
  Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000',
    'hex',
  ).toString('base64');
function setup() {
  let transactionActive = false;
  let n = 0;
  const cloud = {
    save: jest.fn(async () => {
      expect(transactionActive).toBe(false);
      return { storageRef: `cloudinary:gora/photos/${++n}.png`, data: null };
    }),
    remove: jest.fn(async () => {
      expect(transactionActive).toBe(false);
    }),
  };
  const tx = {
    clubPhoto: { upsert: jest.fn(), deleteMany: jest.fn() },
    club: { update: jest.fn() },
  };
  const service = new ClubPhotosService(
    {} as PrismaService,
    cloud as unknown as CloudPhotosService,
  );
  const write = async (prepared: Parameters<ClubPhotosService['apply']>[2]) => {
    transactionActive = true;
    try {
      await service.apply(tx as never, 'club-id', prepared);
      return 'club-id';
    } finally {
      transactionActive = false;
    }
  };
  return { service, cloud, tx, write };
}

it('uploads profile and cover before starting club database writes', async () => {
  const { service, cloud, tx, write } = setup();
  await expect(
    service.withPrepared({ profilePhoto: photo, coverPhoto: photo }, write),
  ).resolves.toBe('club-id');
  expect(cloud.save).toHaveBeenCalledTimes(2);
  expect(tx.clubPhoto.upsert).toHaveBeenCalledTimes(2);
  expect(tx.clubPhoto.upsert.mock.calls[0][0]).toMatchObject({
    create: { data: null, storageRef: expect.stringContaining('cloudinary:') },
  });
  expect(cloud.remove).not.toHaveBeenCalled();
});

it('the actual club create flow finishes both uploads before opening its transaction', async () => {
  let transactionActive = false;
  const cloud = {
    save: jest.fn(async () => {
      expect(transactionActive).toBe(false);
      return { data: null, storageRef: 'cloudinary:gora/photos/photo.png' };
    }),
    remove: jest.fn(),
  };
  const tx = {
    club: { create: jest.fn().mockResolvedValue({ id: 'club-id' }), update: jest.fn() },
    clubPhoto: { upsert: jest.fn() },
    clubMember: { findUnique: jest.fn().mockResolvedValue({ role: 'OWNER', status: 'ACTIVE' }) },
    conversation: { findUnique: jest.fn().mockResolvedValue({ type: 'CLUB' }) },
  };
  const prisma = {
    sport: { findMany: jest.fn().mockResolvedValue([{ id: 'sport-id' }]) },
    $transaction: jest.fn(async (write: (value: typeof tx) => unknown) => {
      expect(cloud.save).toHaveBeenCalledTimes(2);
      transactionActive = true;
      try { return await write(tx); } finally { transactionActive = false; }
    }),
  };
  const photos = new ClubPhotosService(prisma as unknown as PrismaService, cloud as unknown as CloudPhotosService);
  const clubs = new ClubsService(prisma as unknown as PrismaService, new ConfigService({}), {} as GoraPointsService, photos);
  jest.spyOn(clubs, 'get').mockResolvedValue({ id: 'club-id' } as never);
  await expect(clubs.create('owner', { name: 'Photo Club', username: 'photo-club', description: 'Test',
    primarySportId: 'sport-id', maxMembers: 50, profilePhoto: photo, coverPhoto: photo })).resolves.toEqual({ id: 'club-id' });
  expect(tx.clubPhoto.upsert).toHaveBeenCalledTimes(2);
  expect(cloud.remove).not.toHaveBeenCalled();
});

it('cleans up every successful upload when either upload fails, without creating a club', async () => {
  const { service, cloud } = setup();
  cloud.save.mockRejectedValueOnce(new Error('storage unavailable'));
  const write = jest.fn();
  await expect(
    service.withPrepared({ profilePhoto: photo, coverPhoto: photo }, write),
  ).rejects.toThrow('storage unavailable');
  expect(write).not.toHaveBeenCalled();
  expect(cloud.remove).toHaveBeenCalledTimes(1);
});

it('cleans up both files after a failed transaction but preserves the original error', async () => {
  const { service, cloud } = setup();
  await expect(
    service.withPrepared(
      { profilePhoto: photo, coverPhoto: photo },
      async () => {
        throw new Error('username conflict');
      },
    ),
  ).rejects.toThrow('username conflict');
  expect(cloud.remove).toHaveBeenCalledTimes(2);
});

it('validates every photo before any upload and does not upload images for a photo-free club', async () => {
  const { service, cloud, write } = setup();
  await expect(
    service.withPrepared({ profilePhoto: photo, coverPhoto: 'invalid' }, write),
  ).rejects.toThrow('valid JPEG');
  expect(cloud.save).not.toHaveBeenCalled();
  await expect(service.withPrepared({}, write)).resolves.toBe('club-id');
  expect(cloud.save).not.toHaveBeenCalled();
});
