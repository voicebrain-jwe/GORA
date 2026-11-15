<template>
  <ion-page>
    <AppHeader />

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ion-refresh="handlePullRefresh">
        <ion-refresher-content pulling-text="Pull to refresh" refreshing-spinner="crescent" />
      </ion-refresher>
      <StoryRail
        :viewer="storiesStore.viewer"
        :own="storyFeed.own"
        :others="storyFeed.others"
        :now-ms="now"
        @open="openStories"
        @add="router.push('/create/story')"
      />
      <LiveRail :active="liveVisible" />

      <div class="home__composer">
        <router-link to="/create/post" class="home__composer-main">
          <UserAvatar v-if="postsStore.me" :user="postsStore.me" :size="40" />
          <span class="home__composer-prompt">Share a game moment…</span>
        </router-link>
        <nav class="home__composer-actions" aria-label="Create">
          <router-link to="/create/post" class="home__composer-action">
            <ion-icon :icon="imageOutline" aria-hidden="true" /> Photo
          </router-link>
          <router-link to="/create/game" class="home__composer-action">
            <ion-icon :icon="calendarOutline" aria-hidden="true" /> Game
          </router-link>
          <router-link to="/create/reel" class="home__composer-action">
            <ion-icon :icon="filmOutline" aria-hidden="true" /> Reel
          </router-link>
        </nav>
      </div>

      <section class="home__section">
        <div class="home__feed-heading">
          <nav class="home__tabs" aria-label="Home feed">
            <button
              v-for="option in feedOptions"
              :key="option.id"
              type="button"
              :aria-pressed="scope === option.id"
              :class="{ 'home__tab--active': scope === option.id }"
              @click="scope = option.id"
            >
              {{ option.label }}
            </button>
          </nav>
          <button
            type="button"
            class="home__refresh"
            :disabled="refreshing"
            aria-label="Refresh feed"
            @click="refreshFeed"
          >
            <ion-icon :icon="refreshOutline" aria-hidden="true" :class="{ home__spinning: refreshing }" />
          </button>
        </div>
        <p class="home__feed-note">
          {{
            scope === 'FRIENDS'
              ? 'Posts from you and your mutual friends · Newest first'
              : `Posts from your community · ${filters.sport ? `${filters.sport} games` : 'All games'} within ${nearbyRadiusKm} km`
          }}
        </p>
        <div v-if="postsStore.serverError || reelsStore.serverError || storiesStore.serverError || friendsStore.error" class="home__error" role="alert">
          <span>{{ postsStore.serverError || reelsStore.serverError || storiesStore.serverError || friendsStore.error }}</span
          ><button type="button" @click="refreshFeed">Try again</button>
        </div>
        <div v-if="feed.length === 0" class="home__empty" :aria-busy="refreshing">
          <ion-icon :icon="scope === 'FRIENDS' ? peopleOutline : newspaperOutline" aria-hidden="true" />
          <h2>
            {{
              refreshing
                ? 'Loading your feed…'
                : scope === 'FRIENDS'
                  ? 'Your circle starts here'
                  : 'You’re all caught up'
            }}
          </h2>
          <p>
            {{
              scope === 'FRIENDS'
                ? 'Once a friend request is accepted, their Public and Friends posts appear here.'
                : 'Share a game moment or try another sport to see more updates.'
            }}
          </p>
          <router-link v-if="!refreshing" :to="scope === 'FRIENDS' ? '/search' : '/create/post'">{{
            scope === 'FRIENDS' ? 'Find friends' : 'Create a post'
          }}</router-link>
        </div>
        <div class="home__stack">
          <FeedEntry
            v-for="item in feed"
            :key="item.id"
            :item="item"
            :now-ms="now"
            @like="likePost"
            @comment="commentOnPost"
            @share="sharePost"
            @join="joinGame"
          />
        </div>
        <button
          v-if="hasMore"
          type="button"
          class="home__load-more"
          :disabled="postsStore.loadingMore || refreshing"
          @click="postsStore.loadMore(scope)"
        >
          {{ postsStore.loadingMore ? 'Loading…' : 'Load more posts' }}
        </button>
      </section>

      <StoryViewer
        :is-open="viewerGroups.length > 0"
        :groups="viewerGroups"
        :start-index="viewerStartIndex"
        :now-ms="now"
        @close="closeStories"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonIcon, IonPage, IonRefresher, IonRefresherContent, onIonViewWillEnter, onIonViewDidLeave } from '@ionic/vue';
