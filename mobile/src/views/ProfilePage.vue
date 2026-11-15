<template>
  <ion-page class="profile-app-page">
    <AppHeader />

    <ion-content :fullscreen="true">
      <div v-if="!profile && profileStore.loading" class="profile-skeleton" aria-busy="true" aria-label="Loading profile">
        <ion-skeleton-text :animated="true" class="profile-skeleton__cover" />
        <ion-skeleton-text :animated="true" class="profile-skeleton__avatar" />
        <ion-skeleton-text :animated="true" class="profile-skeleton__line profile-skeleton__line--wide" />
        <ion-skeleton-text :animated="true" class="profile-skeleton__line" />
        <div class="profile-skeleton__stats">
          <ion-skeleton-text v-for="n in 3" :key="n" :animated="true" class="profile-skeleton__stat" />
        </div>
      </div>

      <div v-else-if="!profile" class="profile-error" role="alert">
        <h2>We couldn't load your profile</h2>
        <p>{{ profileStore.error ?? 'Please try again.' }}</p>
        <ion-button fill="outline" @click="loadProfile">Try again</ion-button>
      </div>

      <div v-else class="profile-page">
        <section class="profile-card profile-card--hero" aria-label="Profile">
          <ProfileHeader :profile="profile" editable :has-active-story="profile.sections.stories > 0">
            <template #actions>
              <router-link to="/profile/edit" class="profile-action profile-action--primary">
                <ion-icon :icon="createOutline" aria-hidden="true" />
                Edit Profile
              </router-link>
              <button type="button" class="profile-action" @click="shareProfile">
                <ion-icon :icon="shareSocialOutline" aria-hidden="true" />
                Share
              </button>
              <button
                type="button"
                class="profile-action profile-action--icon"
                aria-label="Archive and saved posts"
                aria-haspopup="menu"
                :aria-expanded="coverMenuEvent !== null"
                @click="coverMenuEvent = $event"
              >
                <ion-icon :icon="ellipsisHorizontal" aria-hidden="true" />
              </button>
            </template>
          </ProfileHeader>

          <nav class="profile-stats" aria-label="Profile summary">
            <router-link v-for="stat in stats" :key="stat.label" :to="stat.to" class="profile-stats__item">
              <strong>{{ formatCompactNumber(stat.value) }}</strong>
              <span>{{ stat.label }}</span>
            </router-link>
          </nav>
        </section>

        <ion-popover :is-open="coverMenuEvent !== null" :event="coverMenuEvent" side="bottom" alignment="end" @did-dismiss="coverMenuEvent = null">
          <nav class="profile-cover-menu__links" aria-label="Profile options">
            <router-link to="/profile/archive" class="profile-cover-menu__link" @click="coverMenuEvent = null">
              <ion-icon :icon="archiveOutline" aria-hidden="true" /> Archive
            </router-link>
            <router-link to="/profile/saved" class="profile-cover-menu__link" @click="coverMenuEvent = null">
              <ion-icon :icon="bookmarkOutline" aria-hidden="true" /> Saved Posts
            </router-link>
          </nav>
        </ion-popover>

        <nav class="profile-links" aria-label="Profile sections">
          <router-link v-for="row in sections.visible" :key="row.key" :to="row.to" class="profile-links__item">
            {{ row.title }}
          </router-link>
          <button
            type="button"
            class="profile-links__item profile-links__more"
            aria-haspopup="menu"
            :aria-expanded="moreEvent !== null"
            @click="moreEvent = $event"
          >
            More
            <ion-icon :icon="chevronDown" aria-hidden="true" />
          </button>
        </nav>

        <ion-popover
          class="gora-popover"
          :is-open="moreEvent !== null"
          :event="moreEvent"
          side="bottom"
          alignment="end"
          @did-dismiss="moreEvent = null"
        >
          <nav class="profile-more" aria-label="More profile sections">
            <router-link
              v-for="row in sections.more"
              :key="row.key"
              :to="row.to"
              class="profile-more__item"
              @click="moreEvent = null"
            >
              <strong>{{ row.title }}</strong>
              <span>{{ row.summary }}</span>
            </router-link>
          </nav>
        </ion-popover>

        <div class="profile-card">
          <MySportsSection
            :sports="sportsStore.mySports"
            editable
            :busy-id="sportsStore.busyId"
            :loading="sportsStore.mySportsStatus === 'loading'"
            :error="sportsStore.mySportsError"
            @add="openAddSport"
            @edit="openEditSport"
            @remove="confirmRemoveSport"
            @retry="sportsStore.fetchMySports({ force: true })"
          />
        </div>

        <section class="profile-card" aria-label="My clubs">
          <SectionHeader title="My Clubs">
            <router-link v-if="myClubs.length > 0" to="/profile/clubs" class="profile-card__link">See all</router-link>
          </SectionHeader>
          <p v-if="myClubs.length === 0" class="profile-card__empty">
            You haven't joined any clubs yet. <router-link to="/search">Find a club</router-link> for your sport.
          </p>
          <ul v-else class="profile-clubs">
            <li v-for="club in myClubs" :key="club.id">
              <router-link
                :to="`/clubs/${club.id}`"
                class="profile-clubs__item"
                :aria-label="`${club.name}${club.viewerMembership && club.viewerMembership.role !== 'MEMBER' ? `, ${CLUB_ROLE_LABELS[club.viewerMembership.role]}` : ''}`"
              >
                <span class="profile-clubs__ring">
                  <span class="profile-clubs__inner">
                    <ClubAvatar :club="club" :image-url="club.profileImageUrl" :size="60" />
                  </span>
                </span>
              </router-link>
            </li>
          </ul>
        </section>

        <section class="profile-card" aria-label="Highlights">
          <SectionHeader title="Highlights">
            <router-link to="/profile/reels" class="profile-card__link">See all</router-link>
          </SectionHeader>
          <p v-if="highlights.length === 0" class="profile-card__empty">
            No highlights yet. <router-link to="/create/reel">Upload a reel</router-link>
          </p>
          <HighlightGrid v-else :highlights="highlights" :editable-reels="reelsStore.myReels" />
        </section>

        <section class="profile-feed-section" aria-label="My feed">
          <SectionHeader title="My Feed">
            <router-link to="/profile/games" class="profile-card__link">Manage games</router-link>
          </SectionHeader>
          <router-link to="/create/post" class="profile-card profile-composer">
            <UserAvatar v-if="profileStore.account" :user="profileStore.account" :size="38" />
            <span class="profile-composer__prompt">Share a game moment…</span>
            <ion-icon :icon="imageOutline" class="profile-composer__icon" aria-label="Add photos" />
          </router-link>
          <p v-if="postsStore.serverError || reelsStore.serverError" class="profile-card profile-card__empty" role="alert">
            {{ postsStore.serverError || reelsStore.serverError }}
          </p>
          <p v-else-if="myFeed.length === 0" class="profile-card profile-card__empty">
            No posts, reels, or games yet. <router-link to="/create/post">Create your first post</router-link>
          </p>
          <div class="profile-feed">
            <FeedEntry
              v-for="item in myFeed"
              :key="item.id"
              :item="item"
              :now-ms="now"
              @like="likePost"
              @comment="commentOnPost"
              @share="sharePost"
            />
          </div>
        </section>
      </div>
    </ion-content>

    <SportEditorModal
      :is-open="editor.open"
      :entry="editor.entry"
      :options="sportsStore.addable"
      :options-loading="sportsStore.sportsStatus === 'loading'"
      :options-error="sportsStore.sportsError"
      :no-sports-available="sportsStore.sportsStatus === 'ready' && sportsStore.activeSports.length === 0"
      :save="saveSport"
      @close="editor.open = false"
      @retry="sportsStore.fetchSports({ force: true })"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonPopover,
  IonSkeletonText,
  alertController,
  onIonViewWillEnter,
} from '@ionic/vue';
import {
  archiveOutline,
  bookmarkOutline,
  chevronDown,
  createOutline,
  ellipsisHorizontal,
  imageOutline,
  shareSocialOutline,
} from 'ionicons/icons';
import ClubAvatar from '@/components/clubs/ClubAvatar.vue';
import SectionHeader from '@/components/common/SectionHeader.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import FeedEntry from '@/components/feed/FeedEntry.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import HighlightGrid from '@/components/profile/HighlightGrid.vue';
import MySportsSection from '@/components/profile/MySportsSection.vue';
import ProfileHeader from '@/components/profile/ProfileHeader.vue';
import SportEditorModal from '@/components/profile/SportEditorModal.vue';
import { useNow } from '@/composables/useNow';
import { usePostActions } from '@/composables/usePostActions';
import { useClubsStore } from '@/stores/clubs';
import { useGamesStore } from '@/stores/games';
import { usePostsStore } from '@/stores/posts';
import { type ActionResult, useProfileStore } from '@/stores/profile';
import { useReelsStore } from '@/stores/reels';
import { useSessionStore } from '@/stores/session';
import { useSportsStore } from '@/stores/sports';
import type { AddSportInput, UserSportEntry } from '@/types/profile';
import type { HomeFeedItem } from '@/types/feed';
import { CLUB_ROLE_LABELS, groupMyClubs } from '@/utils/clubs';
import { toHighlight } from '@/utils/media-api';
import { showNotice } from '@/utils/notice';
import { shareLink } from '@/utils/share-link';
import { buildProfileSections, splitProfileSections } from '@/utils/profile-sections';
import { formatCompactNumber } from '@/utils/time';

