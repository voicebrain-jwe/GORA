<template>
  <ion-page class="profile-app-page">
    <SubPageHeader title="Activity" />

    <ion-content :fullscreen="true">
      <div v-if="profileStore.achievementsError && !activityStats" class="activity activity__state" role="alert">
        <p>{{ profileStore.achievementsError }}</p>
        <button type="button" :disabled="profileStore.achievementsLoading" @click="profileStore.load()">Try again</button>
      </div>
      <div v-else-if="!activityStats" class="activity activity__state" aria-busy="true">
        <p>Loading your activity…</p>
      </div>
      <div v-else class="activity">
        <ActivityStatsGrid :stats="activityStats" />
        <p class="activity__note">
          Game stats update after a game you were accepted into is marked completed. Badges are checked at the same time.
        </p>

        <section class="activity__section">
          <SectionHeader title="Next badges">
            <router-link to="/profile/badges" class="activity__link">All badges</router-link>
          </SectionHeader>
          <p v-if="nextBadges.length === 0" class="activity__note">You've unlocked every badge. Nice work!</p>
          <div v-if="nextBadges.length" class="activity__progress">
            <AchievementProgress
              v-for="badge in nextBadges"
              :key="badge.id"
              :current="badge.progress"
              :target="badge.target"
              :label="badge.name"
            />
          </div>
        </section>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue';
import AchievementProgress from '@/components/achievements/AchievementProgress.vue';
import SectionHeader from '@/components/common/SectionHeader.vue';
import SubPageHeader from '@/components/layout/SubPageHeader.vue';
import ActivityStatsGrid from '@/components/profile/ActivityStatsGrid.vue';
import { useProfileStore } from '@/stores/profile';
import { isBadgeUnlocked, sortBadgesForShowcase } from '@/utils/badges';

const NEXT_BADGE_COUNT = 3;

const profileStore = useProfileStore();
const { activityStats, badges } = storeToRefs(profileStore);

const nextBadges = computed(() =>
  sortBadgesForShowcase(badges.value)
    .filter((badge) => !isBadgeUnlocked(badge))
    .slice(0, NEXT_BADGE_COUNT),
);

onIonViewWillEnter(() => {
  void profileStore.load();
});
</script>

<style scoped>
.activity {
  padding: 16px 16px 32px;
}

.activity__state {
  color: var(--gora-muted);
  text-align: center;
}

.activity__state button {
  padding: 9px 18px;
  border: 0;
  border-radius: 999px;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.activity__link {
  color: var(--ion-color-primary);
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
}

.activity__note {
  margin: 14px 0 0;
  color: var(--gora-muted);
  font-size: 0.78rem;
  line-height: 1.4;
}

.activity__section {
  margin-top: 28px;
}

.activity__progress {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--gora-line);
  border-radius: 16px;
  background: var(--gora-surface);
}
</style>
