import { ConfigService } from '@nestjs/config';
import { CloudMediaService } from './cloud-media.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BlobGateway } from './blob.gateway';
import { CloudinaryGateway } from './cloudinary.gateway';

const id = '11111111-1111-4111-8111-111111111111';
const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
const stream = () =>
  new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(png);
      c.close();
    },
  });
function setup() {
  const tx = {
    cloudMediaUpload: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const prisma = {
    cloudMediaUpload: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((call: (value: typeof tx) => unknown) => call(tx)),
  };
  const blob = {
    head: jest.fn(),
    get: jest.fn(),
    mint: jest.fn().mockResolvedValue('blob-client-token'),
  };
  const cloud = {
    enabled: () => true,
    ticket: jest
      .fn()
      .mockReturnValue({
        uploadUrl: 'signed-cloudinary-upload',
        parameters: { type: 'authenticated' },
      }),
    head: jest
      .fn()
      .mockResolvedValue({
        url: 'server-only-url',
        size: png.length,
        contentType: 'image/png',
      }),
    get: jest
      .fn()
      .mockImplementation(async () => ({
        statusCode: 200,
        headers: new Headers(),
        stream: stream(),
      })),
  };
  const service = new CloudMediaService(
    new ConfigService({ BLOB_READ_WRITE_TOKEN: 'legacy' }),
    prisma as unknown as PrismaService,
    blob as unknown as BlobGateway,
    cloud as unknown as CloudinaryGateway,
  );
  return { service, prisma, cloud, blob, tx };
}

it('selects Cloudinary for new tickets and persists their provider without exposing server credentials', async () => {
  const { service, prisma, cloud, blob } = setup();
  const result = await service.start('owner', {
    resource: 'stories',
    contentType: 'image/png',
    size: png.length,
  });
  expect(result).toMatchObject({
    provider: 'cloudinary',
    uploadUrl: 'signed-cloudinary-upload',
  });
  expect(prisma.cloudMediaUpload.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ userId: 'owner', provider: 'cloudinary' }),
  });
  expect(cloud.ticket).toHaveBeenCalledTimes(1);
  expect(blob.mint).not.toHaveBeenCalled();
});

it('checks ownership, expiry, actual bytes and a single-use claim before creating the Story', async () => {
  const { service, prisma, tx } = setup();
  prisma.cloudMediaUpload.findFirst.mockResolvedValue({
    provider: 'cloudinary',
    contentType: 'image/png',
    size: png.length,
  });
  const create = jest.fn().mockResolvedValue({ id: 'story' });
  await expect(
    service.complete('owner', id, 'stories', 'IMAGE', create),
  ).resolves.toEqual({ id: 'story' });
  expect(prisma.cloudMediaUpload.findFirst).toHaveBeenCalledWith({
    where: expect.objectContaining({
      id,
      userId: 'owner',
      resource: 'stories',
      claimedAt: null,
      expiresAt: expect.anything(),
    }),
  });
  expect(create).toHaveBeenCalledWith(`cloudinary:${id}.png`, tx);
  tx.cloudMediaUpload.updateMany.mockResolvedValueOnce({ count: 0 });
  create.mockClear();
  await expect(
    service.complete('owner', id, 'stories', 'IMAGE', create),
  ).rejects.toThrow('already been shared');
  expect(create).not.toHaveBeenCalled();
});

it('rejects a wrong-size upload before claiming or publishing it', async () => {
  const { service, prisma, tx } = setup();
  prisma.cloudMediaUpload.findFirst.mockResolvedValue({
    provider: 'cloudinary',
    contentType: 'image/png',
    size: png.length + 1,
  });
  const create = jest.fn();
  await expect(
    service.complete('owner', id, 'stories', 'IMAGE', create),
  ).rejects.toThrow('incomplete');
  expect(tx.cloudMediaUpload.updateMany).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
});

it('completes legacy Blob tickets with Blob even after Cloudinary becomes preferred', async () => {
  const { service, prisma, cloud, blob } = setup();
  prisma.cloudMediaUpload.findFirst.mockResolvedValue({
    provider: 'blob',
    contentType: 'image/png',
    size: png.length,
  });
  blob.head.mockResolvedValue({
    url: 'https://test.private.blob.vercel-storage.com/file',
    size: png.length,
    contentType: 'image/png',
  });
  blob.get.mockResolvedValue({ statusCode: 200, stream: stream() });
  const create = jest.fn().mockResolvedValue({});
  await service.complete('owner', id, 'stories', 'IMAGE', create);
  expect(create.mock.calls[0][0]).toBe(`blob:${id}.png`);
  expect(cloud.head).not.toHaveBeenCalled();
});
