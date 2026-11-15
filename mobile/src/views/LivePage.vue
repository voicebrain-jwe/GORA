<template>
  <ion-page>
    <SubPageHeader :title="isCreate ? 'Go Live' : 'Watch Live'" back-href="/home" />
    <ion-content>
      <main class="live-page" :class="{ 'live-page--with-chat': live?.status === 'LIVE' }">
        <div class="live-page__main">
          <div class="live-page__stage">
            <video
              ref="video"
              autoplay
              playsinline
              :class="{ 'live-page__video--mirror': !!localStream && facing === 'user' }"
              :muted="isCreate || muted"
            />

            <div v-if="!localStream && !remoteStream" class="live-page__placeholder">
              <span class="live-page__placeholder-icon"><ion-icon :icon="videocamOutline" aria-hidden="true" /></span>
              <p>{{ isCreate ? 'Share the action with your community.' : status || 'Loading live…' }}</p>
            </div>

            <!-- Top overlay: status and host -->
            <div class="live-page__overlay-top">
              <div class="live-page__pills">
                <span v-if="live?.status === 'LIVE'" class="live-page__badge"><i aria-hidden="true" /> LIVE</span>
                <span v-else-if="isCreate && localStream" class="live-page__badge live-page__badge--preview">PREVIEW</span>
                <span v-if="broadcasting" class="live-page__viewers">
                  <ion-icon :icon="eyeOutline" aria-hidden="true" /> {{ viewerCount }}
                </span>
              </div>
              <div v-if="live" class="live-page__host">
                <UserAvatar :user="live.host" :size="34" />
                <span>
                  <strong>{{ live.host.displayName }}</strong>
                  <small>{{ live.title }}</small>
                </span>
              </div>
            </div>

            <!-- Bottom overlay: controls -->
            <div v-if="localStream" class="live-page__controls" role="group" aria-label="Broadcast controls">
              <button
                type="button"
                class="live-page__control"
                :class="{ 'live-page__control--off': !micOn }"
                :aria-label="micOn ? 'Mute microphone' : 'Unmute microphone'"
                :aria-pressed="!micOn"
                @click="toggle('audio')"
              >
                <ion-icon :icon="micOn ? micOutline : micOffOutline" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="live-page__control"
                :class="{ 'live-page__control--off': !cameraOn }"
                :aria-label="cameraOn ? 'Turn camera off' : 'Turn camera on'"
                :aria-pressed="!cameraOn"
                @click="toggle('video')"
              >
                <ion-icon :icon="cameraOn ? videocamOutline : videocamOffOutline" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="live-page__control"
                :disabled="switchingCamera || !cameraOn"
                :aria-label="facing === 'user' ? 'Switch to back camera' : 'Switch to front camera'"
                @click="switchCamera"
              >
                <ion-icon :icon="cameraReverseOutline" aria-hidden="true" />
              </button>
            </div>
            <div v-else-if="remoteStream" class="live-page__controls">
              <button
                type="button"
                class="live-page__control"
                :class="{ 'live-page__control--off': muted }"
                :aria-label="muted ? 'Turn sound on' : 'Mute sound'"
                @click="enableSound"
              >
                <ion-icon :icon="muted ? volumeMuteOutline : volumeHighOutline" aria-hidden="true" />
              </button>
              <span v-if="muted" class="live-page__hint">Tap to hear the live</span>
            </div>
          </div>

          <p v-if="status" class="live-page__status" role="status">{{ status }}</p>
          <p v-if="error" class="live-page__error" role="alert">{{ error }}</p>

          <!-- Host: set up a new live -->
          <section v-if="isCreate && !live" class="live-page__card live-page__setup">
            <label for="live-title">Live title</label>
            <input
              id="live-title"
              v-model="title"
              maxlength="120"
              placeholder="What's happening on the court?"
              :disabled="busy"
            />
            <p class="live-page__note">
              <ion-icon :icon="earthOutline" aria-hidden="true" />
              Public · Signed-in members can watch. Leaving this page ends your broadcast.
            </p>
            <button v-if="!localStream" type="button" class="live-page__primary" :disabled="busy" @click="preview">
              <ion-icon :icon="videocamOutline" aria-hidden="true" />
              {{ busy ? 'Opening…' : 'Open camera & microphone' }}
            </button>
            <button v-else type="button" class="live-page__primary" :disabled="busy || !title.trim()" @click="start(title)">
              <ion-icon :icon="radioOutline" aria-hidden="true" />
              {{ busy ? 'Starting…' : 'Start Live' }}
            </button>
          </section>

          <div class="live-page__actions">
            <button v-if="isOwner && live?.status === 'LIVE'" type="button" class="live-page__end" :disabled="busy" @click="end">
              {{ busy ? 'Ending…' : 'End Live' }}
            </button>
            <button
              v-if="!isCreate && !isOwner && live?.status === 'LIVE'"
              type="button"
              class="live-page__secondary"
              :disabled="busy"
              @click="watchLive"
            >
              <ion-icon :icon="refreshOutline" aria-hidden="true" />
              {{ busy ? 'Connecting…' : watching ? 'Reconnect' : 'Try connecting again' }}
            </button>
            <router-link v-if="!isCreate && live?.status !== 'LIVE'" to="/live" class="live-page__secondary">
              Browse other lives
            </router-link>
          </div>
        </div>

        <section v-if="live?.status === 'LIVE'" class="live-comments" aria-label="Live comments">
          <header class="live-comments__header">
            <h2>Live chat</h2>
            <span>{{ comments.length }}</span>
          </header>
          <p v-if="!comments.length" class="live-comments__empty">Be the first to say something.</p>
          <div v-else ref="commentList" class="live-comments__list" aria-live="polite">
            <article v-for="comment in comments" :key="comment.id" class="live-comments__item">
              <UserAvatar :user="comment.author" :size="30" />
              <div class="live-comments__body">
                <div class="live-comments__meta">
                  <strong>{{ comment.author.displayName }}</strong>
                  <time :datetime="comment.createdAt">{{ formatCommentTime(comment.createdAt) }}</time>
                </div>
                <p>{{ comment.content }}</p>
              </div>
            </article>
          </div>
          <form class="live-comments__form" @submit.prevent="sendComment">
            <input
              v-model="commentDraft"
              maxlength="500"
              aria-label="Write a live comment"
              placeholder="Say something…"
              :disabled="commentSending"
            />
            <button
              class="live-comments__send"
              type="submit"
              :disabled="commentSending || !commentDraft.trim()"
              aria-label="Send comment"
            >
              <ion-icon :icon="sendOutline" aria-hidden="true" />
            </button>
          </form>
          <p v-if="commentError" class="live-page__error" role="alert">{{ commentError }}</p>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>