import { calendarOutline, filmOutline, imageOutline, peopleOutline, refreshOutline, newspaperOutline } from 'ionicons/icons';
import UserAvatar from '@/components/common/UserAvatar.vue';
import FeedEntry from '@/components/feed/FeedEntry.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import StoryRail from '@/components/stories/StoryRail.vue';
import StoryViewer from '@/components/stories/StoryViewer.vue';
import LiveRail from '@/components/live/LiveRail.vue';
import { useJoinGame } from '@/composables/useJoinGame';
import { useNow } from '@/composables/useNow';
import { usePostActions } from '@/composables/usePostActions';
import { useCatalogStore } from '@/stores/catalog';
import { useClubsStore } from '@/stores/clubs';
import { useFiltersStore } from '@/stores/filters';
import { useFriendsStore } from '@/stores/friends';
import { useGamesStore } from '@/stores/games';
import { usePostsStore } from '@/stores/posts';
import { useReelsStore } from '@/stores/reels';
import { useSessionStore } from '@/stores/session';
import { useStoriesStore } from '@/stores/stories';
import type { StoryGroup } from '@/types/story';
import { getNearbyRadiusKm } from '@/utils/discover';
import { buildFriendsFeed, buildHomeFeed, type HomeFeedSources } from '@/utils/feed';
import { tabRefreshEvent } from '@/utils/tab-refresh';

const router = useRouter();
const liveVisible = ref(true);
const session = useSessionStore();
const storiesStore = useStoriesStore();
const postsStore = usePostsStore();
const gamesStore = useGamesStore();
const reelsStore = useReelsStore();
const catalog = useCatalogStore();
const clubsStore = useClubsStore();
const filters = useFiltersStore();
const friendsStore = useFriendsStore();
const scope = ref<'ALL' | 'FRIENDS'>('ALL');
const feedOptions = [
  { id: 'ALL' as const, label: 'All updates' },
  { id: 'FRIENDS' as const, label: 'Friends' },
];
const refreshing = computed(() => postsStore.serverStatus === 'loading' || reelsStore.serverStatus === 'loading' || friendsStore.loading);
const hasMore = computed(() => (scope.value === 'ALL' ? !!postsStore.nextCursor : !!postsStore.friendsNextCursor));
const { joinGame } = useJoinGame();
const { likePost, commentOnPost, sharePost } = usePostActions();
const now = useNow();

const activeFilters = computed(() => ({ maxDistanceKm: filters.maxDistanceKm, sport: filters.sport }));
const nearbyRadiusKm = computed(() => getNearbyRadiusKm(activeFilters.value));

const feed = computed(() => {
  if (scope.value === 'FRIENDS') {
    const circleIds = new Set([...friendsStore.friendIds, ...(postsStore.me ? [postsStore.me.id] : [])]);
    return buildFriendsFeed(
      {
        ...feedSources.value,
        posts: postsStore.savesToServer
          ? postsStore.friendPosts
          : postsStore.visiblePosts.filter((post) => circleIds.has(post.author.id)),
      },
      [...circleIds],
      activeFilters.value,
    );
  }
  return buildHomeFeed({ ...feedSources.value, posts: postsStore.visiblePosts }, activeFilters.value);
});
const feedSources = computed<HomeFeedSources>(() => ({
  posts: [],
  games: gamesStore.games,
  // Keep the user's own games visible even outside the public feed's first page.
  serverGames: [...new Map([...gamesStore.listedGames, ...gamesStore.hostedGames].map((game) => [game.id, game])).values()],
  clubs: clubsStore.feedClubs,
  reels: reelsStore.feedReels,
  activities: catalog.activities,
}));

const storyFeed = computed(() => storiesStore.getFeedAt(now.value));

/** Snapshot taken on open, so expiry ticks do not reshuffle an open viewer. */
const viewerGroups = ref<StoryGroup[]>([]);
const viewerStartIndex = ref(0);

function openStories(group: StoryGroup): void {
  const firstStory = group.stories[0];
  if (firstStory) void storiesStore.markViewed(firstStory.id);

  const groups = storyFeed.value.own ? [storyFeed.value.own, ...storyFeed.value.others] : [...storyFeed.value.others];

  viewerStartIndex.value = Math.max(
    0,
    groups.findIndex((candidate) => candidate.user.id === group.user.id),
  );
  viewerGroups.value = groups;
}

function closeStories(): void {
  viewerGroups.value = [];
}

/** Coming back to Home picks up posts and stories added or deleted since the last visit. */
async function refreshFeed(): Promise<void> {
  await Promise.all([
    friendsStore.refresh(),
    postsStore.refresh(),
    reelsStore.refresh(),
    gamesStore.refreshFeedGames(),
    clubsStore.refreshFeedClubs(),
  ]);
  if (storiesStore.isLoaded) await storiesStore.refresh();
}

async function handlePullRefresh(event: CustomEvent): Promise<void> {
  try {
    await refreshFeed();
    await catalog.refreshSports();
  } finally {
    (event.target as HTMLIonRefresherElement).complete();
  }
}

let refreshTimer: ReturnType<typeof setInterval> | undefined;
const refreshHomeEvent = tabRefreshEvent('home');
function handleHomeTabRefresh(): void {
  void refreshFeed();
}

