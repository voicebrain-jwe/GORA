import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth';
import { tokenStorage } from '@/services/token-storage';
import { resolveAuthNavigation } from '@/utils/auth';

const user = { id: 'offline-user', username: 'player', email: 'player@example.test', firstName: 'Test', lastName: 'Player', role: 'USER' as const, profileImageUrl: null, bio: null, city: null };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const stores: ReturnType<typeof useAuthStore>[] = [];
function freshLaunch() { setActivePinia(createPinia()); const auth = useAuthStore(); stores.push(auth); return auth; }
beforeEach(() => localStorage.clear());
afterEach(async () => { for (const auth of stores.splice(0)) await auth.logout(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test('a successful login survives a failed profile request and a cold offline launch', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.endsWith('/auth/login')) return json({ user, accessToken: 'saved-session' });
    throw new TypeError('Network unavailable');
  }));
  await freshLaunch().login({ email: user.email, password: 'test-password' });
  expect((await tokenStorage.getUser())?.id).toBe(user.id);
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  const restored = freshLaunch();
  await restored.initialize();
  expect(restored.isInitialized).toBe(true);
  expect(restored.isAuthenticated).toBe(true);
  expect(fetcher).not.toHaveBeenCalled();
  expect(resolveAuthNavigation({ fullPath: '/login', guestOnly: true, requiresAuth: false }, restored.isAuthenticated)).toEqual({ path: '/home' });
});

test('an unreachable API does not remove a cached session even when the device reports online', async () => {
  await tokenStorage.set('saved-session'); await tokenStorage.setUser(user);
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network unavailable')));
  const restored = freshLaunch(); await restored.initialize();
  expect(restored.isAuthenticated).toBe(true);
  expect(await tokenStorage.get()).toBe('saved-session');
});

test('reconnection refreshes the cached identity and a server rejection clears it', async () => {
  await tokenStorage.set('saved-session'); await tokenStorage.setUser(user);
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  const restored = freshLaunch(); await restored.initialize();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ...user, city: 'Manila' })));
  window.dispatchEvent(new Event('online'));
  await vi.waitFor(() => expect(restored.currentUser?.city).toBe('Manila'));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'Unauthorized' }, 401)));
  await restored.loadCurrentUser();
  expect(restored.isAuthenticated).toBe(false);
  expect(await tokenStorage.get()).toBeNull();
  expect(await tokenStorage.getUser()).toBeNull();
});

test('explicit logout stays logged out on an offline restart', async () => {
  await tokenStorage.set('saved-session'); await tokenStorage.setUser(user);
  const auth = freshLaunch(); await auth.logout();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  const restored = freshLaunch(); await restored.initialize();
  expect(restored.isAuthenticated).toBe(false);
});
