<template>
  <div class="image-cropper">
    <div
      ref="frame"
      class="image-cropper__frame"
      :class="{ 'image-cropper__frame--round': round, 'image-cropper__frame--dragging': dragging }"
      :style="{ aspectRatio: String(aspect) }"
      role="application"
      aria-label="Drag to position the photo"
      tabindex="0"
      @pointerdown="startDrag"
      @pointermove="drag"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @keydown="nudge"
    >
      <img
        ref="image"
        :src="src"
        alt=""
        draggable="false"
        :style="imageStyle"
        @load="onLoad"
      />
      <span class="image-cropper__grid" aria-hidden="true" />
    </div>
    <label class="image-cropper__zoom">
      <ion-icon :icon="removeOutline" aria-hidden="true" />
      <input
        v-model.number="zoom"
        type="range"
        min="1"
        max="3"
        step="0.01"
        aria-label="Zoom"
        :disabled="!ready"
      />
      <ion-icon :icon="addOutline" aria-hidden="true" />
    </label>
    <p class="image-cropper__hint">Drag to reposition · slide to zoom</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { IonIcon } from '@ionic/vue';
import { addOutline, removeOutline } from 'ionicons/icons';

const props = withDefaults(
  defineProps<{
    /** Object URL or data URL of the photo to crop. */
    src: string;
    /** Width / height of the result, e.g. 3 for a cover or 1 for a logo. */
    aspect: number;
    /** Pixel width of the saved image. */
    outputWidth?: number;
    round?: boolean;
  }>(),
  { outputWidth: 1600, round: false },
);

const frame = ref<HTMLElement | null>(null);
const image = ref<HTMLImageElement | null>(null);
const ready = ref(false);
const zoom = ref(1);
const offsetX = ref(0);
const offsetY = ref(0);
const frameWidth = ref(0);
const frameHeight = ref(0);
const naturalWidth = ref(0);
const naturalHeight = ref(0);
const dragging = ref(false);
let dragStart: { x: number; y: number; offsetX: number; offsetY: number } | null = null;
let resizeObserver: ResizeObserver | null = null;

/** The scale at which the photo just covers the frame. */
const baseScale = computed(() =>
  naturalWidth.value && naturalHeight.value
    ? Math.max(frameWidth.value / naturalWidth.value, frameHeight.value / naturalHeight.value)
    : 1,
);
const scale = computed(() => baseScale.value * zoom.value);
const displayWidth = computed(() => naturalWidth.value * scale.value);
const displayHeight = computed(() => naturalHeight.value * scale.value);

const imageStyle = computed(() => ({
  width: `${displayWidth.value}px`,
  height: `${displayHeight.value}px`,
  transform: `translate(${offsetX.value}px, ${offsetY.value}px)`,
  opacity: ready.value ? 1 : 0,
}));

function clamp(): void {
  offsetX.value = Math.min(0, Math.max(frameWidth.value - displayWidth.value, offsetX.value));
  offsetY.value = Math.min(0, Math.max(frameHeight.value - displayHeight.value, offsetY.value));
}

function measure(): void {
  const box = frame.value?.getBoundingClientRect();
  if (!box) return;
  frameWidth.value = box.width;
  frameHeight.value = box.height;
}

function center(): void {
  offsetX.value = (frameWidth.value - displayWidth.value) / 2;
  offsetY.value = (frameHeight.value - displayHeight.value) / 2;
}

function onLoad(): void {
  const img = image.value;
  if (!img) return;
  naturalWidth.value = img.naturalWidth;
  naturalHeight.value = img.naturalHeight;
  measure();
  zoom.value = 1;
  center();
  ready.value = true;
}

// Zoom around the middle of the frame.
watch(zoom, (next, previous) => {
  if (!ready.value || !previous) return;
  const ratio = next / previous;
  const cx = frameWidth.value / 2;
  const cy = frameHeight.value / 2;
  offsetX.value = cx - (cx - offsetX.value) * ratio;
  offsetY.value = cy - (cy - offsetY.value) * ratio;
  clamp();
});

