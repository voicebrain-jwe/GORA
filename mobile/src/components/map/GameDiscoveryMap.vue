<template>
  <section class="discovery-map" aria-label="GORA games map">
    <div class="discovery-map__frame" :class="{ 'discovery-map__frame--country': fitMarkers }">
      <component
        :is="canvas"
        v-if="mapCenter && !loading"
        :center="mapCenter"
        :radius-km="visibleRadiusKm"
        :show-radius="radiusKm !== null"
        :fit-markers="fitMarkers"
        :markers="markers"
        :selected-key="selectedPlace?.key ?? null"
        :user-location="userLocation"
        @select="selectPlace"
      />
      <div v-if="selectedGame && !loading" class="discovery-map__map-preview" aria-live="polite">
        <div class="discovery-map__map-preview-copy">
          <strong>{{ selectedGame.title }}</strong>
          <span>{{ selectedGame.sport.name }} · {{ formatClockTime(selectedGame.startTime) }}</span>
        </div>
        <div v-if="selectedPlace && selectedPlace.games.length > 1" class="discovery-map__map-preview-games">
          <button
            v-for="game in selectedPlace.games"
            :key="game.id"
            type="button"
            :class="{ 'discovery-map__map-preview-game--active': game.id === selectedGame.id }"
            :aria-label="`Show ${game.title}`"
            :aria-pressed="game.id === selectedGame.id"
            @click="emit('select', game.id)"
          >
            {{ getSportMarker(game.sport.name) }} {{ formatClockTime(game.startTime) }}
          </button>
        </div>
        <RouterLink
          :to="{ name: 'game-details', params: { gameId: selectedGame.id } }"
          class="discovery-map__map-preview-action"
        >
          View this game
        </RouterLink>
      </div>
      <div v-else-if="loading" class="discovery-map__loading" aria-busy="true" aria-label="Loading games">
        <ion-skeleton-text :animated="true" class="discovery-map__skeleton" />
      </div>
      <p v-else-if="!mapCenter" class="discovery-map__blank">No game on this list has a map position yet.</p>
      <div v-if="!loading && mapCenter" class="discovery-map__summary" aria-label="Games on this map">
        <strong>{{ fitMarkers ? 'GORA Games · Philippines' : 'Games on map' }}</strong>
        <span class="discovery-map__summary-counts">
          <span class="discovery-map__count">
            {{ mappedGameCount }} {{ mappedGameCount === 1 ? 'game' : 'games' }}
          </span>
          <span v-if="activeGameCount > 0" class="discovery-map__count discovery-map__count--active">
            <i class="discovery-map__legend-dot discovery-map__legend-dot--active" aria-hidden="true" />
            {{ activeGameCount }} live now
          </span>
          <span class="discovery-map__count discovery-map__count--upcoming">
            <i class="discovery-map__legend-dot discovery-map__legend-dot--upcoming" aria-hidden="true" />
            {{ upcomingGameCount }} upcoming
          </span>
        </span>
      </div>
    </div>

    <p v-if="error" class="discovery-map__error" role="alert">{{ error }}</p>
    <p v-if="provider.notice" class="discovery-map__notice">{{ provider.notice }}</p>
    <p v-if="!loading && unlocatedCount > 0" class="discovery-map__notice">
      {{ unlocatedCount === 1 ? '1 game has' : `${unlocatedCount} games have` }} no map position. See the List.
    </p>

    <div v-if="selectedPlace && selectedGame" class="discovery-map__preview">
      <div v-if="selectedPlace.games.length > 1" class="discovery-map__place-games" role="tablist">
        <button
          v-for="game in selectedPlace.games"
          :key="game.id"
          type="button"
          role="tab"
          class="discovery-map__place-game"
          :class="{ 'discovery-map__place-game--active': game.id === selectedGame.id }"
          :aria-selected="game.id === selectedGame.id"
          @click="emit('select', game.id)"
        >
          {{ getSportMarker(game.sport.name) }} {{ formatClockTime(game.startTime) }}
        </button>
      </div>
      <DiscoveredGameCard
        :game="selectedGame"
        :join-action="joinActionOf(selectedGame)"
        :busy="busyGameId === selectedGame.id"
        :badge="selectedBadge"
        highlighted
        @join="emit('join', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { type Component, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { IonSkeletonText } from '@ionic/vue';
