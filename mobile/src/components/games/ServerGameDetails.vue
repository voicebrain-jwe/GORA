<template>
  <p v-if="!game && status === 'error'" class="server-game__missing" role="alert">{{ error }}</p>
  <p v-else-if="!game" class="server-game__missing">Loading game…</p>

  <div v-else class="server-game">
    <header class="sg-hero">
      <img class="sg-hero__img" :src="sportImage" alt="" aria-hidden="true" />
      <div class="sg-hero__shade" :style="{ '--sport-tint': visual.gradient }" aria-hidden="true" />
      <div class="sg-hero__top">
        <span class="sg-hero__sport">
          <SportIcon :name="game.sport.name" :icon-url="game.sport.iconUrl" :size="20" />
          {{ game.sport.name }}
        </span>
        <GameStatusBadge :status="game.status" />
        <div class="sg-hero__actions">
          <button type="button" class="sg-hero__btn" aria-label="Share game" @click="shareGame">
            <ion-icon :icon="shareSocialOutline" aria-hidden="true" />
          </button>
          <button
            v-if="game.isHost && (game.canEdit || game.canCancel)"
            type="button"
            class="sg-hero__btn"
            aria-label="More game options"
            :disabled="gamesStore.cancellingId === game.id"
            @click="openHostActions"
          >
            <ion-icon :icon="ellipsisHorizontal" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div class="sg-hero__body">
        <h1 class="sg-hero__title">{{ game.title }}</h1>
        <p v-if="game.description" class="sg-hero__description">{{ game.description }}</p>
        <router-link :to="`/profile/${game.host.username}`" class="sg-hero__host">
          <UserAvatar :user="gameHostSummary(game)" :size="26" />
          <span>Hosted by <strong>{{ game.host.displayName }}</strong></span>
        </router-link>
      </div>
    </header>

    <div class="sg-layout">
      <div class="sg-main">
        <p v-if="game.status === 'CANCELLED'" class="sg-notice sg-notice--cancelled">
          <ion-icon :icon="closeCircleOutline" aria-hidden="true" /> The host cancelled this game.
        </p>
        <p v-else-if="game.status === 'COMPLETED'" class="sg-notice">
          <ion-icon :icon="checkmarkDoneOutline" aria-hidden="true" /> This game has been played.
        </p>

        <section class="sg-stats" aria-label="When">
          <div class="sg-stat">
            <span class="sg-stat__icon"><ion-icon :icon="calendarOutline" aria-hidden="true" /></span>
            <span class="sg-stat__label">Date</span>
            <strong>{{ formatGameDay(game.gameDate) }}</strong>
          </div>
          <div class="sg-stat">
            <span class="sg-stat__icon"><ion-icon :icon="timeOutline" aria-hidden="true" /></span>
            <span class="sg-stat__label">Time</span>
            <strong>{{ formatGameTimeRange(game.startTime, game.endTime) }}</strong>
          </div>
          <div class="sg-stat">
            <span class="sg-stat__icon"><ion-icon :icon="peopleOutline" aria-hidden="true" /></span>
            <span class="sg-stat__label">Players</span>
            <strong>{{ game.currentPlayers }}/{{ game.requiredPlayers }}</strong>
          </div>
        </section>

        <section class="sg-card sg-place" aria-label="Location">
          <component
            :is="mapPath ? RouterLink : 'div'"
            :to="mapPath ?? undefined"
            class="sg-place__row"
            :aria-label="mapPath ? `Location: ${game.locationName}. Open map` : undefined"
          >
            <span class="sg-icon-box"><ion-icon :icon="locationOutline" aria-hidden="true" /></span>
            <span class="sg-place__text">
              <small>Location</small>
              <strong>{{ game.locationName }}</strong>
            </span>
            <span v-if="mapPath" class="sg-place__go">
              Map <ion-icon :icon="chevronForward" aria-hidden="true" />
            </span>
          </component>
          <GameLocationPreview
            v-if="mapPath && game.latitude !== null && game.longitude !== null"
            class="sg-place__map"
            :name="game.locationName"
            :latitude="game.latitude"
            :longitude="game.longitude"
            :map-path="mapPath"
          />
        </section>

        <section class="sg-card sg-roster" aria-label="Player roster">
          <div class="sg-card__head">
            <h2 class="sg-card__title">Player roster</h2>
            <span class="sg-chip">{{ game.currentPlayers }} of {{ game.requiredPlayers }}</span>
          </div>
          <p v-if="rosterStatus === 'error' && !roster" class="server-game__hint" role="alert">
            {{ rosterError }}
            <button type="button" class="server-game__link" @click="reloadRoster">Try again</button>
          </p>
          <ol class="sg-roster__list">
            <li v-for="slot in slots" :key="slot.label" class="sg-slot" :class="{ 'sg-slot--open': !slot.player }">
              <template v-if="slot.player">
                <router-link :to="`/profile/${slot.player.username}`" class="sg-slot__player">
                  <UserAvatar :user="rosterPlayerSummary(slot.player)" :size="38" />
                  <span class="sg-slot__name">
                    <strong>{{ slot.player.displayName }}</strong>
                    <span>@{{ slot.player.username }}</span>
                  </span>
                  <span v-if="slot.player.id === viewerId" class="sg-tag">You</span>
                </router-link>
            <div v-if="game.isHost && game.status === 'COMPLETED'" class="server-game__attendance">
              <span v-if="slot.player.attendanceStatus === 'ATTENDED'" class="server-game__attendance-state server-game__attendance-state--present">Attended · +3 GORA</span>
              <span v-else-if="slot.player.attendanceStatus === 'NO_SHOW'" class="server-game__attendance-state server-game__attendance-state--absent">Reported no-show · −2 GORA</span>
              <template v-else>
                <button type="button" class="server-game__attendance-present" :disabled="gamePlayers.attendanceUserId !== null" @click="confirmAttendance(slot.player, 'attended')">{{ gamePlayers.attendanceUserId === slot.player.id ? 'Saving…' : 'Confirm Attended (+3)' }}</button>
                <button type="button" class="server-game__attendance-absent" :disabled="gamePlayers.attendanceUserId !== null" @click="confirmAttendance(slot.player, 'no_show')">Report No-show (−2)</button>
              </template>
            </div>
            <button
              v-else-if="game.isHost && isManaging && game.status !== 'COMPLETED'"
              type="button"
              class="server-game__remove"
              :disabled="gamePlayers.removingUserId !== null"
              :aria-label="`Remove ${slot.player.displayName}`"
              @click="confirmRemove(slot.player)"
            >
              {{ gamePlayers.removingUserId === slot.player.id ? 'Removing…' : 'Remove Player' }}
            </button>
              </template>
              <template v-else>
                <span class="sg-slot__open-icon" aria-hidden="true"><ion-icon :icon="addOutline" /></span>
                <span class="sg-slot__open">Open spot</span>
              </template>
            </li>
          </ol>
        </section>

        <GameComments class="sg-comments" :game-id="game.id" :host-id="game.host.id" />
      </div>

      <aside class="sg-side">
        <section class="sg-card sg-capacity" aria-label="Player capacity">
          <div class="sg-capacity__top">
            <span class="sg-stat__label">Spots filled</span>
            <strong>{{ game.currentPlayers }}<span>/{{ game.requiredPlayers }}</span></strong>
          </div>
          <div
            class="sg-capacity__bar"
            role="progressbar"
            :aria-valuenow="game.currentPlayers"
            aria-valuemin="0"
            :aria-valuemax="game.requiredPlayers"
          >
            <span :style="{ width: `${Math.min(100, (game.currentPlayers / game.requiredPlayers) * 100)}%` }" />
          </div>
          <p class="sg-capacity__left">{{ remainingLabel }}</p>
        </section>

        <section class="sg-card sg-rules" aria-label="How to join">
          <div class="sg-rule">
            <span class="sg-icon-box" :class="{ 'sg-icon-box--green': game.autoAccept }">
              <ion-icon :icon="game.autoAccept ? flashOutline : shieldCheckmarkOutline" aria-hidden="true" />
            </span>
            <span>
              <strong>{{ game.autoAccept ? 'Instant join' : 'Host approval' }}</strong>
              <small>{{ game.autoAccept ? 'Join right away while spots are open.' : 'The host reviews each join request.' }}</small>
            </span>
          </div>
          <div class="sg-rule">
            <span class="sg-icon-box"><ion-icon :icon="hourglassOutline" aria-hidden="true" /></span>
            <span>
              <strong>Registration closes</strong>
              <small>{{ game.registrationClosesAt ? formatRegistrationDeadline(game.registrationClosesAt) : 'When the game starts' }}</small>
            </span>
          </div>
        </section>

        <section v-if="club" class="sg-card sg-host" aria-label="Club">
          <router-link :to="`/clubs/${club.id}`" class="sg-host__row">
            <ClubAvatar :club="club" :image-url="game.club?.profileImageUrl ?? null" :size="44" />
            <span>
              <small>Club game</small>
              <strong>{{ club.name }}</strong>
            </span>
            <ion-icon :icon="chevronForward" class="sg-host__go" aria-hidden="true" />
          </router-link>
        </section>

        <HostJoinRequests v-if="game.isHost" class="server-game__requests" :game="game" />
        <HostLeaveRequests v-if="game.isHost" class="server-game__requests" :game="game" />

        <div class="server-game__actions">
      <template v-if="game.isHost">
        <button
          v-if="roster && roster.players.length > 0 && game.status !== 'COMPLETED'"
          type="button"
          class="server-game__secondary"
          :aria-pressed="isManaging"
          @click="isManaging = !isManaging"
        >
          {{ isManaging ? 'Done Managing' : 'Manage Players' }}
        </button>
      </template>
      <template v-else-if="action.kind === 'player'">
        <p class="server-game__hint">✓ You're playing in this game.</p>
        <button
          v-if="game.status === 'OPEN' || game.status === 'FULL' || game.status === 'CANCELLED'"
          type="button"
          :class="leaveRequest?.status === 'PENDING' ? 'server-game__secondary' : 'server-game__danger'"
          :disabled="isLeaveRequestBusy"
          @click="confirmLeave(game)"
        >
          {{ isLeaveRequestBusy ? 'Please wait…' : leaveRequest?.status === 'PENDING' ? 'Cancel Leave Request' : 'Request to Leave' }}
        </button>
      </template>
      <button v-else-if="!isRequestKnown" type="button" class="server-game__primary" disabled>
        Checking your request…
      </button>
      <template v-else-if="action.kind === 'request'">
        <p v-if="pastNote" class="server-game__hint">{{ pastNote }}</p>
        <button type="button" class="server-game__primary" :disabled="isSubmitting" @click="openRequestModal">
          {{ game.autoAccept ? 'Join Game' : 'Request to Join' }}
        </button>
      </template>
      <template v-else-if="action.kind === 'pending'">
        <button type="button" class="server-game__primary" disabled>Request Pending</button>
        <button type="button" class="server-game__secondary" :disabled="isSubmitting" @click="confirmCancelRequest">
          {{ isSubmitting ? 'Cancelling…' : 'Cancel Request' }}
        </button>
      </template>
      <p v-else-if="action.kind === 'declined'" class="server-game__declined" role="status">Request declined</p>
      <button
        v-else-if="action.kind === 'closed'"
        type="button"
        class="server-game__primary"
        disabled
      >
        {{ action.label }}
      </button>
    </div>

      </aside>
    </div>

    <JoinRequestModal
      :is-open="isRequestModalOpen"
      :game-title="game.title"
      :host-name="game.host.displayName"
      :auto-accept="game.autoAccept"
      :is-submitting="isSubmitting"
      :error="requestError"
      @close="isRequestModalOpen = false"
      @send="sendRequest"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { actionSheetController, IonIcon, alertController } from '@ionic/vue';