<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { IonContent, IonIcon, IonPage, onIonViewWillEnter, onIonViewWillLeave } from '@ionic/vue';
import {
  cameraReverseOutline,
  earthOutline,
  eyeOutline,
  micOffOutline,
  micOutline,
  radioOutline,
  refreshOutline,
  sendOutline,
  videocamOffOutline,
  videocamOutline,
  volumeHighOutline,
  volumeMuteOutline,
} from 'ionicons/icons';
import SubPageHeader from '@/components/layout/SubPageHeader.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import { useLive } from '@/composables/useLive';
import { liveApi, type LiveComment } from '@/services/live-api.service';
import { createAuthorizedCall } from '@/stores/authorized';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const isCreate = computed(() => route.name === 'create-live');
const title = ref('');
const muted = ref(true);
const video = ref<HTMLVideoElement>();
const commentList = ref<HTMLElement>();
const comments = ref<LiveComment[]>([]);
const commentDraft = ref('');
const commentSending = ref(false);
const commentError = ref('');
const auth = useAuthStore();
const authorized = createAuthorizedCall(auth);
let commentsTimer: ReturnType<typeof setInterval> | undefined;
let commentsRequest = false;
function formatCommentTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
const {
  live,
  localStream,
  remoteStream,
  busy,
  error,
  status,
  micOn,
  cameraOn,
  facing,
  switchingCamera,
  switchCamera,
  viewerCount,
  broadcasting,
  watching,
  isOwner,
  enter,
  preview,
  start,
  watchLive,
  end,
  toggle,
  dispose,
} = useLive();
async function refreshComments() {
  if (!live.value || live.value.status !== 'LIVE' || commentsRequest) return;
  const id = live.value.id;
  commentsRequest = true;
  try {
    const rows = await authorized((token) => liveApi.comments(token, id));
    if (live.value?.id === id) {
      const grew = rows.length !== comments.value.length;
      comments.value = rows;
      commentError.value = '';
      if (grew) void scrollCommentsToEnd();
    }
  } catch {
    // Preserve the existing comments during brief connection interruptions.
  } finally {
    commentsRequest = false;
  }
}
async function sendComment() {
  const text = commentDraft.value.trim();
  const id = live.value?.id;
  if (!text || !id || commentSending.value) return;
  commentSending.value = true;
  commentError.value = '';
  try {
    const created = await authorized((token) => liveApi.comment(token, id, text));
    if (live.value?.id === id) {
      comments.value = [...comments.value, created].slice(-100);
      commentDraft.value = '';
      void scrollCommentsToEnd();
    }
  } catch (caught) {
    commentError.value = caught instanceof Error ? caught.message : 'Could not send your comment.';
  } finally {
    commentSending.value = false;
  }
}
async function scrollCommentsToEnd() {
  await nextTick();
  const list = commentList.value;
  if (list) list.scrollTop = list.scrollHeight;
}
function stopCommentPolling() {
  if (commentsTimer) clearInterval(commentsTimer);
  commentsTimer = undefined;
  comments.value = [];
}
watch(() => [live.value?.id, live.value?.status] as const, ([id, liveStatus]) => {
  stopCommentPolling();
  commentError.value = '';
  if (id && liveStatus === 'LIVE') {
    void refreshComments();
    commentsTimer = setInterval(() => void refreshComments(), 2500);
  }
});
watch([localStream, remoteStream, video], async () => {
  await nextTick();
  if (video.value) {
    video.value.srcObject = localStream.value ?? remoteStream.value;
    void video.value.play().catch(() => undefined);
  }
});
function enableSound() {
  muted.value = !muted.value;
  if (video.value) {
    video.value.muted = muted.value;
    void video.value.play().catch(() => undefined);
  }
}
onIonViewWillEnter(() => {
  muted.value = true;
  void enter(isCreate.value ? undefined : String(route.params.liveId));
});
onIonViewWillLeave(() => {
  stopCommentPolling();
  dispose();
});
window.addEventListener('pagehide', dispose);
onBeforeUnmount(() => {
  dispose();
  stopCommentPolling();
  window.removeEventListener('pagehide', dispose);
});
</script>

