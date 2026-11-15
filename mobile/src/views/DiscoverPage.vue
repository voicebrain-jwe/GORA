<template>
  <ion-page>
    <AppHeader />

    <ion-content :fullscreen="true">
      <PullToRefresh :reload="refreshDiscoverData" />
      <div class="discover">
        <header class="discover__header">
          <h1 class="discover__title">Discover</h1>
          <p class="discover__subtitle">Games, players, clubs, and highlights from the GORA community.</p>
        </header>
        <p v-if="filters.isActive" class="discover__filters">
          Showing {{ filters.sport ?? 'all sports' }} within {{ formatDistanceFilter(filters.maxDistanceKm) }}
          <button type="button" @click="filters.reset()">Clear</button>
        </p>

        <div class="discover__tabs">
          <SegmentTabs v-model="tab" :options="DISCOVER_TABS" aria-label="Discover feed" />
        </div>

        <template v-if="tab === 'FRIENDS'">
          <p class="discover__intro">Posts, games, reels, and activity from your friends and the people you follow.</p>
          <p v-if="friendsFeed.length === 0" class="discover__empty">
            Nothing from friends matches your filters yet. Add friends or follow players to fill this feed.
          </p>
          <div class="discover__feed">
            <FeedEntry
              v-for="item in friendsFeed"
              :key="item.id"
              :item="item"
              :now-ms="now"
              @like="likePost"
              @comment="commentOnPost"
              @share="sharePost"
              @join="joinGame"
            />
          </div>
        </template>

        <template v-else-if="tab === 'CLUBS'">
          <section class="discover__section discover__card">
            <SectionHeader title="Your clubs">
              <router-link to="/profile/clubs" class="discover__accent discover__link">My Clubs</router-link>
            </SectionHeader>
            <p v-if="feedClubs.length === 0" class="discover__empty">
              Join or follow a club to see its announcements, games, and reels here.
            </p>
            <ul class="discover__rail discover__club-rail">
              <li v-for="club in feedClubs" :key="club.id">
                <router-link :to="`/clubs/${club.id}`" class="discover__club-chip">
                  <ClubAvatar :club="club" :image-url="club.profileImageUrl" :size="52" />
                  <span>{{ club.name }}</span>
                </router-link>
              </li>
            </ul>
          </section>
          <p v-if="feedClubs.length > 0 && clubsFeed.length === 0" class="discover__empty">
            Your clubs have nothing that matches your filters.
          </p>
          <div class="discover__feed">
            <FeedEntry
              v-for="item in clubsFeed"
              :key="item.id"
              :item="item"
              :now-ms="now"
              @like="likePost"
              @comment="commentOnPost"
              @share="sharePost"
              @join="joinGame"
            />
          </div>
        </template>

        <template v-else>
          <div class="discover__card discover__card--component"><NearbyGamesSection /></div>

          <section class="discover__section discover__card">
            <SectionHeader title="Trending Sports" />
            <div class="discover__grid">
              <SportTile
                v-for="sport in feed.trendingSports"
                :key="sport.id"
                :sport="sport"
                show-stats
                @select="openSportSearch"
              />
            </div>
          </section>

          <section class="discover__section discover__card">
            <SectionHeader title="Popular Games" />
            <div class="discover__rail discover__rail--cards">
              <GameCard
                v-for="game in feed.popularGames"
                :key="game.id"
                :game="game"
                :now-ms="now"
                class="discover__game"
                @join="joinGame"
              />
            </div>
          </section>

          <section class="discover__section discover__card">
            <SectionHeader title="Trending Reels" />
            <div class="discover__rail discover__rail--reels">
              <ReelThumb v-for="reel in feed.trendingReels" :key="reel.id" :reel="reel" class="discover__reel" />
            </div>
          </section>

          <section class="discover__section discover__card">
            <SectionHeader title="Popular Players" />
            <ul class="discover__rail">
              <li v-for="player in feed.popularPlayers" :key="player.id" class="discover__player">
                <router-link :to="`/profile/${player.username}`" class="discover__profile-link">
                  <UserAvatar :user="player" :size="64" />
                  <strong>{{ player.displayName }}</strong>
                </router-link>
                <span>{{ player.primarySport }}</span>
                <span class="discover__accent">{{ formatCompactNumber(player.followers) }} followers</span>
              </li>
            </ul>
          </section>

          <div class="discover__card discover__card--component"><GoraPointsRanking /></div>

          <section class="discover__section discover__card">
            <SectionHeader title="Featured Athletes" />
            <ul class="discover__stack discover__featured-list">
              <li
                v-for="athlete in feed.featuredAthletes"
                :key="athlete.id"
                class="discover__featured"
                :style="{ background: getSportVisual(athlete.primarySport).gradient }"
              >
                <UserAvatar :user="athlete" :size="56" />
                <span class="discover__featured-text">
                  <router-link :to="`/profile/${athlete.username}`" class="discover__profile-link">
                    <strong>{{ athlete.displayName }}</strong>
                  </router-link>
                  <span>{{ athlete.primarySport }} · {{ athlete.city }}</span>
                  <span>{{ athlete.gamesCompleted }} games completed · {{ formatCompactNumber(athlete.followers) }} followers</span>
                </span>
                <ion-icon :icon="star" class="discover__featured-star" aria-label="Featured" />
              </li>
            </ul>
          </section>

          <section class="discover__section discover__card">
            <SectionHeader title="Popular Clubs" />
            <p v-if="feed.popularClubs.length === 0" class="discover__empty">No clubs match your filters.</p>
            <ul class="discover__stack discover__club-list">
              <ClubRow v-for="club in feed.popularClubs" :key="club.id" :club="club" />
            </ul>
          </section>

          <section class="discover__section discover__posts">
            <SectionHeader title="Public Posts" />
            <div class="discover__stack">
              <PostCard
                v-for="post in feed.publicPosts"
                :key="post.id"
                :post="post"
                :now-ms="now"
                @like="likePost"
                @comment="commentOnPost"
                @share="sharePost"
              />
            </div>
          </section>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { IonContent, IonIcon, IonPage, onIonViewWillEnter } from '@ionic/vue';