const profileStore = useProfileStore();
const sportsStore = useSportsStore();
const postsStore = usePostsStore();
const clubsStore = useClubsStore();
const gamesStore = useGamesStore();
const reelsStore = useReelsStore();
const session = useSessionStore();
const { likePost, commentOnPost, sharePost } = usePostActions();
const now = useNow();

const profile = computed(() => profileStore.currentProfile);
const editor = reactive<{ open: boolean; entry: UserSportEntry | null }>({ open: false, entry: null });

const stats = computed(() =>
  profile.value
    ? [
        { label: 'Friends', value: profile.value.stats.friends, to: '/profile/friends' },
        { label: 'Followers', value: profile.value.stats.followers, to: '/profile/followers' },
        { label: 'Following', value: profile.value.stats.following, to: '/profile/following' },
      ]
    : [],
);
const sections = computed(() =>
  splitProfileSections(profile.value ? buildProfileSections(profile.value.stats, profile.value.sections) : []),
);
/** The click that opened the More menu, used to anchor it. Null when closed. */
const moreEvent = ref<Event | null>(null);
const coverMenuEvent = ref<Event | null>(null);
/** Every club you are an ACTIVE member of (the same list as My Clubs → Your clubs), owner first. */
const myClubs = computed(() => groupMyClubs(clubsStore.clubs).joined);

