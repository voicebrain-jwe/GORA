import { afterEach, describe, expect, test, vi } from 'vitest';
import { ApiError, apiRequest, NETWORK_ERROR_MESSAGE, REQUEST_TIMEOUT_MS } from '@/services/api-client';
import { createServerClub } from '@/services/club-api.service';
import type { ClubCreateInput } from '@/types/club';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('API response handling', () => {
  test('uses the current deployment for browser API requests', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const fetch = vi.fn(() => Promise.resolve(new Response('null')));
    vi.stubGlobal('fetch', fetch);
    await apiRequest('/posts');
    expect(fetch).toHaveBeenCalledWith('/api/v1/posts', expect.any(Object));
  });

  test('supports a separately hosted public API origin', async () => {
    vi.stubEnv('VITE_API_BASE_URL', ' https://api.gora.example/// ');
    const fetch = vi.fn(() => Promise.resolve(new Response('null')));
    vi.stubGlobal('fetch', fetch);
    await apiRequest('/posts');
    expect(fetch).toHaveBeenCalledWith('https://api.gora.example/api/v1/posts', expect.any(Object));
  });

  test('keeps a valid JSON null response for an absent join request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('null'))),
    );
    expect(await apiRequest('/games/example/join-requests/me')).toBeNull();
  });

  test('rejects HTML or malformed JSON instead of returning a false success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('<html>Proxy error</html>'))),
    );
    await expect(apiRequest('/posts')).rejects.toMatchObject({ status: 502 });
  });

  test('preserves actionable server validation errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              message: ['Caption is required.', 'Choose a valid audience.'],
            }),
            { status: 400 },
          ),
        ),
      ),
    );
    await expect(apiRequest('/posts')).rejects.toThrow('Caption is required. Choose a valid audience.');
  });

  test('aborts a stalled request and releases its timer', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
      ),
    );
    const pending = apiRequest('/posts');
    const rejected = expect(pending).rejects.toEqual(new ApiError(0, NETWORK_ERROR_MESSAGE));
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });

  test('allows club photos to finish beyond the standard deadline but still aborts a stalled club save', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      signal = init.signal ?? undefined;
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));
    const pending = createServerClub('token', {} as ClubCreateInput);
    const rejected = expect(pending).rejects.toMatchObject({ status: 0 });
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(30_000);
    await rejected;
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