import { type MapMarker, type MapProviderId, resolveMapProvider } from '@/services/map-provider';
import type { DiscoveredGame } from '@/types/discovery';
import { discoveryJoinAction, mapRadiusKm } from '@/utils/discovery-display';
import { formatClockTime } from '@/utils/game-form';
import type { JoinRequestAction } from '@/utils/join-requests';
import { type MapPoint, gamePoint, groupGamesByPlace, placeMarkers } from '@/utils/location-map';
import { getSportMarker } from '@/utils/sports';
import DiscoveredGameCard from './DiscoveredGameCard.vue';
import GoogleMapCanvas from './GoogleMapCanvas.vue';
import OsmMapCanvas from './OsmMapCanvas.vue';
import PlaceholderMapCanvas from './PlaceholderMapCanvas.vue';

/** Provider adapters share one map and marker contract. */
const CANVASES: Partial<Record<MapProviderId, Component>> = {
  placeholder: PlaceholderMapCanvas,
  google: GoogleMapCanvas,
  osm: OsmMapCanvas,
};

const props = withDefaults(
  defineProps<{
    games: DiscoveredGame[];
    /** The search center (the user's location or a place); null = fit the games. */
    center: MapPoint | null;
    /** The distance filter, or null for any distance. */
    radiusKm: number | null;
    selectedGameId: string | null;
    loading?: boolean;
    error?: string | null;
    userLocation?: MapPoint | null;
    busyGameId?: string | null;
    /** A badge for one game ("Selected game" on the location view). */
    badgeGameId?: string | null;
    badgeText?: string | null;
    /** Show the all-country map label and fit every marker into view. */
    fitMarkers?: boolean;
    joinActionOf?: (game: DiscoveredGame) => JoinRequestAction;
  }>(),
  {
    loading: false,
    error: null,
    userLocation: null,
    busyGameId: null,
    badgeGameId: null,
    badgeText: null,
    fitMarkers: false,
    joinActionOf: (game: DiscoveredGame) => discoveryJoinAction(game, undefined),
  },
);

const emit = defineEmits<{ select: [gameId: string | null]; join: [gameId: string] }>();

const provider = resolveMapProvider();
const canvas = CANVASES[provider.id] ?? PlaceholderMapCanvas;

const places = computed(() => groupGamesByPlace(props.games));
const unlocatedCount = computed(() => props.games.filter((game) => gamePoint(game) === null).length);
/** Only games with a map position are counted, so the numbers match the pins. */
const mappedGames = computed(() => props.games.filter((game) => gamePoint(game) !== null));
const mappedGameCount = computed(() => mappedGames.value.length);
/** In progress right now. */
const activeGameCount = computed(() => mappedGames.value.filter((game) => game.status === 'ACTIVE').length);
/** Open or full games that have not started yet. */
const upcomingGameCount = computed(
  () => mappedGames.value.filter((game) => game.status === 'OPEN' || game.status === 'FULL').length,
);
const mapCenter = computed<MapPoint | null>(() => {
  if (props.center) {
    return props.center;
  }

  const first = places.value[0];
  return first ? { latitude: first.latitude, longitude: first.longitude } : props.fitMarkers ? { latitude: 12.8797, longitude: 121.774 } : null;
});
const visibleRadiusKm = computed(() =>
  mapCenter.value ? mapRadiusKm(props.games, mapCenter.value, props.radiusKm) : 1,
);
const markers = computed<MapMarker[]>(() =>
  places.value.map((place) => ({
    key: place.key,
    label: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    symbols: place.games.some((game) => game.id === props.selectedGameId)
      ? [getSportMarker(place.games.find((game) => game.id === props.selectedGameId)!.sport.name)]
      : placeMarkers(place),
    gameCount: place.games.length,
    activeCount: place.games.filter((game) => game.status === 'ACTIVE').length,
    upcomingCount: place.games.filter((game) => game.status === 'OPEN' || game.status === 'FULL').length,
  })),
);
const selectedPlace = computed(
  () => places.value.find((place) => place.games.some((game) => game.id === props.selectedGameId)) ?? null,
);
const selectedGame = computed(
  () => selectedPlace.value?.games.find((game) => game.id === props.selectedGameId) ?? null,
);
const selectedBadge = computed(() =>
  selectedGame.value && selectedGame.value.id === props.badgeGameId ? props.badgeText : null,
);

