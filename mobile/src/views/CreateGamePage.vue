<template>
  <ion-page class="create-game-page">
    <SubPageHeader :title="pageTitle" :back-href="editId ? `/games/${editId}` : '/create'" />

    <ion-content ref="contentRef" class="create-game__content" :scroll-y="true">
      <section v-if="created" class="game-created" aria-live="polite">
        <p class="game-created__badge">GAME CREATED!</p>
        <p class="game-created__note">
          {{
            created.autoAccept
              ? 'Players can join automatically while slots are available.'
              : 'Players can request to join. You decide who to accept.'
          }}
        </p>
        <GamePreviewCard :game="created" />
        <router-link to="/profile/games?section=hosted" class="game-created__link">View in My Games</router-link>
        <router-link to="/profile" class="game-created__link">View my profile feed</router-link>
        <router-link to="/home" class="game-created__link">View Home feed</router-link>
        <button type="button" class="game-created__again" @click="startOver">Create another game</button>
      </section>

      <p v-else-if="editId && editBlocker" class="create-game__blocked" role="alert">{{ editBlocker }}</p>

      <form id="create-game-form" ref="formRef" v-else class="create-game" novalidate @submit.prevent="advance">
        <header class="create-game__step-header">
          <p class="create-game__step-count">Step {{ activeStep + 1 }} of {{ GAME_STEPS.length }}</p>
          <div
            class="create-game__progress"
            role="progressbar"
            aria-label="Game setup progress"
            aria-valuemin="1"
            :aria-valuemax="GAME_STEPS.length"
            :aria-valuenow="activeStep + 1"
          >
            <span :style="{ width: `${((activeStep + 1) / GAME_STEPS.length) * 100}%` }" />
          </div>
          <h2 ref="stepHeading" class="create-game__step-title" tabindex="-1">{{ currentStep.title }}</h2>
          <p class="create-game__step-hint">{{ currentStep.hint }}</p>
        </header>
        <p v-if="sportsError" class="create-game__alert" role="alert">{{ sportsError }}</p>
        <section v-if="activeStep === 0" class="create-game__step" :aria-label="currentStep.title">
          <div class="create-game__field" @focusout="touch('sportId')">
            <label class="create-game__label" for="game-sport">Sport *</label>
            <select id="game-sport" v-model="form.sportId" class="create-game__input">
              <option value="" disabled>{{ sportOptions.length ? 'Choose a sport' : 'Loading sports…' }}</option>
              <option v-for="option in sportOptions" :key="option.id" :value="option.id">{{ option.name }}</option>
            </select>
            <p v-if="shown('sportId')" class="create-game__error">{{ errors.sportId }}</p>
          </div>

          <div class="create-game__field" @focusout="touch('title')">
            <label class="create-game__label" for="game-title">
              Title *
              <span class="create-game__counter">{{ form.title.trim().length }} / {{ GAME_TITLE_MAX }}</span>
            </label>
            <input
              id="game-title"
              v-model="form.title"
              class="create-game__input"
              :maxlength="GAME_TITLE_MAX"
              placeholder="Sunday Pickup Basketball"
              autocomplete="off"
            />
            <p v-if="shown('title')" class="create-game__error">{{ errors.title }}</p>
          </div>

          <div class="create-game__field" @focusout="touch('description')">
            <label class="create-game__label" for="game-description">
              Caption
              <span class="create-game__counter"
                >{{ form.description.trim().length }} / {{ GAME_DESCRIPTION_MAX }}</span
              >
            </label>
            <textarea
              id="game-description"
              v-model="form.description"
              class="create-game__input"
              rows="3"
              :maxlength="GAME_DESCRIPTION_MAX"
              placeholder="Friendly 5v5, all levels. Bring a white and a dark shirt."
            />
            <p v-if="shown('description')" class="create-game__error">{{ errors.description }}</p>
          </div>
        </section>

        <section v-if="activeStep === 1" class="create-game__step" :aria-label="currentStep.title">
          <div class="create-game__field" @focusout="touch('requiredPlayers')">
            <label class="create-game__label" for="game-players">Required players *</label>
            <input
              id="game-players"
              v-model="form.requiredPlayers"
              type="number"
              inputmode="numeric"
              min="1"
              :max="GAME_PLAYERS_MAX"
              step="1"
              class="create-game__input create-game__input--narrow"
              placeholder="12"
            />
            <p v-if="shown('requiredPlayers')" class="create-game__error">{{ errors.requiredPlayers }}</p>
            <p v-else class="create-game__hint">
              Everyone who plays, including you if you play. You are not added automatically.
            </p>
          </div>

          <div class="create-game__field">
            <label class="create-game__label" for="game-acceptance">Player approval</label>
            <select id="game-acceptance" v-model="form.autoAccept" class="create-game__input">
              <option :value="false">Manual Accept</option>
              <option :value="true">Auto Accept</option>
            </select>
            <p class="create-game__hint">
              {{
                form.autoAccept
                  ? 'New requests are accepted automatically while slots are available.'
                  : 'Review each join request and accept or decline it yourself.'
              }}
              <span v-if="editId">Existing pending requests still need your review.</span>
            </p>
          </div>

          <div class="create-game__field">
            <label class="create-game__label" for="game-club">Club</label>
            <select id="game-club" v-model="form.clubId" class="create-game__input">
              <option value="">No club</option>
              <option v-for="club in clubOptions" :key="club.id" :value="club.id">{{ club.name }}</option>
            </select>
            <p class="create-game__hint">Clubs you are an active member of. You stay the host.</p>
          </div>
        </section>

        <section v-if="activeStep === 2" class="create-game__step" :aria-label="currentStep.title">
          <div class="create-game__field" @focusout="touch('gameDate')">
            <label class="create-game__label" for="game-date">Date *</label>
            <GameDateField id="game-date" v-model="form.gameDate" :min="today" :max="latestGameDate" />
            <p v-if="shown('gameDate')" class="create-game__error">{{ errors.gameDate }}</p>
          </div>

          <div class="create-game__grid">
            <div class="create-game__field" @focusout="touch('startTime')">
              <label class="create-game__label" for="game-start">Start *</label>
              <GameDateField id="game-start" v-model="form.startTime" presentation="time" label="Choose start time" />
              <p v-if="shown('startTime')" class="create-game__error">{{ errors.startTime }}</p>
            </div>
            <div class="create-game__field" @focusout="touch('endTime')">
              <label class="create-game__label" for="game-end">End *</label>
              <GameDateField id="game-end" v-model="form.endTime" presentation="time" label="Choose end time" />
              <p v-if="shown('endTime')" class="create-game__error">{{ errors.endTime }}</p>
            </div>
          </div>
          <p class="create-game__hint">Local time at the venue.</p>
          <div class="create-game__field" @focusout="touch('registrationClosesAt')">
            <label class="create-game__label" for="game-registration-close">Registration closes (optional)</label>
            <GameDateField
              id="game-registration-close"
              v-model="form.registrationClosesAt"
              presentation="date-time"
              label="Choose registration deadline"
              allow-clear
              :min="today"
              :max="form.gameDate && form.startTime ? `${form.gameDate}T${form.startTime}` : undefined"
            />
            <p v-if="shown('registrationClosesAt')" class="create-game__error">{{ errors.registrationClosesAt }}</p>
            <p v-else class="create-game__hint">Leave blank to accept join requests until the game starts.</p>
          </div>
        </section>

        <section v-if="activeStep === 3" class="create-game__step" :aria-label="currentStep.title">
          <div class="create-game__field create-game__place" @focusout="onPlaceBlur">
            <label class="create-game__label" for="game-location">Location *</label>
            <div class="create-game__place-box">
              <ion-icon :icon="searchOutline" class="create-game__place-icon" aria-hidden="true" />
              <input
                id="game-location"
                v-model="form.locationName"
                class="create-game__input create-game__place-input"
                :maxlength="GAME_LOCATION_MAX"
                placeholder="Search a court, park, or address"
                autocomplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-controls="game-location-results"
                :aria-expanded="showPlaceResults"
                :aria-activedescendant="activePlace >= 0 ? `game-place-${activePlace}` : undefined"
                @input="onPlaceInput"
                @focus="placeFocused = true"
                @keydown.down.prevent="movePlace(1)"
                @keydown.up.prevent="movePlace(-1)"
                @keydown.enter="pickActivePlace"
                @keydown.esc="placeFocused = false"
              />
              <ion-spinner v-if="placeLoading" name="crescent" class="create-game__place-spinner" />
            </div>
            <ul v-if="showPlaceResults" id="game-location-results" class="create-game__places" role="listbox">
              <li
                v-for="(place, index) in placeResults"
                :id="`game-place-${index}`"
                :key="place.id"
                role="option"
                :aria-selected="index === activePlace"
                class="create-game__place-option"
                :class="{ 'is-active': index === activePlace }"
                @mousedown.prevent="pickPlace(place)"
              >
                <ion-icon :icon="locationOutline" aria-hidden="true" />
                <span>
                  <strong>{{ place.name }}</strong>
                  <small v-if="place.detail">{{ place.detail }}</small>
                </span>
              </li>
              <li v-if="placeError" class="create-game__place-note" role="alert">{{ placeError }}</li>
              <li v-else-if="placeLoading && placeResults.length === 0" class="create-game__place-note">Searching…</li>
              <li v-else-if="placeResults.length === 0" class="create-game__place-note">
                No places found. Try another name, or tap the map below.
              </li>
            </ul>
            <p v-if="shown('locationName')" class="create-game__error">{{ errors.locationName }}</p>
          </div>

          <button
            type="button"
            class="create-game__locate"
            :disabled="isLocating"
            @click="useMyLocation"
          >
            <ion-spinner v-if="isLocating" name="crescent" />
            <ion-icon v-else :icon="navigateOutline" aria-hidden="true" />
            {{ isLocating ? 'Finding your location…' : 'Use my current location' }}
          </button>
          <p v-if="locateError" class="create-game__error" role="alert">{{ locateError }}</p>

          <LocationMapPicker
            class="create-game__map"
            :center="mapCenter"
            :point="selectedGamePoint"
            fly
            @select="onMapPoint"
          />

          <div class="create-game__grid">
            <div class="create-game__field" @focusout="touch('latitude')">
              <label class="create-game__label" for="game-lat">Latitude</label>
              <input
                id="game-lat"
                v-model="form.latitude"
                class="create-game__input"
                inputmode="decimal"
                placeholder="14.5509"
              />
              <p v-if="shown('latitude')" class="create-game__error">{{ errors.latitude }}</p>
            </div>
            <div class="create-game__field" @focusout="touch('longitude')">
              <label class="create-game__label" for="game-lng">Longitude</label>
              <input
                id="game-lng"
                v-model="form.longitude"
                class="create-game__input"
                inputmode="decimal"
                placeholder="121.0503"
              />
              <p v-if="shown('longitude')" class="create-game__error">{{ errors.longitude }}</p>
            </div>
          </div>
          <p class="create-game__hint">Search a place and pick a result: the pin jumps there. Tap the map or drag the pin to fine-tune.</p>
        </section>

        <section v-if="isReview" class="create-game__step create-game__review" aria-label="Game review">
          <article class="create-game__review-card">
            <div class="create-game__review-heading">
              <h3>Game details</h3>
              <button type="button" aria-label="Edit game details" @click="goToStep(0)">Edit</button>
            </div>
            <strong>{{ form.title.trim() }}</strong>
            <p>{{ selectedSportName }}</p>
            <p v-if="form.description.trim()" class="create-game__review-description">
              <strong>Caption:</strong> {{ form.description.trim() }}
            </p>
          </article>
          <article class="create-game__review-card">
            <div class="create-game__review-heading">
              <h3>Players &amp; approval</h3>
              <button type="button" aria-label="Edit players and approval" @click="goToStep(1)">Edit</button>
            </div>
            <p>{{ form.requiredPlayers }} players</p>
            <p>{{ form.autoAccept ? 'Auto Accept' : 'Manual Accept' }}</p>
            <p v-if="form.clubId">{{ selectedClubName }}</p>
          </article>
          <article class="create-game__review-card">
            <div class="create-game__review-heading">
              <h3>Schedule</h3>
              <button type="button" aria-label="Edit schedule" @click="goToStep(2)">Edit</button>
            </div>
            <p>{{ formatGameDay(form.gameDate) }}</p>
            <p>{{ formatGameTimeRange(form.startTime, form.endTime) }} &middot; Local time at the venue</p>
            <p>Registration closes: {{ form.registrationClosesAt ? formatRegistrationDeadline(form.registrationClosesAt) : 'When the game starts' }}</p>
          </article>
          <article class="create-game__review-card">
            <div class="create-game__review-heading">
              <h3>Location</h3>
              <button type="button" aria-label="Edit location" @click="goToStep(3)">Edit</button>
            </div>
            <p>{{ form.locationName.trim() }}</p>
            <p v-if="String(form.latitude).trim() && String(form.longitude).trim()">
              {{ form.latitude }}, {{ form.longitude }}
            </p>
          </article>
        </section>
        <p v-if="stepMessage" class="create-game__alert" role="alert">{{ stepMessage }}</p>
        <p v-if="serverError" class="create-game__alert" role="alert">{{ serverError }}</p>
      </form>
    </ion-content>
    <ion-footer v-if="!created && !(editId && editBlocker)" class="ion-no-border">
      <div class="create-game__actions">
        <button
          v-if="activeStep > 0"
          type="button"
          class="create-game__back"
          :disabled="gamesStore.isSaving"
          @click="goToStep(activeStep - 1)"
        >
          Back
        </button>
        <button
          v-if="!isReview"
          type="submit"
          form="create-game-form"
          class="create-game__submit"
          :disabled="gamesStore.isSaving"
        >
          Next
        </button>
        <button
          v-else
          type="submit"
          form="create-game-form"
          class="create-game__submit"
          :disabled="gamesStore.isSaving"
        >
          {{ submitLabel }}
        </button>
      </div>
    </ion-footer>
    <LocationPickerModal
      purpose="game"
      :is-open="locationPickerOpen"
      :current="selectedGameLocation"
      @close="locationPickerOpen = false"
      @confirm="applyGameLocation"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonContent, IonFooter, IonIcon, IonPage, IonSpinner, onIonViewDidLeave, onIonViewWillEnter } from '@ionic/vue';
