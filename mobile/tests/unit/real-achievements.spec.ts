import { createPinia, setActivePinia } from 'pinia';
import { afterEach, expect, test, vi } from 'vitest';
import { useProfileStore } from '@/stores/profile';
import { useAuthStore } from '@/stores/auth';
const response = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
afterEach(() => vi.unstubAllGlobals());

test('loads badges from the authenticated API and clears account-specific progress on logout', async () => {
  setActivePinia(createPinia());
  const auth = useAuthStore(); auth.accessToken = 'account-token';
  const profile = useProfileStore();
  const fetcher = vi.fn(async (url: string) => response(url.endsWith('/achievements')
    ? { activityStats: { gamesJoined: 0 }, badges: [{ id: 'actual-badge', progress: 0, unlocked: false }] }
    : { id: 'user', goraPoints: 0 }));
  vi.stubGlobal('fetch', fetcher);
  await profile.load();
  expect(profile.badges).toHaveLength(1);
  expect(profile.badges[0]).toMatchObject({ id: 'actual-badge', progress: 0, unlocked: false });
  expect(fetcher).toHaveBeenCalledWith('/api/v1/profiles/me/achievements', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer account-token' }) }));
  auth.accessToken = null;
  expect(profile.badges).toEqual([]);
  expect(profile.activityStats).toBeNull();
});
test('does not fabricate badges when the achievements API fails', async () => {
  setActivePinia(createPinia()); useAuthStore().accessToken = 'account-token';
  const profile = useProfileStore();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
  await profile.load();
  expect(profile.badges).toEqual([]);
  expect(profile.achievementsError).toBeTruthy();
});
