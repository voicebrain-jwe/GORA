<template>
  <div
    ref="card"
    class="feed-reel"
    :class="{ 'feed-reel--landscape': isLandscape }"
    :style="{ background: visual.gradient, aspectRatio: aspectRatio }"
    role="link"
    tabindex="0"
    :aria-label="`Open ${reel.author.displayName}'s reel in Reels`"
    @click="openInReels"
    @keydown.enter.prevent="openInReels"
  >
    <video
      v-if="reel.videoUrl"
      ref="video"
      class="feed-reel__video"
      :src="reel.videoUrl"
      :poster="reel.thumbnailUrl ?? undefined"
      muted
      loop
      playsinline
      preload="metadata"
      @loadedmetadata="readSize"
      @play="isPlaying = true"
      @pause="isPlaying = false"
    />
    <ion-icon v-else :icon="visual.icon" class="feed-reel__placeholder" aria-hidden="true" />

    <span class="feed-reel__shade" aria-hidden="true" />

    <span class="feed-reel__badge feed-reel__badge--top">
      <ion-icon :icon="filmOutline" aria-hidden="true" /> Reel
    </span>

    <button
      v-if="reel.videoUrl"
      type="button"
      class="feed-reel__mute"
      :aria-label="muted ? 'Unmute reel' : 'Mute reel'"
      @click.stop="toggleMute"
      @keydown.enter.stop
    >
      <ion-icon :icon="muted ? volumeMute : volumeHigh" aria-hidden="true" />
    </button>

    <ion-icon v-if="reel.videoUrl && !isPlaying" :icon="playCircle" class="feed-reel__play" aria-hidden="true" />

    <div class="feed-reel__info">
      <p v-if="reel.caption" class="feed-reel__caption">{{ reel.caption }}</p>
      <div class="feed-reel__stats">
        <span :aria-label="`${formatCompactNumber(reel.views)} views`">
          <ion-icon :icon="eyeOutline" aria-hidden="true" /> {{ formatCompactNumber(reel.views) }} views
        </span>
        <span v-if="reel.sport">{{ reel.sport }}</span>
        <span v-if="reel.durationSeconds">{{ formatDuration(reel.durationSeconds) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonIcon } from '@ionic/vue';
import { eyeOutline, filmOutline, playCircle, volumeHigh, volumeMute } from 'ionicons/icons';
import type { Reel } from '@/types/reel';
import { getSportVisual } from '@/utils/sports';
import { formatCompactNumber, formatDuration } from '@/utils/time';

const props = defineProps<{ reel: Reel }>();
const router = useRouter();

const card = ref<HTMLElement | null>(null);
const video = ref<HTMLVideoElement | null>(null);
const muted = ref(true);
const isPlaying = ref(false);
/** Width / height of the video; portrait 9:16 until the file says otherwise. */
const ratio = ref(9 / 16);
const isLandscape = computed(() => ratio.value > 1);
const aspectRatio = computed(() => String(ratio.value));

function readSize(): void {
  const player = video.value;
  if (player?.videoWidth && player.videoHeight) ratio.value = player.videoWidth / player.videoHeight;
}

const visual = computed(() => getSportVisual(props.reel.sport || 'Other'));

let observer: IntersectionObserver | null = null;
let inView = false;

/** Feed videos start muted so browsers allow autoplay; the viewer can unmute. */
async function play(): Promise<void> {
  const player = video.value;
  if (!player || !inView || document.hidden) return;
  player.muted = muted.value;
  try {
    await player.play();
  } catch {
    if (!player.muted) {
      muted.value = true;
      player.muted = true;
      try { await player.play(); } catch { /* autoplay blocked: tap opens Reels */ }
    }
  }
}

function pause(): void {
  video.value?.pause();
}

function toggleMute(): void {
  muted.value = !muted.value;
  if (video.value) video.value.muted = muted.value;
  void play();
}

function onVisibilityChange(): void {
  if (document.hidden) pause();
  else void play();
}

function openInReels(): void {
  pause();
  void router.push({ path: '/reels', query: { reel: props.reel.id } });
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange);
  if (!card.value || typeof IntersectionObserver === 'undefined') return;
  observer = new IntersectionObserver(
    ([entry]) => {
      inView = !!entry && entry.intersectionRatio >= 0.6;
      if (inView) void play();
      else pause();
    },
    { threshold: [0, 0.6, 1] },
  );
  observer.observe(card.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  document.removeEventListener('visibilitychange', onVisibilityChange);
  pause();
});
</script>

<style scoped>
.feed-reel {
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 380px;
  aspect-ratio: 9 / 16;
  max-height: 72vh;
  margin: 0 auto;
  border-radius: 16px;
  background: #000;
  color: #fff;
  cursor: pointer;
  isolation: isolate;
}

/* Landscape clips use the full card width instead of a tall phone frame. */
.feed-reel--landscape {
  max-width: 100%;
  max-height: none;
}

.feed-reel--landscape .feed-reel__video {
  object-fit: contain;
}

.feed-reel:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 3px;
}

.feed-reel__video {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #000;
}

.feed-reel__placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: -1;
  color: rgba(255, 255, 255, 0.25);
  font-size: 96px;
  transform: translate(-50%, -50%);
}

.feed-reel__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.7) 0%, transparent 40%, transparent 80%, rgba(0, 0, 0, 0.35) 100%);
  pointer-events: none;
}

.feed-reel__badge {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.5);
  font-size: 0.72rem;
  font-weight: 700;
}

.feed-reel__badge--top {
  top: 12px;
  left: 12px;
}

.feed-reel__mute {
  position: absolute;
  top: 10px;
  right: 10px;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  cursor: pointer;
  font-size: 18px;
}

.feed-reel__play {
  position: absolute;
  top: 50%;
  left: 50%;
  color: rgba(255, 255, 255, 0.85);
  font-size: 64px;
  filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5));
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.feed-reel__info {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 14px;
}

.feed-reel__caption {
  display: -webkit-box;
  overflow: hidden;
  margin: 0 0 6px;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

.feed-reel__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 0.75rem;
  opacity: 0.92;
}

.feed-reel__stats span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