import {
  addOutline,
  calendarOutline,
  checkmarkDoneOutline,
  chevronForward,
  closeCircleOutline,
  createOutline,
  ellipsisHorizontal,
  flashOutline,
  hourglassOutline,
  locationOutline,
  peopleOutline,
  shareSocialOutline,
  shieldCheckmarkOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import ClubAvatar from '@/components/clubs/ClubAvatar.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import SportIcon from '@/components/sports/SportIcon.vue';
import { useGameShare } from '@/composables/useGameShare';
import { useAuthStore } from '@/stores/auth';
import { useGamePlayersStore } from '@/stores/game-players';
import { useGamesStore } from '@/stores/games';
import { useJoinRequestsStore } from '@/stores/join-requests';
import type { ApiGame } from '@/types/game';
import type { RosterPlayer } from '@/types/game-player';
import {
  formatGameDay,
  formatRegistrationDeadline,
  formatGameTimeRange,
  gameClubSummary,
  gameHostSummary,
} from '@/utils/game-form';
import { buildRosterSlots } from '@/utils/games';
import { joinRequestAction, pastParticipationNote, rosterPlayerSummary } from '@/utils/join-requests';
import { locationMapPath } from '@/utils/location-map';
import { showNotice } from '@/utils/notice';
import { getSportImage, getSportVisual } from '@/utils/sports';
import GameComments from './GameComments.vue';
import GameStatusBadge from './GameStatusBadge.vue';
import GameLocationPreview from '@/components/map/GameLocationPreview.vue';
import HostJoinRequests from './HostJoinRequests.vue';
import HostLeaveRequests from './HostLeaveRequests.vue';
import JoinRequestModal from './JoinRequestModal.vue';

const props = defineProps<{ gameId: string }>();
const router = useRouter();

const auth = useAuthStore();
const gamesStore = useGamesStore();
const joinRequests = useJoinRequestsStore();
const gamePlayers = useGamePlayersStore();
const { shareGame: openGameShare } = useGameShare();
const isRequestModalOpen = ref(false);
const isManaging = ref(false);
const requestError = ref<string | null>(null);

const game = computed(() => gamesStore.gameById(props.gameId));
const myRequest = computed(() => joinRequests.myJoinRequest(props.gameId));
const participation = computed(() => gamePlayers.participationOf(props.gameId));
const leaveRequest = computed(() => gamePlayers.leaveRequestByGame[props.gameId] ?? null);
const isLeaveRequestBusy = ref(false);
const isRequestKnown = computed(() => {
  const loadStatus = joinRequests.mineStatus[props.gameId];
  return loadStatus === 'ready' || loadStatus === 'error' || props.gameId in joinRequests.mineByGame;
});
const action = computed(() =>
  game.value ? joinRequestAction(game.value, myRequest.value, participation.value) : { kind: 'host' as const },
);
const pastNote = computed(() => pastParticipationNote(participation.value));
const roster = computed(() => gamePlayers.rosterOf(props.gameId));
const rosterStatus = computed(() => gamePlayers.rosterStatus[props.gameId] ?? 'idle');
const rosterError = computed(() => gamePlayers.rosterError[props.gameId] ?? 'Could not load the roster.');
const viewerId = computed(() => auth.currentUser?.id ?? null);
const isSubmitting = computed(() => joinRequests.submittingGameId === props.gameId);
const status = computed(() => gamesStore.detailStatus[props.gameId]);
const error = computed(() => gamesStore.detailError[props.gameId] ?? 'This game is not available.');
const visual = computed(() => getSportVisual(game.value?.sport.name ?? ''));
const sportImage = computed(() => getSportImage(game.value?.sport.name ?? ''));
const club = computed(() => (game.value ? gameClubSummary(game.value) : null));
// ACTIVE players from the server fill the first slots; the rest are generated as Open.
const slots = computed(() =>
  game.value ? buildRosterSlots<RosterPlayer>(game.value.requiredPlayers, roster.value?.players ?? []) : [],
);
const remainingLabel = computed(() => {
  const left = game.value?.remainingSlots ?? 0;
  return left === 0 ? 'No slots left' : `${left} ${left === 1 ? 'slot' : 'slots'} left`;
});

async function confirmAttendance(player: RosterPlayer, action: 'attended' | 'no_show'): Promise<void> {
  const attended = action === 'attended';
  const alert = await alertController.create({
    header: attended ? `Confirm ${player.displayName} attended?` : `Report ${player.displayName} as no-show?`,
    message: attended ? 'The player will receive 3 GORA points.' : 'The player will lose 2 GORA points. Confirm only if they did not attend the venue.',
    buttons: [{ text: 'Go Back', role: 'cancel' }, { text: attended ? 'Confirm Attendance' : 'Report No-show', role: 'destructive' }],
  });
  await alert.present();
  const { role } = await alert.onDidDismiss();
  if (role !== 'destructive') return;
  const result = await gamePlayers.setAttendance(props.gameId, player.id, action);
  void showNotice(result.ok ? attended ? `${player.displayName} confirmed. 3 GORA points awarded.` : `${player.displayName} reported as no-show. 2 GORA points deducted.` : result.message);
}

onMounted(() => {
  void gamePlayers.fetchMyParticipation(props.gameId);
  void gamePlayers.fetchMyLeaveRequest(props.gameId);
  void gamePlayers.fetchPlayers(props.gameId);
  if (game.value?.isHost) void gamePlayers.fetchHostLeaveRequests(props.gameId);
});

async function shareGame(): Promise<void> {
  const current = game.value;
  if (!current) return;
  await openGameShare({
    id: current.id,
    title: current.title,
    sport: current.sport.name,
    locationName: current.locationName,
    when: `${formatGameDay(current.gameDate)} · ${formatGameTimeRange(current.startTime, current.endTime)}`,
  });
}

async function openHostActions(): Promise<void> {
  const current = game.value;
  if (!current?.isHost) return;
  const buttons = [];
  if (current.canEdit) {
    buttons.push({
      text: 'Edit Game',
      icon: createOutline,
      handler: () => void router.push(`/games/${current.id}/edit`),
    });
  }
  if (current.canCancel) {
    buttons.push({
      text: 'Cancel Game',
      role: 'destructive' as const,
      icon: trashOutline,
      handler: () => void confirmCancel(current),
    });
  }
  buttons.push({ text: 'Close', role: 'cancel' as const });
  const sheet = await actionSheetController.create({ header: 'Game options', buttons });
  await sheet.present();
}
const mapPath = computed(() => {
  const value = game.value;

  if (!value || value.latitude === null || value.longitude === null) {
    return null;
  }

  return locationMapPath({ name: value.locationName, latitude: value.latitude, longitude: value.longitude });
});

async function confirmCancel(target: ApiGame): Promise<void> {
  const alert = await alertController.create({
    header: `Cancel "${target.title}"?`,
    message: 'The game stays visible as cancelled. This cannot be undone.',
    buttons: [
      { text: 'Keep Game', role: 'cancel' },
      { text: 'Cancel Game', role: 'destructive' },
    ],
  });

  await alert.present();
  const { role } = await alert.onDidDismiss();

  if (role !== 'destructive') {
    return;
  }

  const result = await gamesStore.cancelGame(target.id);
  void showNotice(result.ok ? 'Game cancelled.' : result.message);
}

function reloadRoster(): void {
  void gamePlayers.fetchPlayers(props.gameId);
}

async function confirmLeave(target: ApiGame): Promise<void> {
  if (isLeaveRequestBusy.value) return;
  const pending = leaveRequest.value?.status === 'PENDING';
  const alert = await alertController.create({
    header: pending ? 'Withdraw leave request?' : 'Request to leave?',
    message: pending ? 'The host will no longer see your request.' : 'The host must approve before your slot is released. One GORA point will be deducted if approved.',
    buttons: [
      { text: 'Go Back', role: 'cancel' },
      { text: pending ? 'Withdraw Request' : 'Send Request', role: 'destructive' },
    ],
  });

  await alert.present();
  const { role } = await alert.onDidDismiss();

  if (role !== 'destructive') {
    return;
  }

  isLeaveRequestBusy.value = true;
  const result = pending ? await gamePlayers.cancelMyLeaveRequest(target.id) : await gamePlayers.requestLeaveGame(target.id);
  isLeaveRequestBusy.value = false;
  void showNotice(result.ok ? (pending ? 'Your leave request was withdrawn.' : 'Your leave request was sent to the host.') : result.message);
}

async function confirmRemove(player: RosterPlayer): Promise<void> {
  const alert = await alertController.create({
    header: `Remove ${player.displayName}?`,
    message: 'Their slot opens again. They can send a new request later.',
    buttons: [
      { text: 'Keep Player', role: 'cancel' },
      { text: 'Remove Player', role: 'destructive' },
    ],
  });

  await alert.present();
  const { role } = await alert.onDidDismiss();

  if (role !== 'destructive') {
    return;
  }

  const result = await gamePlayers.removePlayer(props.gameId, player.id);
  void showNotice(result.ok ? `${player.displayName} was removed.` : result.message);
}

function openRequestModal(): void {
  requestError.value = null;
  isRequestModalOpen.value = true;
}

async function sendRequest(message: string | null): Promise<void> {
  if (isSubmitting.value) {
    return;
  }

  const result = await joinRequests.createJoinRequest(props.gameId, message);

  if (result.ok) {
    isRequestModalOpen.value = false;
    void showNotice(myRequest.value?.status === 'ACCEPTED'
      ? 'You joined the game. Your slot is confirmed.'
      : `Request sent. ${game.value?.host.displayName ?? 'The host'} will review it.`);
  } else {
    requestError.value = result.message;
  }
}

async function confirmCancelRequest(): Promise<void> {
  const alert = await alertController.create({
    header: 'Cancel your request?',
    message: 'The host will no longer see it. You can ask again later while the game is open.',
    buttons: [
      { text: 'Keep Request', role: 'cancel' },
      { text: 'Cancel Request', role: 'destructive' },
    ],
  });

  await alert.present();
  const { role } = await alert.onDidDismiss();

  if (role !== 'destructive') {
    return;
  }

  const result = await joinRequests.cancelJoinRequest(props.gameId);
  void showNotice(result.ok ? 'Request cancelled.' : result.message);
}
</script>

<style scoped>
.server-game {
  padding: 12px 0 0;
  animation: sg-in 0.35s ease-out;
}

.server-game__missing {
  margin: 48px 16px;
  color: var(--gora-muted);
  text-align: center;
}

/* ───────── Hero ───────── */
.sg-hero {
  position: relative;
  display: flex;
  overflow: hidden;
  min-height: 300px;
  flex-direction: column;
  justify-content: space-between;
  margin: 0 12px;
  padding: 14px;
  border-radius: 24px;
  background: #111;
  box-shadow: 0 18px 40px -20px rgba(0, 0, 0, 0.7);
  color: #fff;
  isolation: isolate;
}

.sg-hero__img {
  position: absolute;
  z-index: -2;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: sg-zoom 14s ease-in-out infinite alternate;
}

.sg-hero__shade {
  position: absolute;
  z-index: -1;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0.05) 35%, rgba(0, 0, 0, 0.55) 62%, rgba(0, 0, 0, 0.92) 100%);
}

