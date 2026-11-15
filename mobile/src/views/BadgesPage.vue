<template>
  <ion-page class="profile-app-page">
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/profile" />
        </ion-buttons>
        <ion-title>Badges</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="badges-page">
        <div v-if="profileStore.achievementsError" class="badges-page__notice" role="alert">
          <span>{{ profileStore.achievementsError }}</span>
          <button type="button" :disabled="profileStore.achievementsLoading" @click="profileStore.load()">Try again</button>
        </div>

        <div v-if="badges.length === 0 && profileStore.achievementsLoading" class="badges-page__loading" aria-busy="true" aria-label="Loading your badges">
          <ion-skeleton-text :animated="true" class="badges-page__skeleton badges-page__skeleton--summary" />
          <div class="badges-page__skeleton-grid">
            <ion-skeleton-text v-for="n in 8" :key="n" :animated="true" class="badges-page__skeleton" />
          </div>
        </div>

        <p v-else-if="badges.length === 0 && !profileStore.achievementsError" class="badges-page__empty">
          No badges are available yet. Play, host, and share games to start earning them.
        </p>

        <template v-else-if="badges.length > 0">
          <AchievementProgress
            class="badges-page__summary"
            :current="unlockedCount"
            :target="badges.length"
            label="Badges unlocked"
          />
          <p class="badges-page__hint">Progress comes from your real games, highlights, stories, friends, and GORA Points.</p>

          <section v-for="group in groups" :key="group.category" class="badges-page__group">
            <SectionHeader :title="group.label">
              <span class="badges-page__count">{{ group.badges.filter(isBadgeUnlocked).length }}/{{ group.badges.length }}</span>
            </SectionHeader>
            <BadgeGrid :badges="group.badges" @select="selectedBadge = $event" />
          </section>
        </template>
      </div>

      <BadgeDetailModal :badge="selectedBadge" @close="selectedBadge = null" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import AchievementProgress from '@/components/achievements/AchievementProgress.vue';
import BadgeDetailModal from '@/components/achievements/BadgeDetailModal.vue';
import BadgeGrid from '@/components/achievements/BadgeGrid.vue';
import SectionHeader from '@/components/common/SectionHeader.vue';
import { useProfileStore } from '@/stores/profile';
import type { Badge } from '@/types/achievement';
import { groupBadgesByCategory, isBadgeUnlocked } from '@/utils/badges';

const profileStore = useProfileStore();
const { badges } = storeToRefs(profileStore);

const selectedBadge = ref<Badge | null>(null);

const groups = computed(() => groupBadgesByCategory(badges.value));
const unlockedCount = computed(() => badges.value.filter(isBadgeUnlocked).length);

onIonViewWillEnter(() => {
  void profileStore.load();
});
</script>

<style scoped>
.badges-page {
  padding: 20px 16px 32px;
}

.badges-page__summary {
  padding: 16px;
  border: 1px solid var(--gora-line);
  border-radius: 16px;
  background: var(--gora-surface);
  box-shadow: var(--gora-shadow);
}

.badges-page__hint {
  margin: 10px 2px 0;
  color: var(--gora-muted);
  font-size: 0.78rem;
  line-height: 1.5;
}

.badges-page__group {
  margin-top: 28px;
}

.badges-page__count {
  color: var(--gora-muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.badges-page__notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid var(--gora-accent-line);
  border-radius: var(--gora-radius-card);
  background: var(--gora-accent-soft);
  font-size: 0.85rem;
}

.badges-page__notice button {
  flex-shrink: 0;
  border: 0;
  background: none;
  color: var(--ion-color-primary);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.badges-page__empty {
  padding: 32px 20px;
  border: 1px solid var(--gora-line);
  border-radius: 16px;
  background: var(--gora-surface);
  color: var(--gora-muted);
  text-align: center;
}

.badges-page__skeleton {
  height: 96px;
  margin: 0;
  border-radius: 14px;
}

.badges-page__skeleton--summary {
  height: 72px;
}

.badges-page__skeleton-grid {
  display: grid;
  gap: 12px;
  margin-top: 24px;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
}
</style>