function stopRefreshing(): void {
  clearInterval(refreshTimer);
  refreshTimer = undefined;
}
onIonViewWillEnter(() => {
  liveVisible.value = true;
  if (postsStore.isLoaded) void refreshFeed();
  stopRefreshing();
  refreshTimer = setInterval(() => {
    if (document.visibilityState === 'visible') void refreshFeed();
  }, 30_000);
});
onIonViewDidLeave(() => { liveVisible.value = false; stopRefreshing(); });
onUnmounted(() => {
  stopRefreshing();
  window.removeEventListener(refreshHomeEvent, handleHomeTabRefresh);
});

onMounted(() => {
  window.addEventListener(refreshHomeEvent, handleHomeTabRefresh);
  void loadHomeData();
});

async function loadHomeData(): Promise<void> {
  await session.load();
  await Promise.all([
    storiesStore.load(),
    postsStore.load(),
    gamesStore.load(),
    gamesStore.fetchMyGames(),
    clubsStore.load(),
    reelsStore.load(),
    catalog.load(),
  ]);
}
</script>

<style scoped>
/* Composer */
.home__composer {
  margin: 12px 16px 4px;
  padding: 14px 14px 8px;
  border: 1px solid var(--gora-line);
  border-radius: var(--gora-radius-card);
  background: var(--gora-surface);
  box-shadow: var(--gora-shadow);
}

.home__composer-main {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.home__composer-prompt {
  flex: 1;
  padding: 11px 16px;
  border-radius: 999px;
  background: var(--gora-surface-raised);
  color: var(--gora-muted);
  font-size: 0.9rem;
  transition: background var(--gora-motion);
}

.home__composer-main:hover .home__composer-prompt {
  background: var(--gora-surface-hover);
}

.home__composer-actions {
  display: grid;
  margin-top: 10px;
  padding-top: 6px;
  border-top: 1px solid var(--gora-line);
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.home__composer-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 4px;
  border-radius: 8px;
  color: var(--gora-muted);
  font-size: 0.82rem;
  font-weight: 650;
  text-decoration: none;
  transition: background var(--gora-motion), color var(--gora-motion);
}

.home__composer-action:hover {
  background: var(--gora-surface-hover);
  color: var(--ion-text-color);
}

.home__composer-action ion-icon {
  color: var(--ion-color-primary);
  font-size: 18px;
}

/* Feed */
.home__section {
  padding: 12px 16px 32px;
}

.home__feed-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.home__tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--gora-line);
  border-radius: 999px;
  background: var(--gora-surface);
}

.home__tabs button {
  padding: 7px 16px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--gora-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 700;
  transition: background var(--gora-motion), color var(--gora-motion);
}

.home__tabs button:hover:not(.home__tab--active) {
  color: var(--ion-text-color);
}

.home__tabs .home__tab--active {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}

.home__refresh {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid var(--gora-line);
  border-radius: 50%;
  background: var(--gora-surface);
  color: var(--gora-muted);
  cursor: pointer;
  font-size: 18px;
  transition: color var(--gora-motion), border-color var(--gora-motion);
}

.home__refresh:hover:not(:disabled) {
  border-color: var(--gora-accent-line);
  color: var(--ion-color-primary);
}

.home__feed-note {
  margin: 10px 2px 14px;
  color: var(--gora-muted);
  font-size: 0.75rem;
  line-height: 1.5;
}

.home__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 14px;
  padding: 12px 14px;
  border: 1px solid var(--gora-accent-line);
  border-radius: var(--gora-radius-card);
  background: var(--gora-accent-soft);
  color: var(--ion-text-color);
  font-size: 0.82rem;
}

.home__error button {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: var(--ion-color-primary);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.home__empty {
  padding: 36px 20px;
  border: 1px solid var(--gora-line);
  border-radius: var(--gora-radius-card);
  background: var(--gora-surface);
  text-align: center;
}

.home__empty > ion-icon {
  display: inline-grid;
  width: 56px;
  height: 56px;
  padding: 14px;
  box-sizing: border-box;
  border-radius: 50%;
  background: var(--gora-accent-soft);
  color: var(--ion-color-primary);
  font-size: 28px;
}

.home__empty h2 {
  margin: 14px 0 8px;
  color: var(--ion-text-color);
  font-size: 1.05rem;
}

.home__empty p {
  max-width: 340px;
  margin: 0 auto 18px;
  color: var(--gora-muted);
  font-size: 0.85rem;
  line-height: 1.6;
}

.home__empty a {
  display: inline-block;
  padding: 10px 18px;
  border-radius: 999px;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: none;
}

.home__stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.home__load-more {
  display: block;
  margin: 20px auto 0;
  padding: 10px 22px;
  border: 1px solid var(--gora-line);
  border-radius: 999px;
  background: var(--gora-surface);
  color: var(--ion-text-color);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 650;
}

.home__load-more:hover:not(:disabled) {
  border-color: var(--gora-accent-line);
  color: var(--ion-color-primary);
}

.home__spinning {
  animation: home-spin 1s linear infinite;
}

@keyframes home-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home__spinning {
    animation: none;
  }
}
</style>