import PullToRefresh from '@/components/common/PullToRefresh.vue';
import { star } from 'ionicons/icons';
import ClubAvatar from '@/components/clubs/ClubAvatar.vue';
import ClubRow from '@/components/clubs/ClubRow.vue';
import SectionHeader from '@/components/common/SectionHeader.vue';
import SegmentTabs from '@/components/common/SegmentTabs.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import NearbyGamesSection from '@/components/discover/NearbyGamesSection.vue';
import GoraPointsRanking from '@/components/discover/GoraPointsRanking.vue';
import SportTile from '@/components/discover/SportTile.vue';
import FeedEntry from '@/components/feed/FeedEntry.vue';
import PostCard from '@/components/feed/PostCard.vue';
import GameCard from '@/components/games/GameCard.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import ReelThumb from '@/components/reels/ReelThumb.vue';
import { useJoinGame } from '@/composables/useJoinGame';
import { useNow } from '@/composables/useNow';
import { usePostActions } from '@/composables/usePostActions';
import { useCatalogStore } from '@/stores/catalog';
import { useClubsStore } from '@/stores/clubs';
import { useDiscoveryStore } from '@/stores/discovery';
import { useFiltersStore } from '@/stores/filters';
import { useFollowsStore } from '@/stores/follows';
import { useFriendsStore } from '@/stores/friends';
import { useGamesStore } from '@/stores/games';
import { useGoraRankingStore } from '@/stores/gora-ranking';
import { usePostsStore } from '@/stores/posts';
import { useReelsStore } from '@/stores/reels';
import { useSessionStore } from '@/stores/session';
import type { DiscoveryDateFilter } from '@/types/discovery';
import type { SportCategory } from '@/types/sport';
import { DISCOVER_TABS, type DiscoverTab, buildDiscoverFeed } from '@/utils/discover';
import { buildClubsFeed, buildFriendsFeed, type HomeFeedSources } from '@/utils/feed';
import { formatDistanceFilter } from '@/utils/search';
import { getSportVisual, toSportSlug } from '@/utils/sports';
import { tabRefreshEvent } from '@/utils/tab-refresh';
import { formatCompactNumber } from '@/utils/time';