async function shareProfile(): Promise<void> {
  coverMenuEvent.value = null;
  const current = profile.value;
  if (!current) return;
  try {
    const result = await shareLink(`${current.displayName}'s GORA profile`, `/profile/${encodeURIComponent(current.username)}`);
    if (result !== 'cancelled') void showNotice(result === 'copied' ? 'Profile link copied.' : 'Profile shared.');
  } catch {
    void showNotice('Could not share this profile. Please try again.');
  }
}

/** The 3 newest of your own reels (the demo highlights only when nobody is signed in). */
const highlights = computed(() =>
  reelsStore.savesToServer
    ? reelsStore.myReels.slice(0, 3).map(toHighlight)
    : (profileStore.profile?.highlights.slice(0, 3) ?? []),
);
/** Own posts, reels, and hosted games, newest first. */
const myFeed = computed<HomeFeedItem[]>(() => [
  ...postsStore.myPosts.map((post) => ({
    type: 'POST' as const,
    id: `post:${post.id}`,
    at: Date.parse(post.createdAt),
    post,
  })),
  ...gamesStore.hostedGames.map((game) => ({
    type: 'SERVER_GAME' as const,
    id: `game:${game.id}`,
    at: Date.parse(game.createdAt),
    game,
  })),
  ...reelsStore.myReels.map((reel) => ({
    type: 'REEL' as const,
    id: `reel:${reel.id}`,
    at: Date.parse(reel.createdAt),
    reel,
  })),
].sort((a, b) => b.at - a.at));

async function loadProfile(): Promise<void> {
  await profileStore.fetchMyProfile();
}

function openAddSport(): void {
  void sportsStore.fetchSports();
  editor.entry = null;
  editor.open = true;
}

function openEditSport(sport: UserSportEntry): void {
  editor.entry = sport;
  editor.open = true;
}

