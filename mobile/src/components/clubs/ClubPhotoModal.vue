<template>
  <ion-modal :is-open="isOpen" :can-dismiss="!busy" @did-dismiss="close">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="busy" @click="close">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="club-photo-editor" :aria-busy="busy">
        <div class="club-photo-editor__preview" :class="`club-photo-editor__preview--${kind}`">
          <img v-if="shownUrl" :src="shownUrl" :alt="`${title} preview`" />
          <p v-else>{{ kind === 'cover' ? 'Choose a photo for the top of your club page.' : 'Choose a logo for your club.' }}</p>
        </div>
        <p class="club-photo-editor__hint">JPEG, PNG or WebP, up to 20 MB. Your photo is resized and centered to fit.</p>
        <input
          ref="inputRef"
          class="club-photo-editor__file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          :aria-label="`Choose club ${kind === 'cover' ? 'cover photo' : 'logo'}`"
          :disabled="busy"
          @change="select"
        />
        <p v-if="error" role="alert" class="club-photo-editor__error">{{ error }}</p>
        <div class="club-photo-editor__actions">
          <ion-button fill="outline" :disabled="busy" @click="inputRef?.click()">
            {{ prepared ? 'Choose another photo' : 'Choose photo' }}
          </ion-button>
          <ion-button v-if="currentUrl && !prepared" fill="clear" color="danger" :disabled="busy" @click="save(true)">
            Remove {{ kind === 'cover' ? 'cover' : 'logo' }}
          </ion-button>
          <ion-button :disabled="!prepared || busy" @click="save(false)">
            <ion-spinner v-if="busy" slot="start" name="crescent" />
            {{ preparing ? 'Preparing…' : saving ? 'Saving…' : `Save ${kind === 'cover' ? 'cover' : 'logo'}` }}
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonSpinner, IonTitle, IonToolbar } from '@ionic/vue';
import { useClubsStore } from '@/stores/clubs';
import type { ClubUpdateInput } from '@/types/club';
import { showNotice } from '@/utils/notice';
import { preparePostPhoto } from '@/utils/post-photos';

const props = defineProps<{ isOpen: boolean; clubId: string; kind: 'profile' | 'cover'; currentUrl: string | null }>();
const emit = defineEmits<{ close: [] }>();
const clubsStore = useClubsStore();

const inputRef = ref<HTMLInputElement | null>(null);
/** The resized photo as a data URL, sent as profilePhoto / coverPhoto. */
const prepared = ref<string | null>(null);
const preparing = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const busy = computed(() => preparing.value || saving.value);
const title = computed(() => (props.kind === 'cover' ? 'Club cover photo' : 'Club logo'));
const shownUrl = computed(() => prepared.value ?? props.currentUrl);

function close(): void {
  if (busy.value) return;
  prepared.value = null;
  error.value = null;
  emit('close');
}

async function select(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || busy.value) return;
  error.value = null;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    error.value = 'Choose a JPEG, PNG or WebP photo.';
    return;
  }
  preparing.value = true;
  try {
    prepared.value = await preparePostPhoto(file);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not prepare this photo. Please try again.';
  } finally {
    preparing.value = false;
  }
}

async function save(remove: boolean): Promise<void> {
  if (busy.value || (!remove && !prepared.value)) return;
  const photoKey = props.kind === 'cover' ? 'coverPhoto' : 'profilePhoto';
  const urlKey = props.kind === 'cover' ? 'coverImageUrl' : 'profileImageUrl';
  const input: ClubUpdateInput = remove ? { [photoKey]: null, [urlKey]: null } : { [photoKey]: prepared.value };
  saving.value = true;
  error.value = null;
  try {
    const result = await clubsStore.update(props.clubId, input);
    if (!result.ok) {
      error.value = result.message;
      return;
    }
    void showNotice(remove ? `${title.value} removed.` : `${title.value} updated.`);
  } finally {
    saving.value = false;
  }
  close();
}
</script>

<style scoped>
.club-photo-editor {
  max-width: 680px;
  margin: 0 auto;
  padding: 20px 16px;
}

.club-photo-editor__preview {
  display: grid;
  overflow: hidden;
  place-items: center;
  margin: 0 auto;
  border-radius: 14px;
  background: var(--gora-surface-raised);
  color: var(--gora-muted);
}

.club-photo-editor__preview--cover {
  aspect-ratio: 2.7;
}

.club-photo-editor__preview--profile {
  width: min(220px, 70%);
  aspect-ratio: 1;
  border-radius: 22px;
}

.club-photo-editor__preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.club-photo-editor__preview p {
  padding: 16px;
  text-align: center;
}

.club-photo-editor__hint {
  color: var(--gora-muted);
  font-size: 0.85rem;
  text-align: center;
}

.club-photo-editor__file {
  display: none;
}

.club-photo-editor__error {
  color: var(--ion-color-danger);
  font-size: 0.88rem;
}

.club-photo-editor__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}
</style>