const router = useRouter();
const route = useRoute();
const session = useSessionStore();
const discovery = useDiscoveryStore();
const catalog = useCatalogStore();
const gamesStore = useGamesStore();
const reelsStore = useReelsStore();
const postsStore = usePostsStore();
const clubsStore = useClubsStore();
const friendsStore = useFriendsStore();
const followsStore = useFollowsStore();
const filters = useFiltersStore();
const ranking = useGoraRankingStore();
const { joinGame } = useJoinGame();
const { likePost, commentOnPost, sharePost } = usePostActions();
const now = useNow();

const tab = ref<DiscoverTab>('ALL');
const refreshDiscoverEvent = tabRefreshEvent('discover');
let discoverDataLoaded = false;

const activeFilters = computed(() => ({ maxDistanceKm: filters.maxDistanceKm, sport: filters.sport }));

const HANDOFF_DATES: readonly DiscoveryDateFilter[] = ['ALL', 'TODAY', 'TOMORROW', 'THIS_WEEK'];

/** Search -> sport -> "Open the map" arrives as /discover?sport=Volleyball&date=TODAY&view=map. */
function applyRouteHandoff(): void {
  const sport = typeof route.query.sport === 'string' ? route.query.sport : null;
  const date = HANDOFF_DATES.find((option) => option === route.query.date) ?? null;

  if (route.path !== '/discover' || (!sport && !date && !route.query.view)) {
    return;
  }

  tab.value = 'ALL';

  if (sport) {
    filters.sport = sport;
  }

  if (date) {
    discovery.selectedDate = date;
    discovery.customDate = null;
  }

  discovery.setViewMode(route.query.view === 'list' ? 'LIST' : 'MAP');
  void router.replace('/discover');
  void discovery.fetchNearbyGames();
}

watch(() => route.fullPath, applyRouteHandoff, { immediate: true });

const feed = computed(() =>
  buildDiscoverFeed(
    {
      players: catalog.players,
      sports: catalog.sports,
      games: gamesStore.games,
      reels: reelsStore.feedReels,
      clubs: clubsStore.clubs,
      posts: postsStore.visiblePosts,
    },
    activeFilters.value,
  ),
);

const sources = computed<HomeFeedSources>(() => ({
  posts: postsStore.visiblePosts,
  games: gamesStore.games,
  serverGames: gamesStore.listedGames,
  clubs: clubsStore.feedClubs,
  reels: reelsStore.feedReels,
  activities: catalog.activities,
}));

/** Accepted friends plus followed accounts; the two relationships stay separate. */
const circleIds = computed(() => {
  const ids = new Set([...friendsStore.friends.map((friend) => friend.id), ...followsStore.followingIds]);

  if (session.me) {
    ids.delete(session.me.id);
  }

  return [...ids];
});

const friendsFeed = computed(() => buildFriendsFeed(sources.value, circleIds.value, activeFilters.value));
const feedClubs = computed(() =>
  clubsStore.clubs.filter((club) => clubsStore.feedClubIds.includes(club.id)),
);
const clubsFeed = computed(() => buildClubsFeed(sources.value, clubsStore.feedClubIds, activeFilters.value));

function openSportSearch(sport: SportCategory): void {
  void router.push(`/search/${toSportSlug(sport.name)}`);
}

onMounted(() => {
  window.addEventListener(refreshDiscoverEvent, refreshDiscoverData);
  void loadDiscoverData().finally(() => {
    discoverDataLoaded = true;
  });
});

onUnmounted(() => window.removeEventListener(refreshDiscoverEvent, refreshDiscoverData));

onIonViewWillEnter(() => {
  if (discoverDataLoaded) void refreshDiscoverData();
});

async function loadDiscoverData(): Promise<void> {
  await session.load();
  await Promise.all([
    ranking.load(),
    catalog.load(),
    gamesStore.load(),
    reelsStore.load(),
    postsStore.load(),
    clubsStore.load(),
    friendsStore.load(),
    followsStore.load(),
  ]);
}

async function refreshDiscoverData(): Promise<void> {
  if (!discoverDataLoaded) return;
  await session.load();
  await Promise.all([
    ranking.load(true),
    catalog.refreshSports(),
    gamesStore.refreshFeedGames(),
    reelsStore.refresh(),
    postsStore.refresh(),
    clubsStore.load(),
    friendsStore.refresh(),
    followsStore.load(),
    discovery.fetchNearbyGames(),
  ]);
}
</script>