import { locationOutline, navigateOutline, searchOutline } from 'ionicons/icons';
import GameDateField from '@/components/games/GameDateField.vue';
import GamePreviewCard from '@/components/games/GamePreviewCard.vue';
import LocationPickerModal from '@/components/feed/LocationPickerModal.vue';
import LocationMapPicker from '@/components/map/LocationMapPicker.vue';
import { PHOTON_MIN_QUERY, reversePhoton, searchPhoton, type PhotonPlace } from '@/services/photon.service';
import { getCurrentLocation } from '@/services/location.service';
import { LOCATION_PICKER_CENTER, describeLocationPickerFailure } from '@/utils/location-picker';
import SubPageHeader from '@/components/layout/SubPageHeader.vue';
import { useClubsStore } from '@/stores/clubs';
import { useGamesStore } from '@/stores/games';
import { useSportsStore } from '@/stores/sports';
import type { ApiGame } from '@/types/game';
import type { PostLocation } from '@/types/post';
import { isServerClubId } from '@/utils/club-chat';
import { isValidPoint } from '@/utils/location-map';
import {
  GAME_DESCRIPTION_MAX,
  GAME_LOCATION_MAX,
  GAME_PLAYERS_MAX,
  GAME_TITLE_MAX,
  GAME_MAX_DAYS_AHEAD,
  addDays,
  type GameForm,
  type GameFormField,
  deviceMoment,
  diffGameInput,
  emptyGameForm,
  formatGameDay,
  formatRegistrationDeadline,
  formatGameTimeRange,
  gameToForm,
  toCreateGameInput,
  validateGameForm,
} from '@/utils/game-form';

