<template>
  <ion-page>
    <SubPageHeader title="Notifications" back-href="/home">
      <template #end>
        <ion-button
          v-if="unreadCount > 0"
          fill="clear"
          size="small"
          :disabled="isMarkingAll || !!readingId"
          @click="notificationsStore.markAllRead()"
        >
          Mark all read
        </ion-button>
      </template>
    </SubPageHeader>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ion-refresh="refresh($event)"
        ><ion-refresher-content
      /></ion-refresher>
      <div v-if="error" class="notifications__feedback" role="alert">
        <p>{{ error }}</p>
        <ion-button
          fill="clear"
          :disabled="isLoading"
          @click="notificationsStore.load(true)"
          >Try again</ion-button
        >
      </div>
      <div
        v-if="isLoading && !isLoaded"
        class="notifications__empty"
        role="status"
      >
        <ion-spinner />
        <p>Loading notifications…</p>
      </div>
      <p
        v-else-if="isLoaded && items.length === 0"
        class="notifications__empty"
      >
        You're all caught up.
      </p>
      <ul v-else class="notifications">
        <li v-for="item in items" :key="item.id" class="notifications__item">
          <button
            type="button"
            class="notification"
            :class="{ 'notification--unread': !item.read }"
            :disabled="isMarkingAll"
            @click="openNotification(item)"
          >
            <span
              class="notification__icon"
              :class="`notification__icon--${item.type.toLowerCase()}`"
            >
              <UserAvatar v-if="item.actor" :user="item.actor" :size="44" />
              <ion-icon
                v-else
                :icon="NOTIFICATION_ICONS[item.type] || notificationsOutline"
                aria-hidden="true"
              />
              <span v-if="item.actor" class="notification__type-dot">
                <ion-icon
                  :icon="NOTIFICATION_ICONS[item.type] || notificationsOutline"
                  aria-hidden="true"
                />
              </span>
            </span>
            <span class="notification__text">
              <strong>{{ item.title }}</strong>
              <span>{{ item.body }}</span>
              <time :datetime="item.createdAt">{{
                formatTimeAgo(Date.parse(item.createdAt), now)
              }}</time>
            </span>
            <span
              v-if="!item.read"
              class="notification__unread"
              aria-label="Unread"
            />
          </button>
          <div v-if="hasNotificationAction(item)" class="notification__actions">
            <button
              v-if="item.type === 'FRIEND_REQUEST'"
              type="button"
              class="notification__action notification__action--primary"
              :disabled="isMarkingAll || !!actionBusyId"
              @click="acceptFriend(item)"
            >
              {{ actionBusyId === item.id ? 'Accepting…' : 'Accept' }}
            </button>
            <button
              v-else-if="item.type === 'GAME_JOIN_REQUEST' && !getGameActionStatus(item)"
              type="button"
              class="notification__action notification__action--primary"
              :disabled="isMarkingAll || !!actionBusyId"
              @click="acceptGameRequest(item)"
            >
              {{ actionBusyId === item.id ? 'Accepting…' : 'Accept Join Request' }}
            </button>
            <span v-else-if="item.type === 'GAME_JOIN_REQUEST' && getGameActionStatus(item)" class="notification__action-status">{{ joinRequestStatusLabel(getGameActionStatus(item)) }}</span>
            <template v-else-if="item.type === 'GAME_LEAVE_REQUEST'">
              <span v-if="getGameActionStatus(item) === 'leave-approved'" class="notification__action-status">Player Removed</span>
              <span v-else-if="getGameActionStatus(item) === 'leave-rejected'" class="notification__action-status">Request Declined</span>
              <span v-else-if="getGameActionStatus(item)" class="notification__action-status">Request No Longer Pending</span>
              <template v-else>
                <button type="button" class="notification__action notification__action--primary" :disabled="isMarkingAll || !!actionBusyId" @click="respondToLeave(item, 'approve')">
                  {{ actionBusyId === item.id ? 'Removing…' : 'Approve & Remove Player' }}
                </button>
                <button type="button" class="notification__action" :disabled="isMarkingAll || !!actionBusyId" @click="respondToLeave(item, 'reject')">Decline Request</button>
              </template>
            </template>
            <button
              v-else-if="item.type === 'GAME_JOIN_REJECTED'"
              type="button"
              class="notification__action notification__action--primary"
              :disabled="isMarkingAll || !!actionBusyId"
              @click="requestToJoinAgain(item)"
            >
              {{ actionBusyId === item.id ? 'Sending…' : 'Join Game' }}
            </button>
          </div>
        </li>
      </ul>
      <ion-button
        v-if="hasMore"
        expand="block"
        fill="clear"
        :disabled="isLoading"
        @click="notificationsStore.loadMore()"
        >{{ isLoading ? "Loading…" : "Load more" }}</ion-button
      >
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  onIonViewWillEnter,
} from "@ionic/vue";
import {
  checkmarkCircleOutline,
  flagOutline,
  heartOutline,
  personAddOutline,
  ribbonOutline,
  trophyOutline,
  notificationsOutline,
  chatbubbleOutline,
  mailOutline,
  closeCircleOutline,
  peopleOutline,
} from "ionicons/icons";
import UserAvatar from "@/components/common/UserAvatar.vue";
import SubPageHeader from "@/components/layout/SubPageHeader.vue";
import { useNow } from "@/composables/useNow";
import { useNotificationsStore } from "@/stores/notifications";
import { useFriendsStore } from "@/stores/friends";
import { useGamesStore } from "@/stores/games";
import { useJoinRequestsStore } from "@/stores/join-requests";
import { useGamePlayersStore } from "@/stores/game-players";
import type { AppNotification, NotificationType } from "@/types/notification";
import { joinRequestAction } from "@/utils/join-requests";
import { formatTimeAgo } from "@/utils/time";
import { showNotice } from "@/utils/notice";

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  GAME_JOIN_REQUEST: flagOutline,
  GAME_LEAVE_REQUEST: closeCircleOutline,
  GAME_LEAVE_APPROVED: checkmarkCircleOutline,
  GAME_LEAVE_REJECTED: closeCircleOutline,
  GAME_ATTENDANCE_CONFIRMED: checkmarkCircleOutline,
  GAME_NO_SHOW_REPORTED: closeCircleOutline,
  GAME_JOIN_ACCEPTED: checkmarkCircleOutline,
  GAME_JOIN_REJECTED: closeCircleOutline,
  GAME_FULL: peopleOutline,
  GAME_CANCELLED: closeCircleOutline,
  GAME_COMPLETED: trophyOutline,
  BADGE_UNLOCKED: ribbonOutline,
  FRIEND_REQUEST: personAddOutline,
  FRIEND_ACCEPTED: checkmarkCircleOutline,
  NEW_MESSAGE: chatbubbleOutline,
  MESSAGE_REQUEST: chatbubbleOutline,
  POST_LIKE: heartOutline,
  POST_COMMENT: chatbubbleOutline,
  REEL_LIKE: heartOutline,
  REEL_COMMENT: chatbubbleOutline,
  STORY_REPLY: chatbubbleOutline,
  LIVE_STARTED: notificationsOutline,
  NEW_FOLLOWER: personAddOutline,
  HELP_REQUEST_RECEIVED: mailOutline,
  HELP_REQUEST_UPDATED: checkmarkCircleOutline,
};