async function saveSport(draft: AddSportInput): Promise<ActionResult> {
  const editing = editor.entry;
  const result = editing
    ? await sportsStore.updateSport(draft.sportId, { skillLevel: draft.skillLevel, position: draft.position })
    : await sportsStore.addSport(draft);

  if (result.ok) {
    const name = editing?.name ?? sportsStore.sportName(draft.sportId) ?? 'Sport';
    void showNotice(editing ? `${name} updated.` : `${name} added to your sports.`);
  }

  return result;
}

async function confirmRemoveSport(sport: UserSportEntry): Promise<void> {
  const alert = await alertController.create({
    header: `Remove ${sport.name} from your sports?`,
    message: 'It will no longer show on your profile. You can add it again anytime.',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Remove', role: 'destructive' },
    ],
  });

  await alert.present();
  const { role } = await alert.onDidDismiss();

  if (role !== 'destructive') {
    return;
  }

  const result = await sportsStore.removeSport(sport.sportId);
  void showNotice(result.ok ? `${sport.name} removed from your sports.` : result.message);
}

onIonViewWillEnter(() => {
  if (postsStore.isLoaded) void postsStore.refresh();
  // Club acceptance can add points while this profile page is cached.
  if (!profileStore.loading) void loadProfile();
  void clubsStore.load();
  void gamesStore.fetchMyGames();

  if (reelsStore.isLoaded) {
    void reelsStore.refresh();
  }
});

onMounted(() => {
  void loadProfile();
  void profileStore.load();
  void session.load();
  void postsStore.load();
  void reelsStore.load();
});
</script>

<style scoped>
/* Centered single-column layout: every block is a card on the page background. */
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 0 0 32px;
  box-sizing: border-box;
}

.profile-card {
  padding: 18px 16px;
  border: 1px solid var(--gora-line);
  border-radius: 14px;
  background: var(--gora-surface);
  box-shadow: var(--gora-shadow);
}

.profile-card--hero {
  overflow: hidden;
  padding: 0;
  border-top: 0;
  border-radius: 0 0 16px 16px;
}

@media (max-width: 767px) {
  .profile-page {
    gap: 10px;
  }

  .profile-card {
    margin: 0 12px;
  }

  .profile-card--hero {
    margin: 0;
    border-right: 0;
    border-left: 0;
    border-radius: 0 0 16px 16px;
  }
}

@media (min-width: 768px) {
  .profile-page {
    padding-top: 16px;
  }

  .profile-card--hero {
    border-top: 1px solid var(--gora-line);
    border-radius: 16px;
  }

  .profile-card--hero :deep(.profile-header__cover) {
    border-radius: 0;
  }
}

/* Header actions */
.profile-action {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid var(--gora-line);
  border-radius: 10px;
  background: var(--gora-surface-raised);
  color: var(--ion-text-color);
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
  transition: background var(--gora-motion), border-color var(--gora-motion);
}

.profile-action:hover {
  background: var(--gora-surface-hover);
}

.profile-action ion-icon {
  font-size: 18px;
}

.profile-action--primary {
  border-color: transparent;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}

.profile-action--primary:hover {
  background: var(--ion-color-primary-tint);
}

.profile-action--icon {
  flex: 0 0 42px;
  padding: 0;
}

/* Stats strip inside the hero card */
.profile-stats {
  display: grid;
  margin: 16px 16px 0;
  border-top: 1px solid var(--gora-line);
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.profile-stats__item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 16px 4px 18px;
  color: var(--ion-text-color);
  text-decoration: none;
  transition: color var(--gora-motion);
}

.profile-stats__item + .profile-stats__item {
  border-left: 1px solid var(--gora-line);
}

.profile-stats__item:hover strong {
  color: var(--ion-color-primary);
}

.profile-stats__item strong {
  font-size: 1.3rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  transition: color var(--gora-motion);
}