// Ionic keeps pages alive, so the id is read once for this page instance. No id: Create Game.
const editId = String(useRoute().params.gameId ?? '');

const router = useRouter();
const gamesStore = useGamesStore();
const sportsStore = useSportsStore();
const clubsStore = useClubsStore();

const form = ref<GameForm>(emptyGameForm());
const touched = ref<Set<GameFormField>>(new Set());
const submitted = ref(false);
const serverError = ref<string | null>(null);
const sportsError = ref<string | null>(null);
const created = ref<ApiGame | null>(null);
const validationMoment = ref(deviceMoment());
const today = computed(() => validationMoment.value.date);
const latestGameDate = computed(() => addDays(today.value, GAME_MAX_DAYS_AHEAD));
const activeStep = ref(0);
const stepMessage = ref<string | null>(null);
const formRef = ref<HTMLFormElement | null>(null);
const stepHeading = ref<HTMLElement | null>(null);
const contentRef = ref<InstanceType<typeof IonContent> | null>(null);
const locationPickerOpen = ref(false);

const GAME_STEPS: readonly { title: string; hint: string; fields: readonly GameFormField[] }[] = [
  {
    title: 'Game Details',
    hint: 'Choose your sport and give your game a name.',
    fields: ['sportId', 'title', 'description'],
  },
  {
    title: 'Players & Approval',
    hint: 'Set the player count and choose how players join.',
    fields: ['requiredPlayers', 'autoAccept', 'clubId'],
  },
  {
    title: 'Schedule',
    hint: 'Choose the game date and local start and end times.',
    fields: ['gameDate', 'startTime', 'endTime', 'registrationClosesAt'],
  },
  {
    title: 'Location',
    hint: 'Tell players where the game will happen.',
    fields: ['locationName', 'latitude', 'longitude'],
  },
  { title: 'Review', hint: 'Check your game before confirming. You can edit any section.', fields: [] },
];
const currentStep = computed(() => GAME_STEPS[activeStep.value]);
const isReview = computed(() => activeStep.value === GAME_STEPS.length - 1);