const router = useRouter();
const notificationsStore = useNotificationsStore();
const friendsStore = useFriendsStore();
const gamesStore = useGamesStore();
const joinRequestsStore = useJoinRequestsStore();
const gamePlayersStore = useGamePlayersStore();
const actionBusyId = ref<string | null>(null);
type GameNotificationAction = 'join-accepted' | 'leave-approved' | 'leave-rejected';
const GAME_ACTION_STORAGE_KEY = 'gora:completed-game-notification-actions';
function loadGameActionStatus(): Record<string, GameNotificationAction> {
  try {
    const saved = sessionStorage.getItem(GAME_ACTION_STORAGE_KEY);
    return saved ? JSON.parse(saved) as Record<string, GameNotificationAction> : {};
  } catch {
    return {};
  }
}
const gameActionStatus = ref(loadGameActionStatus());
function rememberGameAction(itemId: string, action: GameNotificationAction): void {
  gameActionStatus.value = { ...gameActionStatus.value, [itemId]: action };
  try { sessionStorage.setItem(GAME_ACTION_STORAGE_KEY, JSON.stringify(gameActionStatus.value)); } catch { /* the disabled state still works for this view */ }
}
const {
  items,
  unreadCount,
  error,
  isLoaded,
  isLoading,
  hasMore,
  readingId,
  isMarkingAll,
} = storeToRefs(notificationsStore);
const now = useNow();