.sg-hero__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.sg-hero__sport {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px 4px 5px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sg-hero__actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.sg-hero__btn {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  color: #fff;
  cursor: pointer;
  font-size: 19px;
  transition: transform 0.2s, background 0.2s;
}

.sg-hero__btn:hover {
  background: rgba(0, 0, 0, 0.65);
  transform: scale(1.06);
}

.sg-hero__btn:disabled {
  cursor: progress;
  opacity: 0.55;
}

.sg-hero__body {
  padding: 4px 4px 2px;
}

.sg-hero__title {
  margin: 0 0 6px;
  font-size: clamp(1.55rem, 6.5vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.08;
  overflow-wrap: anywhere;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.5);
}

.sg-hero__description {
  display: -webkit-box;
  overflow: hidden;
  margin: 0 0 12px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.9rem;
  line-height: 1.45;
  white-space: pre-line;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.sg-hero__host {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.8rem;
  text-decoration: none;
}

.sg-hero__host strong {
  color: #fff;
}

/* ───────── Layout ───────── */
.sg-layout {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 12px 0;
}

.sg-main,
.sg-side {
  display: contents;
}

/* Phone order: quick facts first, then how to join, place, people. */
.sg-notice { order: 0; }
.sg-stats { order: 1; }
.sg-capacity { order: 2; }
.sg-rules { order: 3; }
.sg-place { order: 4; }
.sg-host { order: 5; }
.sg-roster { order: 6; }
.sg-comments { order: 7; }
.server-game__requests { order: 8; }
.server-game__actions { order: 9; }

.sg-card {
  padding: 16px;
  border: 1px solid var(--gora-line);
  border-radius: 20px;
  background: var(--gora-surface);
}

.sg-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.sg-card__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
}

.sg-chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--gora-accent-soft);
  color: var(--ion-color-primary);
  font-size: 0.75rem;
  font-weight: 800;
}