const original = computed(() => (editId ? gamesStore.gameById(editId) : null));
const errors = computed(() => validateGameForm(form.value, validationMoment.value, original.value));
const hasErrors = computed(() => Object.keys(errors.value).length > 0);
const pageTitle = computed(() => {
  if (created.value) return 'Game Created';
  return editId ? 'Edit Game' : 'Create Game';
});
const submitLabel = computed(() => {
  if (gamesStore.isSaving) return editId ? 'Saving…' : 'Creating…';
  return editId ? 'Save Changes' : 'Create Game';
});

/** A retired sport stays selectable on the game that already uses it. */
const sportOptions = computed(() => {
  const active = sportsStore.activeSports.map((sport) => ({ id: sport.id, name: sport.name }));
  const current = original.value?.sport;
  return current && !active.some((sport) => sport.id === current.id) ? [...active, current] : active;
});

/** Server clubs where the signed-in account is an ACTIVE member (the server checks again). */
const clubOptions = computed(() => {
  const mine = clubsStore.clubs
    .filter((club) => isServerClubId(club.id) && club.viewerMembership?.status === 'ACTIVE')
    .map((club) => ({ id: club.id, name: club.name }));
  const current = original.value?.club;
  return current && !mine.some((club) => club.id === current.id) ? [...mine, current] : mine;
});
const selectedSportName = computed(
  () => sportOptions.value.find((sport) => sport.id === form.value.sportId)?.name ?? '',
);
const selectedClubName = computed(() => clubOptions.value.find((club) => club.id === form.value.clubId)?.name ?? '');
const selectedGameLocation = computed<PostLocation | null>(() => {
  const latitude = Number(String(form.value.latitude).trim());
  const longitude = Number(String(form.value.longitude).trim());
  const point = { latitude, longitude };
  const name = form.value.locationName.trim();
  return name && isValidPoint(point) ? { name, ...point } : null;
});

