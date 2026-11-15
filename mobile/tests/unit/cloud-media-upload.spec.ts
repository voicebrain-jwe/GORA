import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { uploadMedia } from "@/services/media-upload.service";
import { put } from "@vercel/blob/client";
vi.mock("@vercel/blob/client", () => ({ put: vi.fn() }));
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const ticket = {
  uploadId: "11111111-1111-4111-8111-111111111111",
  pathname: "gora/stories/photo.png",
  clientToken: "restricted-token",
};
beforeEach(() => {
  vi.mocked(put)
    .mockReset()
    .mockResolvedValue({
      url: "private",
      pathname: ticket.pathname,
      downloadUrl: "private",
      contentType: "image/png",
      contentDisposition: "inline",
    });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
test("sends media directly to private storage and only metadata through the API", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(json({ provider: "blob" }))
    .mockResolvedValueOnce(json(ticket))
    .mockResolvedValueOnce(json({ id: "story" }));
  vi.stubGlobal("fetch", fetcher);
  const file = new File(["bytes"], "photo.png", { type: "image/png" }),
    progress = vi.fn();
  expect(
    await uploadMedia(
      "/stories/upload",
      "jwt",
      "media",
      file,
      { mediaType: "IMAGE", visibility: "ONLY_ME" },
      { onProgress: progress },
    ),
  ).toEqual({ id: "story" });
  expect(put).toHaveBeenCalledWith(
    ticket.pathname,
    file,
    expect.objectContaining({
      access: "private",
      token: ticket.clientToken,
      contentType: "image/png",
    }),
  );
  expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
    "/api/v1/media/uploads/config",
    "/api/v1/media/uploads",
    "/api/v1/stories/upload/complete",
  ]);
  const completed = JSON.parse(fetcher.mock.calls[2][1].body);
  expect(completed).toMatchObject({
    uploadId: ticket.uploadId,
    visibility: "ONLY_ME",
  });
  expect(completed.mediaUrl).toBeUndefined();
  expect(progress).toHaveBeenLastCalledWith(100);
});
test("cancellation removes the pending ticket and never completes a story", async () => {
  const controller = new AbortController();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(json({ provider: "blob" }))
    .mockResolvedValueOnce(json(ticket))
    .mockResolvedValue(json({}));
  vi.stubGlobal("fetch", fetcher);
  vi.mocked(put).mockImplementationOnce(async () => {
    controller.abort();
    throw new Error("aborted");
  });
  await expect(
    uploadMedia(
      "/stories/upload",
      "jwt",
      "media",
      new File(["bytes"], "photo.png", { type: "image/png" }),
      { mediaType: "IMAGE", visibility: "PUBLIC" },
      { signal: controller.signal },
    ),
  ).rejects.toThrow("Upload canceled.");
  expect(fetcher.mock.calls.at(-1)?.[0]).toBe(
    "/api/v1/media/uploads/" + ticket.uploadId,
  );
  expect(fetcher.mock.calls.at(-1)?.[1].method).toBe("DELETE");
  expect(fetcher.mock.calls.some((call) => call[0].endsWith("/complete"))).toBe(
    false,
  );
});

test('storage rejection is distinct from offline errors and never exposes SDK details', async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce(json({ provider: 'blob' }))
    .mockResolvedValueOnce(json(ticket))
    .mockResolvedValue(json({}));
  vi.stubGlobal('fetch', fetcher);
  vi.mocked(put).mockRejectedValueOnce(new Error('private-path restricted-token'));
  await expect(uploadMedia('/reels/upload', 'jwt', 'video',
    new File(['bytes'], 'reel.mp4', { type: 'video/mp4' }), {},
  )).rejects.toMatchObject({ status: 422, message: expect.stringContaining("couldn't store") });
  expect(fetcher.mock.calls.at(-1)?.[1].method).toBe('DELETE');
  expect(fetcher.mock.calls.some((call) => call[0].endsWith('/complete'))).toBe(false);
});

test('native uploads do not fall back to patched XHR on older WebViews', async () => {
  vi.stubGlobal('CapacitorWebFetch', vi.fn());
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(json({ provider: 'blob' }))
    .mockResolvedValueOnce(json(ticket))
    .mockResolvedValueOnce(json({ id: 'reel' })));
  const progress = vi.fn();
  await uploadMedia('/reels/upload', 'jwt', 'video',
    new File([new Uint8Array(5 * 1024 * 1024)], 'reel.mp4', { type: 'video/mp4' }),
    {}, { onProgress: progress });
  expect(put).toHaveBeenCalledWith(ticket.pathname, expect.any(File),
    expect.objectContaining({ multipart: true, onUploadProgress: undefined }));
  expect(progress).toHaveBeenLastCalledWith(100);
});

test('uploads a Cloudinary Story using signed multipart fields and completes with only its ticket', async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce(json({ provider: 'cloudinary' }))
    .mockResolvedValueOnce(json({ uploadId: ticket.uploadId, provider: 'cloudinary',
      uploadUrl: 'https://api.cloudinary.com/v1_1/gora-test/image/upload',
      parameters: { public_id: 'gora/stories/uuid', type: 'authenticated', signature: 'scoped-signature', timestamp: 123 } }))
    .mockResolvedValueOnce(json({ secure_url: 'ignored-client-result' }))
    .mockResolvedValueOnce(json({ id: 'story' }));
  vi.stubGlobal('fetch', fetcher);
  const file = new File(['bytes'], 'photo.png', { type: 'image/png' });
  await expect(uploadMedia('/stories/upload', 'jwt', 'media', file,
    { mediaType: 'IMAGE', visibility: 'ONLY_ME' })).resolves.toEqual({ id: 'story' });
  expect(put).not.toHaveBeenCalled();
  expect(fetcher.mock.calls[2][0]).toBe('https://api.cloudinary.com/v1_1/gora-test/image/upload');
  const options = fetcher.mock.calls[2][1];
  expect(options.body.get('type')).toBe('authenticated');
  expect(options.body.get('signature')).toBe('scoped-signature');
  expect(options.body.get('file')).toBeInstanceOf(File);
  expect(options.headers).toBeUndefined();
  expect(JSON.parse(fetcher.mock.calls[3][1].body)).toEqual({
    uploadId: ticket.uploadId, mediaType: 'IMAGE', visibility: 'ONLY_ME',
  });
});

test('never sends a Cloudinary file or signature to an unexpected upload host', async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce(json({ provider: 'cloudinary' }))
    .mockResolvedValueOnce(json({ uploadId: ticket.uploadId, provider: 'cloudinary',
      uploadUrl: 'https://untrusted.example/upload', parameters: { signature: 'secret-signature' } }))
    .mockResolvedValue(json({}));
  vi.stubGlobal('fetch', fetcher);
  await expect(uploadMedia('/stories/upload', 'jwt', 'media',
    new File(['bytes'], 'photo.png', { type: 'image/png' }), {})).rejects.toMatchObject({ status: 502 });
  expect(fetcher.mock.calls.every((call) => !call[0].includes('untrusted.example'))).toBe(true);
  expect(fetcher.mock.calls.at(-1)?.[1].method).toBe('DELETE');
});
