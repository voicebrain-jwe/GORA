<template>
  <section class="my-sports" aria-labelledby="my-sports-title">
    <header v-if="layout === 'list' || !hideHeader" class="my-sports__header">
      <h2 id="my-sports-title">{{ editable ? 'My Sports' : 'Sports' }}</h2>
      <button v-if="layout === 'list' && editable && sports.length > 0" type="button" class="my-sports__add" @click="emit('add')">
        <ion-icon :icon="addOutline" aria-hidden="true" />
        Add Sport
      </button>
    </header>

    <div v-if="loading && sports.length === 0" class="my-sports__list" aria-busy="true" aria-label="Loading sports">
      <div v-for="n in 2" :key="n" class="my-sports__card">
        <ion-skeleton-text :animated="true" class="my-sports__skeleton-icon" />
        <span class="my-sports__text">
          <ion-skeleton-text :animated="true" class="my-sports__skeleton-line" />
          <ion-skeleton-text :animated="true" class="my-sports__skeleton-line my-sports__skeleton-line--short" />
        </span>
      </div>
    </div>

    <div v-else-if="error && sports.length === 0" class="my-sports__empty" role="alert">
      <p>{{ error }}</p>
      <button type="button" class="my-sports__add" @click="emit('retry')">Try again</button>
    </div>

    <div v-else-if="sports.length === 0" class="my-sports__empty">
      <p>No sports added yet.</p>
      <button v-if="editable" type="button" class="my-sports__add my-sports__add--solid" @click="emit('add')">
        <ion-icon :icon="addOutline" aria-hidden="true" />
        Add Sport
      </button>
    </div>

    <!-- Manage view (from the profile "..." menu): edit level or remove each sport. -->
    <ul v-else-if="layout === 'list'" class="my-sports__list">
      <li v-for="sport in sports" :key="sport.sportId" class="my-sports__card">
        <SportIcon :name="sport.name" :icon-url="sport.iconUrl" />
        <span class="my-sports__text">
          <strong>{{ sport.name }}</strong>
          <span>{{ describeUserSport(sport) }}</span>
        </span>
        <template v-if="editable">
          <ion-spinner v-if="busyId === sport.sportId" name="crescent" class="my-sports__spinner" />
          <template v-else>
            <button
              type="button"
              class="my-sports__icon-button"
              :aria-label="`Edit ${sport.name}`"
              :disabled="busyId !== null"
              @click="emit('edit', sport)"
            >
              <ion-icon :icon="createOutline" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="my-sports__icon-button"
              :aria-label="`Remove ${sport.name}`"
              :disabled="busyId !== null"
              @click="emit('remove', sport)"
            >
              <ion-icon :icon="trashOutline" aria-hidden="true" />
            </button>
          </template>
        </template>
      </li>
    </ul>

    <!-- Profile view: story-style circles, icon with the level underneath. -->
    <ul v-else class="my-sports__rail">
      <li v-for="sport in sports" :key="sport.sportId" class="my-sports__tile" :aria-label="`${sport.name}, ${describeUserSport(sport)}`">
        <span class="my-sports__ring" :title="sport.name">
          <span class="my-sports__inner">
            <SportIcon :name="sport.name" :icon-url="sport.iconUrl" :size="60" />
          </span>
        </span>
        <span class="my-sports__level">{{ skillLevelLabel(sport.skillLevel) }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { IonIcon, IonSkeletonText, IonSpinner } from '@ionic/vue';
import { addOutline, createOutline, trashOutline } from 'ionicons/icons';
import SportIcon from '@/components/sports/SportIcon.vue';
import type { UserSportEntry } from '@/types/profile';
import { describeUserSport, skillLevelLabel } from '@/utils/sports-profile';

withDefaults(
  defineProps<{
    sports: readonly UserSportEntry[];
    editable?: boolean;
    /** 'rail' shows icons on a profile; 'list' is the manage view with Edit and Remove. */
    layout?: 'rail' | 'list';
    hideHeader?: boolean;
    /** The sport currently being saved or removed. */
    busyId?: string | null;
    loading?: boolean;
    error?: string | null;
  }>(),
  { editable: false, layout: 'rail', hideHeader: false, busyId: null, loading: false, error: null },
);
const emit = defineEmits<{
  add: [];
  edit: [sport: UserSportEntry];
  remove: [sport: UserSportEntry];
  retry: [];
}>();
</script>

<style scoped>
.my-sports__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.my-sports__header h2 {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.my-sports__add {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--ion-color-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
}

.my-sports__add--solid {
  padding: 10px 16px;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}

.my-sports__empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  border-radius: var(--gora-radius-card);
  background: var(--gora-surface);
}

.my-sports__empty p {
  margin: 0;
  color: var(--gora-muted);
  font-size: 0.9rem;
}

.my-sports__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.my-sports__card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--gora-radius-card);
  background: var(--gora-surface);
}

.my-sports__skeleton-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  margin: 0;
  border-radius: var(--gora-radius-card);
}

.my-sports__skeleton-line {
  width: 60%;
  height: 12px;
  margin: 0;
  border-radius: 6px;
}

.my-sports__skeleton-line--short {
  width: 35%;
}

.my-sports__text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.my-sports__text strong {
  font-size: 0.95rem;
}

.my-sports__text span {
  color: var(--gora-muted);
  font-size: 0.8rem;
}

.my-sports__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: none;
  color: var(--gora-muted);
  cursor: pointer;
  font-size: 18px;
}

.my-sports__icon-button:hover:not(:disabled) {
  background: rgba(245, 247, 242, 0.06);
  color: var(--ion-text-color);
}

.my-sports__icon-button:disabled {
  opacity: 0.4;
}

.my-sports__spinner {
  width: 20px;
  height: 20px;
  margin: 0 8px;
}

/* Horizontal rail: icon + name, slide left and right. */
.my-sports__rail {
  display: flex;
  gap: 10px;
  margin: 0 -16px;
  padding: 2px 16px 6px;
  overflow-x: auto;
  list-style: none;
  scroll-padding-inline: 16px;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
}

.my-sports__rail::-webkit-scrollbar {
  display: none;
}

.my-sports__rail > li {
  flex-shrink: 0;
  scroll-snap-align: start;
}

.my-sports__tile {
  display: flex;
  width: 76px;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ion-text-color);
  font: inherit;
  text-align: center;
}


/* Same ring as a story avatar. */
.my-sports__ring {
  position: relative;
  display: flex;
  width: 72px;
  height: 72px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border-radius: 50%;
  background: conic-gradient(from 200deg, var(--ion-color-primary), #ffb347, var(--ion-color-primary));
  transition: transform var(--gora-motion);
}

.my-sports__inner {
  display: flex;
  padding: 3px;
  border-radius: 50%;
  background: var(--gora-surface);
}

.my-sports__inner :deep(.sport-icon) {
  border-radius: 50%;
}


.my-sports__ring--add {
  background: transparent;
  outline: 1.5px dashed var(--gora-line-strong);
  outline-offset: -2px;
  color: var(--ion-color-primary);
  font-size: 26px;
}

.my-sports__tile-spinner {
  position: absolute;
  inset: 0;
  margin: auto;
  color: #fff;
}

.my-sports__level {
  max-width: 100%;
  overflow: hidden;
  color: var(--ion-text-color);
  font-size: 0.75rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