<style scoped>
.discover {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px 16px 32px;
}

/* Header */
.discover__header {
  padding: 4px 2px 0;
}

.discover__title {
  margin: 0;
  font-size: 1.7rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.discover__subtitle {
  margin: 4px 0 0;
  color: var(--gora-muted);
  font-size: 0.88rem;
}

.discover__filters {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 7px 8px 7px 14px;
  border: 1px solid var(--gora-accent-line);
  border-radius: 999px;
  background: var(--gora-accent-soft);
  color: var(--ion-text-color);
  font-size: 0.8rem;
}

.discover__filters button {
  padding: 4px 10px;
  border: 0;
  border-radius: 999px;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  cursor: pointer;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Cards */
.discover__card {
  overflow: hidden;
  padding: 16px;
  border: 1px solid var(--gora-line);
  border-radius: 14px;
  background: var(--gora-surface);
  box-shadow: var(--gora-shadow);
}

/* Embedded sections bring their own top margin; the card spacing replaces it. */
.discover__card--component > :deep(*) {
  margin-top: 0;
}

.discover__section {
  margin: 0;
}

.discover__posts {
  margin-top: 6px;
}

.discover__posts > :deep(.section-header) {
  padding: 0 2px;
}

.discover__intro {
  margin: 0;
  padding: 0 2px;
  color: var(--gora-muted);
  font-size: 0.82rem;
}

.discover__feed,
.discover__stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.discover__empty {
  margin: 0;
  padding: 18px;
  border: 1px dashed var(--gora-line-strong);
  border-radius: var(--gora-radius-card);
  color: var(--gora-muted);
  font-size: 0.85rem;
  text-align: center;
}

.discover__card .discover__empty {
  border: 0;
  padding: 6px 0;
  text-align: left;
}

.discover__accent {
  color: var(--ion-color-primary);
  font-size: 0.75rem;
  font-weight: 650;
}

.discover__link {
  text-decoration: none;
}

/* Horizontal rails bleed to the card edges and snap item by item. */
.discover__rail {
  display: flex;
  gap: 12px;
  margin: 0 -16px;
  padding: 2px 16px 6px;
  overflow-x: auto;
  list-style: none;
  scroll-padding-inline: 16px;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
}

.discover__rail::-webkit-scrollbar {
  display: none;
}

.discover__rail > * {
  scroll-snap-align: start;
}

.discover__profile-link {
  display: contents;
  color: inherit;
  text-decoration: none;
}

.discover__player {
  display: flex;
  width: 116px;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 16px 8px 14px;
  border: 1px solid var(--gora-line);
  border-radius: 12px;
  background: var(--gora-surface-raised);
  text-align: center;
  transition: border-color var(--gora-motion), transform var(--gora-motion);
}

.discover__player:hover {
  border-color: var(--gora-accent-line);
  transform: translateY(-2px);
}

.discover__player strong {
  max-width: 100%;
  margin-top: 8px;
  overflow: hidden;
  font-size: 0.82rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.discover__player span {
  color: var(--gora-muted);
  font-size: 0.72rem;
}

.discover__player .discover__accent {
  color: var(--ion-color-primary);
}

.discover__grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (min-width: 640px) {
  .discover__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.discover__game {
  width: 280px;
  flex-shrink: 0;
}

.discover__reel {
  width: 128px;
  flex-shrink: 0;
}

.discover__club-rail {
  margin-top: 0;
}

.discover__club-chip {
  display: flex;
  width: 88px;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--ion-text-color);
  font-size: 0.72rem;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
}

.discover__club-chip span {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.discover__club-list,
.discover__featured-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.discover__featured-list {
  gap: 10px;
}

.discover__featured {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  overflow: hidden;
  border-radius: 12px;
  color: #fff;
}

.discover__featured::before {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.35), transparent);
  content: '';
  pointer-events: none;
}

.discover__featured > * {
  position: relative;
}

.discover__featured-text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.discover__featured-text strong {
  font-size: 1rem;
}

.discover__featured-text span {
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.75rem;
}

.discover__featured-star {
  position: absolute;
  top: 12px;
  right: 12px;
  color: #ffd27a;
  font-size: 18px;
}
</style>
