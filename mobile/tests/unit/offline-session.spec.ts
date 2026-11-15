import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { tokenStorage } from '@/services/token-storage';
import { useAuthStore } from '@/stores/auth';

const alice = {
  id: 'alice',
  username: 'alice',
  firstName: 'Alice',
  lastName: 'Test',
  email: 'alice@example.test',
  role: 'USER',
  profileImageUrl: null,
  bio: null,
  city: null,
};

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('opening the app offline', () => {
  test('stays signed in with the last known profile', async () => {
    await tokenStorage.set('saved-token');
    await tokenStorage.setUser(alice as never);
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));

    const auth = useAuthStore();
    await auth.initialize();

    expect(auth.isAuthenticated).toBe(true);
    expect(auth.currentUser?.username).toBe('alice');
  });

  test('is signed out offline when no profile was ever saved', async () => {
    await tokenStorage.set('saved-token');
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));

    const auth = useAuthStore();
    await auth.initialize();

    expect(auth.isAuthenticated).toBe(false);
    expect(await tokenStorage.get()).toBe('saved-token');
  });

  test('logout forgets the saved profile too', async () => {
    await tokenStorage.set('saved-token');
    await tokenStorage.setUser(alice as never);

    await useAuthStore().logout();

    expect(await tokenStorage.getUser()).toBeNull();
  });
});