const editBlocker = computed(() => {
  const status = editId ? gamesStore.detailStatus[editId] : undefined;

  if (status === 'error') return gamesStore.detailError[editId] ?? 'This game is not available.';
  if (!original.value) return status === 'loading' || status === undefined ? 'Loading game…' : null;
  if (!original.value.isHost) return 'Only the host can edit this game.';
  if (!original.value.canEdit) return 'This game can no longer be edited.';
  return null;
});

function touch(field: GameFormField): void {
  touched.value = new Set(touched.value).add(field);
}

/* ───────── Location search (Photon) ───────── */
const placeResults = ref<PhotonPlace[]>([]);
const placeLoading = ref(false);
const placeError = ref<string | null>(null);
const placeFocused = ref(false);
const placeSearched = ref(false);
const activePlace = ref(-1);
let placeTimer: ReturnType<typeof setTimeout> | undefined;
let placeAbort: AbortController | null = null;

const showPlaceResults = computed(
  () =>
    placeFocused.value &&
    form.value.locationName.trim().length >= PHOTON_MIN_QUERY &&
    (placeLoading.value || placeSearched.value || !!placeError.value),
);
/** The pin follows the coordinates, even before the place has a name. */
const selectedGamePoint = computed(() => {
  const point = { latitude: Number(String(form.value.latitude).trim()), longitude: Number(String(form.value.longitude).trim()) };
  return String(form.value.latitude).trim() && String(form.value.longitude).trim() && isValidPoint(point) ? point : null;
});
/** The map opens on the chosen pin, else Metro Manila. */
const mapCenter = computed(() => selectedGamePoint.value ?? LOCATION_PICKER_CENTER);

function onPlaceInput(): void {
  placeFocused.value = true;
  activePlace.value = -1;
  placeSearched.value = false;
  placeError.value = null;
  if (placeTimer) clearTimeout(placeTimer);
  const query = form.value.locationName.trim();
  if (query.length < PHOTON_MIN_QUERY) {
    placeAbort?.abort();
    placeResults.value = [];
    placeLoading.value = false;
    return;
  }
  placeLoading.value = true;
  placeTimer = setTimeout(() => void runPlaceSearch(query), 320);
}

async function runPlaceSearch(query: string): Promise<void> {
  placeAbort?.abort();
  const controller = new AbortController();
  placeAbort = controller;
  placeLoading.value = true;
  placeError.value = null;
  try {
    const results = await searchPhoton(query, { near: mapCenter.value, signal: controller.signal });
    if (controller.signal.aborted) return;
    placeResults.value = results;
    placeSearched.value = true;
  } catch {
    if (controller.signal.aborted) return;
    placeResults.value = [];
    placeError.value = 'Place search is unavailable right now. Tap the map to set the location.';
  } finally {
    if (placeAbort === controller) placeLoading.value = false;
  }
}

function movePlace(step: number): void {
  if (!placeResults.value.length) return;
  placeFocused.value = true;
  const count = placeResults.value.length;
  activePlace.value = (activePlace.value + step + count) % count;
}

function pickActivePlace(event: KeyboardEvent): void {
  const place = placeResults.value[activePlace.value];
  if (!showPlaceResults.value || !place) return;
  event.preventDefault();
  pickPlace(place);
}

/** Picking a result names the game location and moves the map pin there. */
function pickPlace(place: PhotonPlace): void {
  const area = place.detail.split(', ')[0];
  const name = area ? `${place.name}, ${area}` : place.name;
  applyGameLocation({ name: name.slice(0, GAME_LOCATION_MAX), latitude: place.latitude, longitude: place.longitude });
  placeFocused.value = false;
  placeResults.value = [];
  placeSearched.value = false;
  activePlace.value = -1;
}

function onPlaceBlur(): void {
  placeFocused.value = false;
  touch('locationName');
}

/* "Use my current location": GPS point, named by Photon when a place is nearby. */
const isLocating = ref(false);
const locateError = ref<string | null>(null);
let locateVersion = 0;