watch(
  () => props.src,
  () => {
    ready.value = false;
  },
);

function startDrag(event: PointerEvent): void {
  if (!ready.value) return;
  dragging.value = true;
  dragStart = { x: event.clientX, y: event.clientY, offsetX: offsetX.value, offsetY: offsetY.value };
  frame.value?.setPointerCapture(event.pointerId);
}

function drag(event: PointerEvent): void {
  if (!dragStart) return;
  offsetX.value = dragStart.offsetX + event.clientX - dragStart.x;
  offsetY.value = dragStart.offsetY + event.clientY - dragStart.y;
  clamp();
}

function endDrag(): void {
  dragStart = null;
  dragging.value = false;
}

function nudge(event: KeyboardEvent): void {
  const step = event.shiftKey ? 20 : 6;
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [step, 0],
    ArrowRight: [-step, 0],
    ArrowUp: [0, step],
    ArrowDown: [0, -step],
  };
  const move = moves[event.key];
  if (!move) return;
  event.preventDefault();
  offsetX.value += move[0];
  offsetY.value += move[1];
  clamp();
}

/** Render the visible area to a JPEG file. */
async function toFile(name = 'photo.jpg'): Promise<File> {
  const img = image.value;
  if (!img || !ready.value) throw new Error('The photo is still loading. Try again in a moment.');
  const width = props.outputWidth;
  const height = Math.round(width / props.aspect);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Photo preparation failed. Please try again.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    img,
    -offsetX.value / scale.value,
    -offsetY.value / scale.value,
    frameWidth.value / scale.value,
    frameHeight.value / scale.value,
    0,
    0,
    width,
    height,
  );
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) throw new Error('Photo preparation failed. Please try again.');
  return new File([blob], name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}

defineExpose({ toFile, ready });

onMounted(() => {
  if (typeof ResizeObserver === 'undefined' || !frame.value) return;
  resizeObserver = new ResizeObserver(() => {
    if (!ready.value) return;
    const previousWidth = frameWidth.value;
    measure();
    if (previousWidth && previousWidth !== frameWidth.value) center();
    clamp();
  });
  resizeObserver.observe(frame.value);
});

onBeforeUnmount(() => resizeObserver?.disconnect());
</script>

<style scoped>
.image-cropper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-cropper__frame {
  position: relative;
  overflow: hidden;
  width: 100%;
  border-radius: 14px;
  background: #000;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.image-cropper__frame--round {
  width: min(240px, 72%);
  margin: 0 auto;
  border-radius: 22px;
}

.image-cropper__frame--dragging {
  cursor: grabbing;
}

.image-cropper__frame:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 3px;
}

.image-cropper__frame img {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  pointer-events: none;
  transition: opacity 0.2s;
}

/* Rule-of-thirds guide while positioning. */
.image-cropper__grid {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, transparent calc(33.33% - 0.5px), rgba(255, 255, 255, 0.35) 33.33%, transparent calc(33.33% + 0.5px)),
    linear-gradient(90deg, transparent calc(66.66% - 0.5px), rgba(255, 255, 255, 0.35) 66.66%, transparent calc(66.66% + 0.5px)),
    linear-gradient(0deg, transparent calc(33.33% - 0.5px), rgba(255, 255, 255, 0.35) 33.33%, transparent calc(33.33% + 0.5px)),
    linear-gradient(0deg, transparent calc(66.66% - 0.5px), rgba(255, 255, 255, 0.35) 66.66%, transparent calc(66.66% + 0.5px));
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.image-cropper__frame--dragging .image-cropper__grid {
  opacity: 1;
}

.image-cropper__zoom {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--gora-muted);
  font-size: 18px;
}

.image-cropper__zoom input {
  flex: 1;
  accent-color: var(--ion-color-primary);
}

.image-cropper__hint {
  margin: -4px 0 0;
  color: var(--gora-muted);
  font-size: 0.78rem;
  text-align: center;
}
</style>