.sg-icon-box {
  display: grid;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 13px;
  background: var(--gora-accent-soft);
  color: var(--ion-color-primary);
  font-size: 1.25rem;
}

.sg-icon-box--green {
  background: rgba(47, 191, 113, 0.14);
  color: #2fbf71;
}

.sg-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 12px 14px;
  border-radius: 16px;
  background: var(--gora-surface);
  color: var(--gora-muted);
  font-size: 0.88rem;
  font-weight: 700;
}

.sg-notice ion-icon {
  font-size: 1.2rem;
}

.sg-notice--cancelled {
  background: rgba(239, 91, 91, 0.12);
  color: #ef5b5b;
}

/* Date / Time / Players */
.sg-stats {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.sg-stat {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
  padding: 14px 12px;
  border: 1px solid var(--gora-line);
  border-radius: 18px;
  background: var(--gora-surface);
}

.sg-stat__icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  margin-bottom: 8px;
  border-radius: 11px;
  background: var(--gora-accent-soft);
  color: var(--ion-color-primary);
  font-size: 1.1rem;
}

.sg-stat__label {
  color: var(--gora-muted);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sg-stat strong {
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

/* Capacity */
.sg-capacity__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

.sg-capacity__top strong {
  font-size: 1.6rem;
  font-weight: 800;
  line-height: 1;
}

.sg-capacity__top strong span {
  color: var(--gora-muted);
  font-size: 1rem;
}

.sg-capacity__bar {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--gora-line);
}

.sg-capacity__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--ion-color-primary), #ffb347);
  animation: sg-fill 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
  transform-origin: left;
}