async function useMyLocation(): Promise<void> {
  if (isLocating.value) return;
  const version = ++locateVersion;
  isLocating.value = true;
  locateError.value = null;
  try {
    const result = await getCurrentLocation(undefined, { precise: true });
    if (version !== locateVersion) return;
    if (!result.ok) {
      locateError.value = describeLocationPickerFailure(result.reason);
      return;
    }
    const place = await reversePhoton(result.point).catch(() => null);
    if (version !== locateVersion) return;
    const area = place?.detail.split(', ')[0];
    const name = place ? (area ? `${place.name}, ${area}` : place.name) : 'Current location';
    applyGameLocation({ name: name.slice(0, GAME_LOCATION_MAX), ...result.point });
    placeFocused.value = false;
    placeResults.value = [];
  } catch {
    if (version === locateVersion) locateError.value = describeLocationPickerFailure('UNAVAILABLE');
  } finally {
    if (version === locateVersion) isLocating.value = false;
  }
}

/** Tapping the map or dragging the pin keeps the name and moves the coordinates. */
function onMapPoint(point: { latitude: number; longitude: number }): void {
  form.value.latitude = point.latitude.toFixed(6);
  form.value.longitude = point.longitude.toFixed(6);
  touch('latitude');
  touch('longitude');
}

onBeforeUnmount(() => {
  locateVersion++;
  if (placeTimer) clearTimeout(placeTimer);
  placeAbort?.abort();
});

function applyGameLocation(location: PostLocation): void {
  form.value.locationName = location.name;
  form.value.latitude = location.latitude.toFixed(6);
  form.value.longitude = location.longitude.toFixed(6);
  locationPickerOpen.value = false;
  touch('locationName');
  touch('latitude');
  touch('longitude');
}

function shown(field: GameFormField): boolean {
  return Boolean(errors.value[field]) && (submitted.value || touched.value.has(field));
}

function resetForm(next: GameForm): void {
  form.value = next;
  touched.value = new Set();
  submitted.value = false;
  serverError.value = null;
  activeStep.value = 0;
  stepMessage.value = null;
}

async function goToStep(index: number): Promise<void> {
  if (gamesStore.isSaving || index < 0 || index >= GAME_STEPS.length) return;
  activeStep.value = index;
  stepMessage.value = null;
  await nextTick();
  void contentRef.value?.$el.scrollToTop?.(0);
  stepHeading.value?.focus({ preventScroll: true });
}

async function focusFirstError(): Promise<void> {
  await nextTick();
  formRef.value
    ?.querySelector('.create-game__error')
    ?.closest('.create-game__field')
    ?.querySelector<HTMLElement>('input, select, textarea')
    ?.focus();
}

async function advance(): Promise<void> {
  if (gamesStore.isSaving) return;
  validationMoment.value = deviceMoment();
  serverError.value = null;
  if (isReview.value) {
    await submit();
    return;
  }
  touched.value = new Set([...touched.value, ...currentStep.value.fields]);
  if (currentStep.value.fields.some((field) => errors.value[field])) {
    stepMessage.value = 'Complete the highlighted fields to continue.';
    await focusFirstError();
    return;
  }
  await goToStep(activeStep.value + 1);
}

async function submit(): Promise<void> {
  if (gamesStore.isSaving) return;
  validationMoment.value = deviceMoment();
  submitted.value = true;
  serverError.value = null;

  if (hasErrors.value) {
    const invalidStep = GAME_STEPS.findIndex((step) => step.fields.some((field) => errors.value[field]));
    if (invalidStep >= 0) {
      await goToStep(invalidStep);
      stepMessage.value = 'Check the highlighted fields before confirming your game.';
      await focusFirstError();
    }
    return;
  }

  const input = toCreateGameInput(form.value);

  if (editId && original.value) {
    const result = await gamesStore.updateGame(editId, diffGameInput(original.value, input));

    if (result.ok) {
      void router.replace(`/games/${editId}`);
    } else {
      serverError.value = result.message;
    }
    return;
  }

  const result = await gamesStore.createGame(input);

  if (result.ok) {
    created.value = result.game;
    resetForm(emptyGameForm());
  } else {
    serverError.value = result.message;
  }
}

function startOver(): void {
  created.value = null;
  resetForm(emptyGameForm());
}

async function loadSports(): Promise<void> {
  const result = await sportsStore.fetchSports();
  sportsError.value = result.ok ? null : `Couldn't load sports: ${result.message}`;
}

onIonViewWillEnter(async () => {
  validationMoment.value = deviceMoment();

  if (editId) {
    const result = await gamesStore.fetchGame(editId);
    if (result.ok && original.value) {
      resetForm(gameToForm(original.value));
    }
  }
});

onIonViewDidLeave(() => {
  created.value = null;
});

onMounted(() => {
  void loadSports();
  void clubsStore.load();
});
</script>