.profile-stats__item span {
  color: var(--gora-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

/* Section pills */
.profile-links {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 12px;
  scrollbar-width: none;
}

@media (min-width: 768px) {
  .profile-links {
    padding: 2px 0;
  }
}

.profile-links::-webkit-scrollbar {
  display: none;
}

.profile-links__item {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  border: 1px solid var(--gora-line);
  border-radius: 999px;
  background: var(--gora-surface);
  color: var(--ion-text-color);
  cursor: pointer;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 650;
  text-decoration: none;
  white-space: nowrap;
  transition: border-color var(--gora-motion), color var(--gora-motion);
}

.profile-links__item:hover {
  border-color: var(--gora-accent-line);
  color: var(--ion-color-primary);
}

.profile-links__more ion-icon {
  font-size: 14px;
}

.profile-more {
  display: flex;
  flex-direction: column;
  padding: 6px;
}

.profile-more__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px;
  border-radius: 8px;
  color: var(--ion-text-color);
  text-decoration: none;
}

.profile-more__item strong {
  font-size: 0.92rem;
}

.profile-more__item span {
  color: var(--gora-muted);
  font-size: 0.75rem;
}

.profile-more__item:hover {
  background: var(--gora-surface-hover);
}

/* Section content */
.profile-card__link {
  color: var(--ion-color-primary);
  font-size: 0.8rem;
  font-weight: 700;
  text-decoration: none;
}

.profile-card__empty {
  margin: 0;
  color: var(--gora-muted);
  font-size: 0.88rem;
  line-height: 1.5;
}

.profile-card__empty a {
  color: var(--ion-color-primary);
  font-weight: 600;
}

/* Inner tiles sit on a raised tone so they read against the card. */
.profile-card :deep(.my-sports) {
  margin: 0;
  padding: 0;
}

.profile-card :deep(:is(.my-sports__card, .my-sports__empty)) {
  background: var(--gora-surface-raised);
}

.profile-card :deep(.my-sports__header) {
  margin-bottom: 14px;
}

/* Clubs: logos in a horizontal rail. */
.profile-clubs {
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

.profile-clubs::-webkit-scrollbar {
  display: none;
}

.profile-clubs > li {
  flex-shrink: 0;
  scroll-snap-align: start;
}

.profile-clubs__item {
  display: flex;
  width: 72px;
  flex-direction: column;
  align-items: center;
  color: var(--ion-text-color);
  text-decoration: none;
}

/* Same ring as a story avatar; only the club picture shows. */
.profile-clubs__ring {
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

.profile-clubs__inner {
  display: flex;
  padding: 3px;
  border-radius: 50%;
  background: var(--gora-surface);
}

.profile-clubs__inner :deep(.club-avatar) {
  border-radius: 50% !important;
}

.profile-clubs__item:hover .profile-clubs__ring,
.profile-clubs__item:focus-visible .profile-clubs__ring {
  transform: translateY(-2px);
}

/* Feed */
.profile-feed-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
}

.profile-feed-section > :deep(.section-header) {
  margin: 0;
  padding: 0 16px;
}

@media (min-width: 768px) {
  .profile-feed-section > :deep(.section-header) {
    padding: 0 4px;
  }
}

.profile-composer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  color: var(--gora-muted);
  font-size: 0.9rem;
  text-decoration: none;
  transition: border-color var(--gora-motion);
}

.profile-composer:hover {
  border-color: var(--gora-accent-line);
}

.profile-composer__prompt {
  flex: 1;
  padding: 9px 14px;
  border-radius: 999px;
  background: var(--gora-surface-raised);
}

.profile-composer__icon {
  color: var(--ion-color-primary);
  font-size: 22px;
}

.profile-feed {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 767px) {
  .profile-feed {
    padding: 0 12px;
  }
}

/* Loading & error */
.profile-error {
  padding: 48px 24px;
  text-align: center;
}

.profile-error p {
  color: var(--gora-muted);
}

.profile-skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 720px;
  margin: 0 auto;
  padding-bottom: 24px;
}

.profile-skeleton__cover {
  height: 190px;
  margin: 0;
}

.profile-skeleton__avatar {
  width: 112px;
  height: 112px;
  margin: -64px 16px 0;
  border-radius: 50%;
}

.profile-skeleton__line {
  width: 35%;
  height: 16px;
  margin: 0 16px;
}

.profile-skeleton__line--wide {
  width: 55%;
  height: 24px;
}

.profile-skeleton__stats {
  display: grid;
  gap: 8px;
  margin: 8px 16px 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.profile-skeleton__stat {
  height: 56px;
  margin: 0;
  border-radius: var(--gora-radius-card);
}

.profile-cover-menu__links {
  display: grid;
  min-width: 180px;
  padding: 6px;
}

.profile-cover-menu__link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  color: var(--ion-text-color);
  font-weight: 600;
  text-decoration: none;
}

.profile-cover-menu__link ion-icon {
  color: var(--gora-muted);
  font-size: 18px;
}

.profile-cover-menu__link:hover {
  background: var(--gora-surface-hover);
}
</style>