<style scoped>
.live-page {
  display: grid;
  gap: 16px;
  max-width: 1120px;
  margin: 0 auto;
  padding: 16px 16px 40px;
}

@media (min-width: 960px) {
  .live-page--with-chat {
    align-items: start;
    grid-template-columns: minmax(0, 1fr) 340px;
  }
}

.live-page__main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
}

/* Stage */
.live-page__stage {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  max-height: 72vh;
  border-radius: 18px;
  background: #050607;
  box-shadow: 0 18px 40px -20px rgba(0, 0, 0, 0.6);
}

@media (max-width: 600px) {
  .live-page__stage {
    aspect-ratio: 3 / 4;
  }
}

.live-page video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.live-page__video--mirror {
  transform: scaleX(-1);
}

.live-page__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  pointer-events: none;
}

.live-page__placeholder-icon {
  display: grid;
  width: 64px;
  height: 64px;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 96, 40, 0.16);
  color: var(--ion-color-primary);
  font-size: 30px;
}

.live-page__placeholder p {
  max-width: 280px;
  margin: 0;
  font-size: 0.9rem;
}

.live-page__overlay-top {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.55), transparent);
  pointer-events: none;
}

.live-page__pills {
  display: flex;
  gap: 6px;
}

.live-page__badge,
.live-page__viewers {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 6px;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.live-page__badge {
  background: #e11d48;
}

.live-page__badge i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #fff;
  animation: live-pulse 1.4s ease-in-out infinite;
}

.live-page__badge--preview {
  background: rgba(255, 255, 255, 0.2);
}

.live-page__viewers {
  background: rgba(0, 0, 0, 0.55);
}

.live-page__host {
  display: flex;
  min-width: 0;
  max-width: 60%;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
}

.live-page__host span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.live-page__host strong,
.live-page__host small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-page__host strong {
  font-size: 0.8rem;
}

.live-page__host small {
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.7rem;
}

.live-page__controls {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 28px 12px 14px;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.6), transparent);
}