<style scoped>
.create-game__content {
  flex: 1 1 0;
  min-height: 0;
}
.create-game__content::part(scroll) {
  overscroll-behavior-y: contain;
  touch-action: pan-y;
}
.create-game-page > ion-footer { flex-shrink: 0; }

.create-game {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 16px 40px;
}

.create-game__step-header {
  display: grid;
  gap: 10px;
  margin-bottom: 8px;
}
.create-game__step-count {
  margin: 0;
  color: var(--ion-color-primary);
  font-size: 0.75rem;
  font-weight: 700;
}
.create-game__progress {
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--gora-line);
}
.create-game__progress span {
  display: block;
  height: 100%;
  background: var(--ion-color-primary);
}
.create-game__step-title {
  margin: 6px 0 0;
  font-size: 1.3rem;
  font-weight: 800;
}
.create-game__step-title:focus {
  outline: none;
}
.create-game__step-hint {
  margin: 0;
  color: var(--gora-muted);
  font-size: 0.85rem;
  line-height: 1.5;
}
.create-game__step {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.create-game__review-card {
  padding: 16px;
  border: 1px solid var(--gora-line);
  border-radius: 12px;
  background: var(--gora-surface);
  overflow-wrap: anywhere;
}
.create-game__review-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.create-game__review-heading h3 {
  margin: 0;
  font-size: 0.85rem;
}
.create-game__review-heading button {
  padding: 6px 10px;
  border: 0;
  border-radius: 6px;
  background: var(--gora-surface-raised);
  color: var(--ion-color-primary);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}
.create-game__review-card p {
  margin: 6px 0 0;
  color: var(--gora-muted);
  font-size: 0.85rem;
  line-height: 1.5;
}
.create-game__review-description {
  white-space: pre-line;
}
.create-game__actions {
  display: flex;
  max-width: var(--gora-column, 680px);
  gap: 12px;
  margin: 0 auto;
  padding: 12px 16px max(12px, var(--gora-input-safe-bottom, env(safe-area-inset-bottom)));
  border-top: 1px solid var(--gora-line);
  background: var(--ion-background-color);
}
.create-game__back {
  flex: 1;
  min-height: 48px;
  padding: 12px;
  border: 1px solid var(--gora-line-strong);
  border-radius: 999px;
  background: transparent;
  color: var(--ion-text-color);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}
.create-game__back:disabled {
  opacity: 0.5;
  cursor: wait;
}

.create-game__field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.create-game__label {
  display: flex;
  justify-content: space-between;
  color: var(--gora-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.create-game__counter {
  font-weight: 500;
  letter-spacing: 0;
}

.create-game__input {
  width: 100%;
  min-width: 0;
  min-height: 48px;
  padding: 11px 12px;
  border: 1px solid var(--gora-line-strong);
  border-radius: 12px;
  background: var(--gora-surface);
  color: var(--ion-text-color);
  font: inherit;
  font-size: 0.92rem;
  color-scheme: inherit;
}

.create-game__input--narrow {
  max-width: 160px;
}

textarea.create-game__input {
  resize: vertical;
}

.create-game__grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.create-game__hint {
  margin: -6px 0 0;
  color: #7d8a93;
  font-size: 0.72rem;
}

.create-game__place {
  position: relative;
}

.create-game__place-box {
  position: relative;
}

.create-game__place-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  color: var(--gora-muted);
  font-size: 1.1rem;
  transform: translateY(-50%);
  pointer-events: none;
}

.create-game__place-input.create-game__place-input {
  padding-right: 40px;
  padding-left: 40px;
}

.create-game__place-input:focus {
  border-color: var(--ion-color-primary);
  outline: none;
  box-shadow: 0 0 0 3px var(--gora-accent-soft);
}

.create-game__place-spinner {
  position: absolute;
  top: 50%;
  right: 12px;
  width: 20px;
  height: 20px;
  color: var(--ion-color-primary);
  transform: translateY(-50%);
}

.create-game__places {
  position: absolute;
  z-index: 1000;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
  padding: 6px;
  border: 1px solid var(--gora-line-strong);
  border-radius: 16px;
  background: var(--gora-surface);
  box-shadow: 0 18px 40px -16px rgba(0, 0, 0, 0.7);
  list-style: none;
  animation: create-game-drop 0.18s ease-out;
}

.create-game__place-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
}

.create-game__place-option ion-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--ion-color-primary);
  font-size: 1.1rem;
}

.create-game__place-option span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.create-game__place-option strong {
  font-size: 0.9rem;
}