function gameIdFor(item: AppNotification): string | null {
  const match = item.link?.match(/^\/games\/([^/?#]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function hasNotificationAction(item: AppNotification): boolean {
  if (item.type === 'FRIEND_REQUEST') return item.actor !== null;
  if (item.type === 'GAME_JOIN_REQUEST') return item.actor !== null && gameIdFor(item) !== null;
  if (item.type === 'GAME_LEAVE_REQUEST') return item.actor !== null && gameIdFor(item) !== null;
  return item.type === 'GAME_JOIN_REJECTED' && gameIdFor(item) !== null;
}

function getGameActionStatus(item: AppNotification): GameNotificationAction | 'join-rejected' | 'join-cancelled' | 'resolved' | null {
  return gameActionStatus.value[item.id] ?? item.actionStatus ?? null;
}

function joinRequestStatusLabel(status: ReturnType<typeof getGameActionStatus>): string {
  if (status === 'join-accepted') return 'Request Accepted';
  if (status === 'join-rejected') return 'Request Declined';
  if (status === 'join-cancelled') return 'Request Cancelled';
  return 'Request No Longer Pending';
}

async function completeNotificationAction(item: AppNotification, message: string): Promise<void> {
  await notificationsStore.markRead(item.id);
  void showNotice(message);
  void notificationsStore.load(true);
}

async function acceptFriend(item: AppNotification): Promise<void> {
  const actor = item.actor;
  if (!actor || actionBusyId.value) return;
  actionBusyId.value = item.id;
  try {
    await friendsStore.refresh();
    const request = friendsStore.requestWith(actor.id);
    if (!request || request.direction !== 'RECEIVED') {
      void showNotice('This friend request is no longer pending.');
      void notificationsStore.load(true);
      return;
    }
    if (await friendsStore.accept(request.id)) {
      await completeNotificationAction(item, `You and ${actor.displayName} are now friends.`);
    } else {
      void showNotice(friendsStore.error ?? 'Could not accept this friend request.');
    }
  } finally {
    actionBusyId.value = null;
  }
}

async function acceptGameRequest(item: AppNotification): Promise<void> {
  const gameId = gameIdFor(item);
  const actor = item.actor;
  if (!gameId || !actor || actionBusyId.value) return;
  actionBusyId.value = item.id;
  try {
    const gameResult = await gamesStore.fetchGame(gameId);
    if (!gameResult.ok) {
      void showNotice(gameResult.message);
      return;
    }
    const requestsResult = await joinRequestsStore.fetchGameJoinRequests(gameId);
    if (!requestsResult.ok) {
      void showNotice(requestsResult.message);
      return;
    }
    const request = joinRequestsStore.gameJoinRequests(gameId).find(
      (candidate) => candidate.userId === actor.id && candidate.status === 'PENDING',
    );
    if (!request) {
      void showNotice('This join request is no longer pending.');
      void notificationsStore.load(true);
      return;
    }
    const result = await joinRequestsStore.acceptJoinRequest(gameId, request.id);
    if (result.ok) {
      rememberGameAction(item.id, 'join-accepted');
      await completeNotificationAction(item, `${actor.displayName} joined the game.`);
    }
    else void showNotice(result.message);
  } finally {
    actionBusyId.value = null;
  }
}

async function respondToLeave(item: AppNotification, action: 'approve' | 'reject'): Promise<void> {
  const gameId = gameIdFor(item);
  const actor = item.actor;
  if (!gameId || !actor || actionBusyId.value) return;
  actionBusyId.value = item.id;
  try {
    const result = await gamePlayersStore.respondToLeaveRequest(gameId, actor.id, action);
    if (result.ok) {
      rememberGameAction(item.id, action === 'approve' ? 'leave-approved' : 'leave-rejected');
      await completeNotificationAction(item, action === 'approve' ? `${actor.displayName} was removed from the game. 1 GORA point was deducted.` : 'Leave request declined. The player remains in the game.');
    }
    else void showNotice(result.message);
  } finally {
    actionBusyId.value = null;
  }
}

async function requestToJoinAgain(item: AppNotification): Promise<void> {
  const gameId = gameIdFor(item);
  if (!gameId || actionBusyId.value) return;
  actionBusyId.value = item.id;
  try {
    const gameResult = await gamesStore.fetchGame(gameId);
    if (!gameResult.ok) {
      void showNotice(gameResult.message);
      return;
    }
    await Promise.all([
      joinRequestsStore.fetchMyJoinRequest(gameId),
      gamePlayersStore.fetchMyParticipation(gameId),
    ]);
    const game = gamesStore.gameById(gameId);
    if (!game) {
      void showNotice('This game is no longer available.');
      return;
    }
    const action = joinRequestAction(
      { ...game, isPlayer: game.isPlayer, isHost: game.isHost },
      joinRequestsStore.myJoinRequest(gameId),
      gamePlayersStore.participationOf(gameId),
    );
    if (action.kind !== 'request') {
      void showNotice(action.kind === 'closed' ? action.label : 'You cannot join this game right now.');
      return;
    }
    const result = await joinRequestsStore.createJoinRequest(gameId, null);
    if (!result.ok) {
      void showNotice(result.message);
      return;
    }
    const request = joinRequestsStore.myJoinRequest(gameId);
    await completeNotificationAction(
      item,
      request?.status === 'ACCEPTED' ? 'You joined the game.' : 'Your join request was sent.',
    );
  } finally {
    actionBusyId.value = null;
  }
}

async function openNotification(item: AppNotification): Promise<void> {
  if (!(await notificationsStore.markRead(item.id))) return;

  if (item.link) {
    void router.push(item.link);
  }
}

async function refresh(event: CustomEvent): Promise<void> {
  try {
    await notificationsStore.load(true);
  } finally {
    await (event.target as HTMLIonRefresherElement).complete();
  }
}
onIonViewWillEnter(() => {
  void notificationsStore.load(true);
});

onMounted(() => {
  void notificationsStore.load();
});
</script>

<style scoped>
.notifications {
  display: flex;
  max-width: 680px;
  flex-direction: column;
  gap: 8px;
  margin: 0 auto;
  padding: 12px 12px 32px;
  list-style: none;
}

.notifications__item {
  overflow: hidden;
  border: 1px solid var(--gora-line);
  border-radius: 18px;
  background: var(--gora-surface);
  animation: notification-in 0.3s ease-out both;
}

.notifications__item:nth-child(2) { animation-delay: 30ms; }
.notifications__item:nth-child(3) { animation-delay: 60ms; }
.notifications__item:nth-child(4) { animation-delay: 90ms; }
.notifications__item:nth-child(5) { animation-delay: 120ms; }
.notifications__item:nth-child(n + 6) { animation-delay: 150ms; }

.notifications__empty,
.notifications__feedback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: 64px 24px;
  color: var(--gora-muted);
  font-size: 0.95rem;
  font-weight: 600;
  text-align: center;
}

p.notifications__empty::before {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  border-radius: 24px;
  background: var(--gora-accent-soft);
  content: '🔔';
  font-size: 32px;
}

.notifications__feedback {
  margin: 16px 12px 0;
  padding: 12px 16px;
  border-radius: 16px;
  background: rgba(239, 91, 91, 0.1);
  color: #ef5b5b;
}

.notifications__feedback p {
  margin: 0;
}

.notification {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  gap: 14px;
  padding: 14px 14px 14px 16px;
  border: 0;
  background: transparent;
  color: var(--ion-text-color);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: background 0.2s;
}

.notification:hover {
  background: var(--gora-surface-raised);
}

.notification:active {
  background: var(--gora-surface-raised);
}

.notification:disabled {
  cursor: progress;
  opacity: 0.7;
}

.notification--unread {
  background: linear-gradient(90deg, rgba(255, 96, 40, 0.12), rgba(255, 96, 40, 0.03) 70%);
}

.notification--unread::before {
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--ion-color-primary);
  content: '';
}

.notification__icon {
  position: relative;
  display: flex;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--gora-accent-soft);
  color: var(--ion-color-primary);
  font-size: 22px;
}