.sg-capacity__left {
  margin: 10px 0 0;
  color: var(--gora-muted);
  font-size: 0.82rem;
  font-weight: 600;
}

/* Join rules */
.sg-rules {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sg-rule {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sg-rule > span:last-child,
.sg-place__text,
.sg-host__row > span {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.sg-rule strong,
.sg-place__text strong,
.sg-host__row strong {
  font-size: 0.92rem;
  font-weight: 800;
}

.sg-rule small,
.sg-place__text small,
.sg-host__row small {
  color: var(--gora-muted);
  font-size: 0.78rem;
  line-height: 1.35;
}

/* Location */
.sg-place {
  padding: 0;
  overflow: hidden;
}

.sg-place__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  color: var(--ion-text-color);
  text-decoration: none;
}

.sg-place__go {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  padding: 6px 10px 6px 12px;
  border-radius: 999px;
  background: var(--gora-accent-soft);
  color: var(--ion-color-primary);
  font-size: 0.78rem;
  font-weight: 800;
  white-space: nowrap;
}

.sg-place__map {
  display: block;
  margin: 0 12px 12px;
}

/* Host / club */
.sg-host {
  padding: 0;
}

.sg-host__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  color: var(--ion-text-color);
  text-decoration: none;
}

.sg-host__go {
  margin-left: auto;
  color: var(--gora-muted);
}

/* Roster */
.sg-roster__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sg-slot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 8px 12px;
  border-radius: 14px;
  background: var(--gora-surface-raised);
}