.create-game__place-option small {
  overflow: hidden;
  color: var(--gora-muted);
  font-size: 0.76rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.create-game__place-option:hover,
.create-game__place-option.is-active {
  background: var(--gora-accent-soft);
}

.create-game__place-note {
  padding: 10px 12px;
  color: var(--gora-muted);
  font-size: 0.82rem;
}

.create-game__map {
  margin-top: 4px;
}

.create-game__locate {
  display: inline-flex;
  width: 100%;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid var(--ion-color-primary);
  border-radius: 999px;
  background: var(--gora-accent-soft);
  color: var(--ion-color-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 800;
  transition: transform 0.15s, opacity 0.2s;
}

.create-game__locate:not(:disabled):active {
  transform: scale(0.98);
}

.create-game__locate:disabled {
  cursor: progress;
  opacity: 0.75;
}

.create-game__locate ion-icon {
  font-size: 1.15rem;
}

.create-game__locate ion-spinner {
  width: 18px;
  height: 18px;
}

@keyframes create-game-drop {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}

.create-game__pick-location {
  align-self: flex-start;
  min-height: 42px;
  padding: 9px 14px;
  border: 1px solid var(--ion-color-primary);
  border-radius: 999px;
  background: transparent;
  color: var(--ion-color-primary);
  cursor: pointer;
  font: inherit;
  font-size: .84rem;
  font-weight: 700;
}

.create-game__field .create-game__hint {
  margin: 0;
}

.create-game__error {
  margin: 0;
  color: #ef5b5b;
  font-size: 0.74rem;
  font-weight: 600;
}

.create-game__alert {
  margin: 4px 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(239, 91, 91, 0.12);
  color: #ef5b5b;
  font-size: 0.82rem;
  font-weight: 600;
}

.create-game__blocked {
  margin: 48px 16px;
  color: var(--gora-muted);
  text-align: center;
}

.create-game__submit {
  flex: 1;
  min-height: 48px;
  padding: 14px;
  border: 0;
  border-radius: 999px;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.create-game__submit:disabled {
  background: #1b2a37;
  color: #7d8a93;
  cursor: default;
}

.game-created {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 28px 16px 40px;
}

.game-created__badge {
  margin: 0;
  color: var(--ion-color-primary);
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-align: center;
}

.game-created__note {
  margin: 0 0 4px;
  color: var(--gora-muted);
  font-size: 0.85rem;
  text-align: center;
}

.game-created__again,
.game-created__link {
  min-height: 46px;
  text-align: center;
  text-decoration: none;
  padding: 13px;
  border: 1px solid var(--gora-line-strong);
  border-radius: 999px;
  background: transparent;
  color: var(--ion-text-color);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

/* ───────── Polished layout ───────── */
.create-game {
  width: 100%;
  max-width: 640px;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 16px 12px 32px;
}
.create-game__step-header {
  padding: 2px 4px 0;
}
.create-game__progress {
  height: 6px;
  background: var(--gora-surface-raised);
}
.create-game__progress span {
  border-radius: inherit;
  background: linear-gradient(90deg, var(--ion-color-primary), var(--ion-color-primary-tint));
  transition: width 0.4s ease;
}
.create-game__step-title {
  font-size: 1.45rem;
  letter-spacing: -0.02em;
}
.create-game__step {
  gap: 16px;
  padding: 18px 16px 20px;
  border: 1px solid var(--gora-line);
  border-radius: 20px;
  background: var(--gora-surface);
  box-shadow: var(--gora-shadow);
  animation: create-game-step 0.3s ease-out both;
}
.create-game__label {
  font-weight: 800;
}
.create-game__input {
  border: 1px solid var(--gora-line);
  border-radius: 14px;
  background: var(--gora-surface-raised);
  transition: border-color var(--gora-motion), box-shadow var(--gora-motion), background var(--gora-motion);
}
.create-game__input:focus {
  border-color: var(--ion-color-primary);
  background: var(--gora-surface);
  box-shadow: 0 0 0 3px var(--gora-accent-soft);
  outline: none;
}
.create-game__hint {
  color: var(--gora-muted);
}
.create-game__review-card {
  border-radius: 14px;
  background: var(--gora-surface-raised);
}
.create-game__submit {
  background: linear-gradient(135deg, var(--ion-color-primary), var(--ion-color-primary-tint));
  box-shadow: 0 10px 24px -12px rgba(255, 96, 40, 0.8);
  font-weight: 800;
}
.create-game__submit:disabled {
  background: var(--gora-surface-raised);
  box-shadow: none;
  color: var(--gora-muted);
}
.create-game__back {
  border-color: var(--gora-line);
  background: var(--gora-surface);
}
.game-created {
  max-width: 560px;
  margin: 0 auto;
  animation: create-game-step 0.35s ease-out both;
}
.game-created__badge {
  animation: create-game-pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.3) both;
}
@keyframes create-game-step {
  from {
    opacity: 0;
    transform: translateX(14px);
  }
}
@keyframes create-game-pop {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
}
@media (prefers-reduced-motion: reduce) {
  .create-game__step,
  .game-created,
  .game-created__badge {
    animation: none;
  }
}
</style>
