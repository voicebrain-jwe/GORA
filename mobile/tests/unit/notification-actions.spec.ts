import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { afterEach, expect, test, vi } from 'vitest';
import { IonicVue } from '@ionic/vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import NotificationsPage from '@/views/NotificationsPage.vue';
import { useAuthStore } from '@/stores/auth';
import { useNotificationsStore } from '@/stores/notifications';
import { useFriendsStore } from '@/stores/friends';
import type { AppNotification } from '@/types/notification';
vi.mock('@/utils/notice', () => ({ showNotice: vi.fn() }));
let wrapper: ReturnType<typeof mount> | undefined;
afterEach(() => { wrapper?.unmount(); vi.restoreAllMocks(); });
async function open(items: AppNotification[]) {
  const pinia = createPinia(); setActivePinia(pinia);
  const auth = useAuthStore(); auth.accessToken = 'token';
  const store = useNotificationsStore(); store.items = items; store.isLoaded = true;
  vi.spyOn(store, 'load').mockResolvedValue(true);
  vi.spyOn(store, 'markRead').mockResolvedValue(true);
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] });
  await router.push('/'); await router.isReady();
  wrapper = mount(NotificationsPage, { global: { plugins: [pinia, IonicVue, router], stubs: { SubPageHeader: { template: '<header><slot /></header>' }, UserAvatar: true } } });
  await flushPromises(); return wrapper;
}
const request = (type: AppNotification['type'], actionStatus: AppNotification['actionStatus'] = null): AppNotification => ({ id: type, type, title: 'Pending request', body: 'Wants approval', actor: { id: 'actor', username: 'player', displayName: 'Test Player', avatarUrl: null }, link: type.startsWith('CLUB_') ? '/clubs/club' : '/games/game', clubRequestId: 'club-request', read: false, createdAt: new Date().toISOString(), actionStatus });

test('completed friend, game, leave and club requests have status text and no action buttons after reload', async () => {
  const page = await open([request('FRIEND_REQUEST', 'friend-accepted'), request('GAME_JOIN_REQUEST', 'join-accepted'), request('GAME_LEAVE_REQUEST', 'leave-approved'), request('CLUB_JOIN_REQUEST', 'club-join-accepted'), request('CLUB_LEAVE_REQUEST', 'club-leave-rejected')]);
  expect(page.findAll('button.notification__action')).toHaveLength(0);
  expect(page.text()).toContain('Friend request accepted');
  expect(page.text()).toContain('Player Removed');
  expect(page.text()).toContain('Club leave request declined');
});
test('accepting a friend request immediately replaces Accept with the friendship confirmation', async () => {
  const page = await open([request('FRIEND_REQUEST')]);
  const friends = useFriendsStore();
  vi.spyOn(friends, 'refresh').mockResolvedValue(undefined);
  vi.spyOn(friends, 'requestWith').mockReturnValue({ id: 'friend-request', direction: 'RECEIVED' } as never);
  vi.spyOn(friends, 'accept').mockResolvedValue(true);
  await page.find('button.notification__action').trigger('click'); await flushPromises();
  expect(page.find('button.notification__action').exists()).toBe(false);
  expect(page.text()).toContain('You and Test Player are now friends.');
});
