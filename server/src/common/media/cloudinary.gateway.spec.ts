import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryGateway } from './cloudinary.gateway';

const credentials = {
  CLOUDINARY_CLOUD_NAME: 'gora-test',
  CLOUDINARY_API_KEY: 'test-key',
  CLOUDINARY_API_SECRET: 'server-only-test-secret',
};
const path = 'gora/stories/11111111-1111-4111-8111-111111111111.png';
const gateway = (config = credentials) =>
  new CloudinaryGateway(new ConfigService(config));
afterEach(() => jest.restoreAllMocks());

it('issues signatures for fixed authenticated paths and never sends the API secret', () => {
  const ticket = gateway().ticket(path);
  expect(ticket.uploadUrl).toBe(
    'https://api.cloudinary.com/v1_1/gora-test/image/upload',
  );
  expect(ticket.parameters).toMatchObject({
    type: 'authenticated',
    overwrite: 'false',
    allowed_formats: 'png',
    public_id: path.slice(0, -4),
  });
  const { api_key, signature, ...params } = ticket.parameters;
  expect(api_key).toBe(credentials.CLOUDINARY_API_KEY);
  expect(signature).toBe(
    cloudinary.utils.api_sign_request(
      params,
      credentials.CLOUDINARY_API_SECRET,
    ),
  );
  expect(JSON.stringify(ticket)).not.toContain(
    credentials.CLOUDINARY_API_SECRET,
  );
  expect(
    gateway().ticket(path.replace('stories', 'reels').replace('.png', '.mp4'))
      .uploadUrl,
  ).toContain('/video/upload');
});

it('rejects partial credentials and arbitrary file paths', () => {
  expect(() =>
    new CloudinaryGateway(
      new ConfigService({ CLOUDINARY_CLOUD_NAME: 'gora-test' }),
    ).enabled(),
  ).toThrow('Complete');
  expect(() => gateway().ticket('https://outside.example/photo.png')).toThrow(
    'Media not found',
  );
  expect(() => gateway().ticket(path.replace('stories', '..'))).toThrow(
    'Media not found',
  );
});

it('verifies actual original size and MIME type and forwards byte ranges through server-only signed URLs', async () => {
  const fetcher = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      new Response(null, {
        headers: { 'content-length': '99', 'content-type': 'image/png' },
      }),
    )
    .mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2]), {
        status: 206,
        headers: { 'content-range': 'bytes 1-2/99' },
      }),
    );
  expect(await gateway().head(path)).toMatchObject({
    size: 99,
    contentType: 'image/png',
  });
  const result = await gateway().get(path, 'bytes=1-2');
  expect(result.headers.get('content-range')).toBe('bytes 1-2/99');
  expect(fetcher.mock.calls[1][1]?.headers).toEqual({ Range: 'bytes=1-2' });
  expect(String(fetcher.mock.calls[1][0])).toMatch(
    /\/image\/authenticated\/s--/,
  );
  expect(String(fetcher.mock.calls[1][0])).not.toContain(
    credentials.CLOUDINARY_API_SECRET,
  );
});

it('does not expose provider error details or credentials', async () => {
  jest
    .spyOn(globalThis, 'fetch')
    .mockRejectedValue(new Error('private signature or secret'));
  await expect(gateway().head(path)).rejects.toThrow('Unable to verify');
  await expect(gateway().get(path)).rejects.toThrow(
    'Media storage is temporarily unavailable',
  );
});