.live-page__control {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  cursor: pointer;
  font-size: 22px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: background var(--gora-motion), transform var(--gora-motion);
}

.live-page__control:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.26);
}

.live-page__control:active:not(:disabled) {
  transform: scale(0.94);
}

.live-page__control:disabled {
  opacity: 0.45;
  cursor: default;
}

.live-page__control--off {
  border-color: transparent;
  background: #fff;
  color: #111;
}

.live-page__hint {
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

/* Messages */
.live-page__status,
.live-page__error {
  margin: 0;
  font-size: 0.85rem;
}

.live-page__status {
  color: var(--gora-muted);
}

.live-page__error {
  padding: 10px 12px;
  border: 1px solid rgba(225, 29, 72, 0.35);
  border-radius: 10px;
  background: rgba(225, 29, 72, 0.08);
  color: #e11d48;
}

/* Cards and buttons */
.live-page__card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--gora-line);
  border-radius: 16px;
  background: var(--gora-surface);
  box-shadow: var(--gora-shadow);
}

.live-page__setup label {
  font-size: 0.8rem;
  font-weight: 700;
}

.live-page__setup input {
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid var(--gora-line);
  border-radius: 12px;
  background: var(--gora-surface-raised);
  color: var(--ion-text-color);
  font: inherit;
}

.live-page__setup input:focus {
  border-color: var(--ion-color-primary);
  outline: none;
}

.live-page__note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--gora-muted);
  font-size: 0.78rem;
}

.live-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.live-page__actions:empty {
  display: none;
}

.live-page__primary,
.live-page__secondary,
.live-page__end {
  display: inline-flex;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 20px;
  border-radius: 12px;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  text-decoration: none;
}

.live-page__primary {
  border: 0;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}

.live-page__primary:disabled,
.live-page__secondary:disabled,
.live-page__end:disabled {
  opacity: 0.55;
  cursor: default;
}

.live-page__secondary {
  border: 1px solid var(--gora-line);
  background: var(--gora-surface);
  color: var(--ion-text-color);
}

.live-page__end {
  flex: 1;
  border: 0;
  background: #e11d48;
  color: #fff;
}

/* Chat */
.live-comments {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--gora-line);
  border-radius: 16px;
  background: var(--gora-surface);
  box-shadow: var(--gora-shadow);
}

@media (min-width: 960px) {
  .live-comments {
    position: sticky;
    top: 12px;
    height: min(72vh, 640px);
  }
}

.live-comments__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--gora-line);
}

.live-comments__header h2 {
  margin: 0;
  font-size: 0.95rem;
}

.live-comments__header span {
  min-width: 24px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--gora-surface-raised);
  color: var(--gora-muted);
  font-size: 0.75rem;
  font-weight: 700;
  text-align: center;
}

.live-comments__empty {
  flex: 1;
  margin: 0;
  padding: 24px 16px;
  color: var(--gora-muted);
  font-size: 0.85rem;
  text-align: center;
}

.live-comments__list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  max-height: 360px;
  overflow-y: auto;
  padding: 14px 16px;
}

@media (min-width: 960px) {
  .live-comments__list {
    max-height: none;
  }
}

.live-comments__item {
  display: flex;
  gap: 10px;
}

.live-comments__body {
  min-width: 0;
}

.live-comments__meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.live-comments__meta strong {
  font-size: 0.8rem;
}

.live-comments__meta time {
  color: var(--gora-muted);
  font-size: 0.68rem;
}

.live-comments__body p {
  margin: 2px 0 0;
  font-size: 0.86rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.live-comments__form {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--gora-line);
}

.live-comments__form input {
  min-width: 0;
  flex: 1;
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid var(--gora-line);
  border-radius: 999px;
  background: var(--gora-surface-raised);
  color: var(--ion-text-color);
  font: inherit;
  font-size: 0.88rem;
}

.live-comments__form input:focus {
  border-color: var(--ion-color-primary);
  outline: none;
}

.live-comments__send {
  display: grid;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  cursor: pointer;
  font-size: 18px;
}

.live-comments__send:disabled {
  opacity: 0.5;
  cursor: default;
}

.live-comments .live-page__error {
  margin: 0 12px 12px;
}

@keyframes live-pulse {
  50% {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .live-page__badge i {
    animation: none;
  }
}
</style>