.sg-slot--open {
  border: 1.5px dashed var(--gora-line-strong);
  background: transparent;
}

.sg-slot__player {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 10px;
  color: var(--ion-text-color);
  text-decoration: none;
}

.sg-slot__name {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.sg-slot__name strong {
  overflow: hidden;
  font-size: 0.9rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sg-slot__name span {
  overflow: hidden;
  color: var(--gora-muted);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sg-tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--gora-accent-soft);
  color: var(--ion-color-primary);
  font-size: 0.68rem;
  font-weight: 800;
}

.sg-slot__open-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1.5px dashed var(--gora-line-strong);
  border-radius: 50%;
  color: var(--gora-muted);
  font-size: 1.1rem;
}

.sg-slot__open {
  color: var(--gora-muted);
  font-size: 0.86rem;
  font-weight: 600;
}

.server-game__requests {
  display: block;
}

/* ───────── Actions (sticky on phones) ───────── */
.server-game__actions {
  position: sticky;
  z-index: 5;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0 -12px;
  padding: 12px 16px calc(14px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--gora-line);
  background: color-mix(in srgb, var(--gora-surface) 88%, transparent);
  backdrop-filter: blur(14px);
}

.server-game__actions:empty {
  display: none;
}

.server-game__primary,
.server-game__secondary,
.server-game__danger {
  display: block;
  width: 100%;
  min-height: 50px;
  padding: 13px 16px;
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-weight: 800;
  text-align: center;
  text-decoration: none;
  transition: transform 0.15s, box-shadow 0.2s;
}

