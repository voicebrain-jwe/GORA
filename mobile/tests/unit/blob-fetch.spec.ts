// @vitest-environment node
import { afterEach, expect, test, vi } from 'vitest';
import { fetch as blobFetch } from '@/services/blob-fetch';
import { apiRequest } from '@/services/api-client';

afterEach(() => vi.unstubAllGlobals());

test('uploads non-text stream bytes through original WebView fetch while API calls stay native', async () => {
  const nativeFetch = vi.fn().mockResolvedValue(new Response('null'));
  const webFetch = vi.fn().mockResolvedValue(new Response('{}'));
  vi.stubGlobal('fetch', nativeFetch);
  vi.stubGlobal('CapacitorWebFetch', webFetch);
  const bytes = new Uint8Array([0, 255, 128, 195, 40, 13, 10]);
  const body = new ReadableStream({
    start(controller) { controller.enqueue(bytes); controller.close(); },
  });
  const signal = new AbortController().signal;
  const headers = { Authorization: 'restricted-upload-token' };
  await blobFetch('https://vercel.com/api/blob', { method: 'PUT', body, headers, signal });
  const options = webFetch.mock.calls[0][1];
  expect(new Uint8Array(await options.body.arrayBuffer())).toEqual(bytes);
  expect(options).toMatchObject({ method: 'PUT', headers, signal });
  expect(nativeFetch).not.toHaveBeenCalled();
  await apiRequest('/posts');
  expect(nativeFetch).toHaveBeenCalledOnce();
  expect(webFetch).toHaveBeenCalledOnce();
});

test('passes files and cancellation signals unchanged to the WebView transport', async () => {
  const webFetch = vi.fn().mockResolvedValue(new Response('{}'));
  vi.stubGlobal('CapacitorWebFetch', webFetch);
  const file = new File([new Uint8Array([255, 0, 128])], 'photo.jpg', { type: 'image/jpeg' });
  const controller = new AbortController();
  const options = { method: 'PUT', body: file, signal: controller.signal };
  await blobFetch('https://vercel.com/api/blob', options);
  expect(webFetch).toHaveBeenCalledWith('https://vercel.com/api/blob', options);
  expect(webFetch.mock.calls[0][1].body).toBe(file);
  controller.abort();
  expect(webFetch.mock.calls[0][1].signal.aborted).toBe(true);
});

test('uses normal fetch in browsers without a native HTTP bridge', async () => {
  vi.stubGlobal('CapacitorWebFetch', undefined);
  const fetcher = vi.fn().mockResolvedValue(new Response('{}'));
  vi.stubGlobal('fetch', fetcher);
  await blobFetch('https://vercel.com/api/blob', { method: 'PUT', body: 'bytes' });
  expect(fetcher).toHaveBeenCalledWith('https://vercel.com/api/blob', { method: 'PUT', body: 'bytes' });
});
