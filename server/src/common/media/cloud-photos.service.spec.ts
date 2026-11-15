import { CloudPhotosService } from './cloud-photos.service';
import { CloudinaryGateway } from './cloudinary.gateway';

it('stores only an authenticated Cloudinary reference for new photos and keeps legacy fallback', async () => {
  const cloud = { enabled: jest.fn().mockReturnValue(true), put: jest.fn() };
  const service = new CloudPhotosService(cloud as unknown as CloudinaryGateway);
  const photo = {
    contentType: 'image/png',
    photoData: new Uint8Array([1, 2, 3]),
  };
  const stored = await service.save(photo);
  expect(stored.storageRef).toMatch(
    /^cloudinary:gora\/photos\/[a-f0-9-]+\.png$/,
  );
  expect(stored.data).toBeNull();
  expect(cloud.put).toHaveBeenCalledWith(
    expect.stringMatching(/^gora\/photos\//),
    expect.objectContaining({ mimetype: 'image/png', size: 3 }),
  );
  cloud.enabled.mockReturnValue(false);
  expect(await service.save(photo)).toEqual({
    storageRef: null,
    data: photo.photoData,
  });
});

it('does not allow arbitrary URLs as storage references', async () => {
  const cloud = { get: jest.fn() };
  const service = new CloudPhotosService(cloud as unknown as CloudinaryGateway);
  await expect(service.read('https://outside.example/private')).rejects.toThrow(
    'Photo not found',
  );
  expect(cloud.get).not.toHaveBeenCalled();
});