.server-game__primary {
  border: 0;
  background: linear-gradient(135deg, var(--ion-color-primary), #ff8a3d);
  box-shadow: 0 12px 26px -12px rgba(255, 96, 40, 0.8);
  color: var(--ion-color-primary-contrast);
}

.server-game__primary:not(:disabled):active {
  transform: scale(0.98);
}

.server-game__primary:disabled {
  border: 1px solid var(--gora-line-strong);
  background: transparent;
  box-shadow: none;
  color: var(--gora-muted);
  cursor: default;
}

.server-game__secondary {
  border: 1px solid var(--gora-line-strong);
  background: transparent;
  color: var(--ion-text-color);
}

.server-game__secondary:disabled,
.server-game__danger:disabled {
  opacity: 0.6;
  cursor: default;
}

.server-game__danger {
  border: 1px solid rgba(239, 91, 91, 0.5);
  background: transparent;
  color: #ef5b5b;
}

.server-game__hint {
  margin: 0;
  color: var(--gora-muted);
  font-size: 0.82rem;
  text-align: center;
}

.server-game__declined {
  margin: 0;
  padding: 12px 16px;
  border-radius: 16px;
  background: rgba(239, 91, 91, 0.12);
  color: #ef5b5b;
  font-weight: 700;
  text-align: center;
}

.server-game__link {
  margin-left: 6px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ion-color-primary);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.server-game__remove {
  margin-left: auto;
  padding: 6px 12px;
  border: 1px solid rgba(239, 91, 91, 0.5);
  border-radius: 999px;
  background: transparent;
  color: #ef5b5b;
  cursor: pointer;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 700;
}

.server-game__remove:disabled {
  opacity: 0.6;
  cursor: default;
}

.server-game__attendance {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.server-game__attendance-state {
  font-size: 0.72rem;
  font-weight: 800;
}

.server-game__attendance-state--present { color: #e4b74e; }
.server-game__attendance-state--absent { color: #ff8b75; }

.server-game__attendance-present,
.server-game__attendance-absent {
  min-height: 34px;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-size: 0.7rem;
  font-weight: 800;
}

.server-game__attendance-present {
  border: 0;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}

.server-game__attendance-absent {
  border: 1px solid #a84d46;
  background: transparent;
  color: #ff9a8d;
}

.server-game__attendance-present:disabled,
.server-game__attendance-absent:disabled { opacity: 0.55; cursor: default; }

@keyframes sg-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

@keyframes sg-zoom {
  from { transform: scale(1); }
  to { transform: scale(1.08); }
}

@keyframes sg-fill {
  from { transform: scaleX(0); }
}

@media (prefers-reduced-motion: reduce) {
  .server-game,
  .sg-hero__img,
  .sg-capacity__bar span {
    animation: none;
  }
}

@media (max-width: 380px) {
  .sg-stats {
    grid-template-columns: 1fr 1fr;
  }

  .sg-stat:last-child {
    grid-column: 1 / -1;
  }
}

/* ───────── Tablet / desktop: two columns ───────── */
@media (min-width: 900px) {
  .server-game {
    max-width: 1180px;
    margin-inline: auto;
    padding: 20px 0 48px;
  }

  .sg-hero {
    min-height: 380px;
    margin: 0;
    padding: 22px 26px;
    border-radius: 28px;
  }

  .sg-hero__body {
    max-width: 760px;
    padding: 0 4px 6px;
  }

  .sg-hero__title {
    font-size: clamp(2.2rem, 4vw, 3.2rem);
  }

  .sg-layout {
    display: grid;
    align-items: start;
    gap: 22px;
    padding: 22px 0 0;
    grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
  }

  .sg-main,
  .sg-side {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 18px;
  }

  .sg-side {
    position: sticky;
    top: 20px;
  }

  .sg-card {
    padding: 20px 22px;
  }

  .sg-place,
  .sg-host {
    padding: 0;
  }

  .sg-place__row,
  .sg-host__row {
    padding: 18px 22px;
  }

  .sg-place__map {
    margin: 0 16px 16px;
  }

  .sg-place :deep(.game-location-preview__map) {
    height: 300px;
  }

  .server-game__actions {
    position: static;
    margin: 0;
    padding: 18px;
    border: 1px solid var(--gora-line);
    border-radius: 20px;
    background: var(--gora-surface);
    backdrop-filter: none;
  }
}
</style>