function selectPlace(key: string): void {
  const place = places.value.find((candidate) => candidate.key === key);
  emit('select', place?.games[0]?.id ?? null);
}
</script>

<style scoped>
.discovery-map {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.discovery-map__frame {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--gora-line);
  border-radius: 18px;
  aspect-ratio: 4 / 3;
  background: #0b1824;
}

.discovery-map__frame--country { aspect-ratio: 3 / 4; }

@media (min-width: 900px) {
  .discovery-map__frame--country { aspect-ratio: 4 / 3; }
}

.discovery-map__map-preview {
  position: absolute;
  z-index: 900;
  right: 12px;
  bottom: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 560px;
  margin-inline: auto;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  background: rgba(20, 22, 25, 0.96);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.38);
  color: #fff;
}

.discovery-map__map-preview-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.discovery-map__map-preview-copy strong,
.discovery-map__map-preview-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.discovery-map__map-preview-copy strong { font-size: 0.83rem; }
.discovery-map__map-preview-copy span { color: rgba(255, 255, 255, 0.72); font-size: 0.72rem; }

.discovery-map__map-preview-action {
  flex: none;
  padding: 9px 12px;
  border-radius: 999px;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font-size: 0.76rem;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}

.discovery-map__map-preview-games {
  display: flex;
  max-width: 38%;
  gap: 4px;
  overflow-x: auto;
}

.discovery-map__map-preview-games button {
  flex: none;
  padding: 5px 7px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  background: transparent;
  color: #fff;
  font-size: 0.67rem;
}

.discovery-map__map-preview-games button.discovery-map__map-preview-game--active {
  border-color: var(--ion-color-primary);
  color: var(--ion-color-primary);
}

@media (max-width: 480px) {
  .discovery-map__map-preview { gap: 7px; padding: 9px; }
  .discovery-map__map-preview-games { max-width: 28%; }
  .discovery-map__map-preview-action { padding: 8px 9px; font-size: 0.7rem; }
}

/* Top-right summary card. The map's zoom buttons stay alone on the left. */
.discovery-map__summary {
  position: absolute;
  z-index: 800;
  top: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  max-width: calc(100% - 72px);
  padding: 10px 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
  color: #1d242b;
  font-size: 0.74rem;
}

.discovery-map__summary strong {
  font-size: 0.8rem;
  font-weight: 800;
}

.discovery-map__summary-counts {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.discovery-map__count {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  background: #eef1f4;
  font-weight: 700;
  white-space: nowrap;
}

.discovery-map__count--active { background: #dcfce7; color: #166534; }
.discovery-map__count--upcoming { background: #ffedd5; color: #9a3412; }

.discovery-map__legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.discovery-map__legend-dot--active { background: #22c55e; }
.discovery-map__legend-dot--upcoming { background: #f47820; }

.discovery-map__loading {
  position: absolute;
  inset: 0;
}

.discovery-map__skeleton {
  width: 100%;
  height: 100%;
  margin: 0;
}

.discovery-map__blank {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 16px;
  color: var(--gora-muted);
  font-size: 0.84rem;
  text-align: center;
}

.discovery-map__error {
  margin: 0;
  color: #ef5b5b;
  font-size: 0.82rem;
}

.discovery-map__notice {
  margin: 0;
  color: var(--gora-muted);
  font-size: 0.72rem;
}

.discovery-map__preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.discovery-map__place-games {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.discovery-map__place-game {
  padding: 6px 10px;
  border: 1px solid var(--gora-line);
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
}

.discovery-map__place-game--active {
  border-color: var(--ion-color-primary);
  color: var(--ion-color-primary);
}
</style>
