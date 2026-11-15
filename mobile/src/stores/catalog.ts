import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import {
  fetchActivities,
  fetchFriends,
  fetchLocations,
  fetchPlayers,
} from '@/services/catalog.service';
import type { FeedActivity } from '@/types/feed';
import type { PlayerSummary } from '@/types/player';
import type { SportCategory, SportsLocation } from '@/types/sport';
import { useSportsStore } from './sports';
import { useAuthStore } from './auth';
import { captureSession, createAuthorizedCall } from './authorized';

export const useCatalogStore = defineStore('catalog', () => {
  const players = ref<PlayerSummary[]>([]);
  const sports = ref<SportCategory[]>([]);
  const locations = ref<SportsLocation[]>([]);
  const activities = ref<FeedActivity[]>([]);
  const friends = ref<PlayerSummary[]>([]);
  const isLoaded = ref(false);
  const sportsApi = useSportsStore();
  const auth = useAuthStore();
  const authorized = createAuthorizedCall(auth);
  watch([() => auth.sessionVersion, () => auth.accessToken], () => {
    players.value = []; sports.value = []; locations.value = [];
    activities.value = []; friends.value = []; isLoaded.value = false;
  });

  function syncSports(): void {
    sports.value = sportsApi.activeSports.map((sport) => {
      const activePlayers = sport.activePlayers ?? 0;
      const openGames = sport.openGames ?? 0;
      return {
        id: sport.id,
        name: sport.name,
        activePlayers,
        openGames,
        trendingScore: activePlayers + openGames,
      };
    });
  }

  async function refreshSports(): Promise<{ ok: true } | { ok: false; message: string }> {
    const result = await sportsApi.fetchSports({ force: true });
    if (result.ok) syncSports();
    return result;
  }

  async function load(): Promise<void> {
    if (isLoaded.value) {
      return;
    }

    const isCurrent = captureSession(auth);
    const [loadedPlayers, sportsResult, loadedLocations, loadedActivities, loadedFriends] = await Promise.all([
      auth.accessToken ? authorized(fetchPlayers).catch(() => []) : Promise.resolve([]),
      sportsApi.fetchSports(),
      fetchLocations(),
      fetchActivities(),
      fetchFriends(),
    ]);
    if (!isCurrent()) return;
    players.value = loadedPlayers;
    locations.value = loadedLocations;
    activities.value = loadedActivities;
    friends.value = loadedFriends;
    if (sportsResult.ok) syncSports();
    isLoaded.value = sportsResult.ok;
  }

  async function refresh(): Promise<void> { isLoaded.value = false; await load(); }
  return { players, sports, locations, activities, friends, isLoaded, load, refreshSports, refresh };
});