.notification__type-dot {
  position: absolute;
  right: -3px;
  bottom: -3px;
  display: flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--gora-surface);
  border-radius: 50%;
  background: var(--ion-color-primary);
  color: #fff;
  font-size: 12px;
}

/* Colour by kind: likes red, comments blue, people green, badges gold. */
:is(.notification__icon--post_like, .notification__icon--reel_like) .notification__type-dot { background: #ef4b5b; }
:is(.notification__icon--post_comment, .notification__icon--reel_comment, .notification__icon--story_reply, .notification__icon--new_message, .notification__icon--message_request) .notification__type-dot { background: #3b82f6; }
:is(.notification__icon--friend_request, .notification__icon--friend_accepted, .notification__icon--new_follower, .notification__icon--club_join_request, .notification__icon--club_join_accepted, .notification__icon--club_leave_request, .notification__icon--club_leave_accepted) .notification__type-dot { background: #2fbf71; }
:is(.notification__icon--live_started) .notification__type-dot { background: #e11d48; }
:is(.notification__icon--game_join_rejected, .notification__icon--game_cancelled, .notification__icon--game_leave_rejected, .notification__icon--game_no_show_reported, .notification__icon--club_join_rejected, .notification__icon--club_leave_rejected) .notification__type-dot { background: #6b7280; }

.notification__icon--badge_unlocked {
  background: linear-gradient(135deg, #f5c84b, #ff9f1c);
  color: #3a2500;
}

.notification__icon--game_cancelled,
.notification__icon--game_join_rejected,
.notification__icon--game_leave_rejected {
  background: rgba(239, 91, 91, 0.12);
  color: #ef5b5b;
}

.notification__text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  font-size: 0.86rem;
  line-height: 1.35;
}

.notification__text strong {
  font-size: 0.9rem;
  font-weight: 800;
}

.notification__text span {
  display: -webkit-box;
  overflow: hidden;
  color: var(--gora-muted);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.notification__text time {
  margin-top: 1px;
  color: var(--gora-muted);
  font-size: 0.72rem;
  font-weight: 600;
}

.notification--unread .notification__text time {
  color: var(--ion-color-primary);
}

.notification__unread {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--ion-color-primary);
  box-shadow: 0 0 0 4px rgba(255, 96, 40, 0.18);
}

.notification__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 14px 14px 78px;
}

.notification__action {
  min-height: 38px;
  padding: 8px 16px;
  border: 1px solid var(--gora-line-strong);
  border-radius: 999px;
  background: var(--gora-surface-raised);
  color: var(--ion-text-color);
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 800;
  transition: transform 0.15s, filter 0.2s;
}

.notification__action:not(:disabled):active {
  transform: scale(0.97);
}

.notification__action--primary {
  border-color: transparent;
  background: linear-gradient(135deg, var(--ion-color-primary), #ff8a3d);
  color: var(--ion-color-primary-contrast);
}

.notification__action:disabled {
  cursor: progress;
  opacity: 0.6;
}

.notification__action-status {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--gora-surface-raised);
  color: var(--gora-muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.notification__action-status::before {
  color: #2fbf71;
  content: '✓';
  font-weight: 900;
}

@keyframes notification-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .notifications__item {
    animation: none;
  }
}

@media (max-width: 380px) {
  .notification__actions {
    padding-left: 14px;
  }
}
</style>
