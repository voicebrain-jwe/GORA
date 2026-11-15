<template>
  <section class="game-comments" aria-labelledby="game-comments-title">
    <div class="game-comments__head">
      <h2 id="game-comments-title">Comments</h2>
      <span v-if="total > 0" class="game-comments__count">{{ total }}</span>
    </div>

    <form class="game-comments__composer" @submit.prevent="submit">
      <UserAvatar v-if="me" :user="me" :size="34" />
      <input
        v-model="draft"
        maxlength="2200"
        aria-label="Write a comment"
        placeholder="Ask the host or the players…"
        :disabled="sending"
        enterkeyhint="send"
      />
      <button type="submit" :disabled="!draft.trim() || sending" aria-label="Send comment">
        <ion-spinner v-if="sending" name="crescent" />
        <ion-icon v-else :icon="sendOutline" aria-hidden="true" />
      </button>
    </form>
    <p v-if="sendError" class="game-comments__error" role="alert">{{ sendError }}</p>

    <div v-if="loading && comments.length === 0" class="game-comments__state" aria-busy="true">
      <ion-spinner name="crescent" />
    </div>
    <p v-else-if="loadError" class="game-comments__state" role="alert">
      {{ loadError }}
      <button type="button" class="game-comments__link" @click="load(false)">Try again</button>
    </p>
    <p v-else-if="comments.length === 0" class="game-comments__state">
      <ion-icon :icon="chatbubblesOutline" aria-hidden="true" />
      No comments yet. Ask a question or say you're in.
    </p>

    <TransitionGroup v-else tag="ul" name="game-comment" class="game-comments__list">
      <li v-for="comment in comments" :key="comment.id" class="game-comments__item">
        <router-link :to="`/profile/${comment.author.username}`" class="game-comments__avatar">
          <UserAvatar :user="toUserSummary(comment.author)" :size="34" />
        </router-link>
        <div class="game-comments__body">
          <div class="game-comments__bubble">
            <strong>
              {{ toUserSummary(comment.author).displayName }}
              <span v-if="comment.author.id === hostId" class="game-comments__host">Host</span>
            </strong>
            <p>{{ comment.content }}</p>
          </div>
          <div class="game-comments__meta">
            <time :datetime="comment.createdAt">{{ formatTimeAgo(Date.parse(comment.createdAt), Date.now()) }}</time>
            <button v-if="canDelete(comment)" type="button" :disabled="busyComment !== null" @click="remove(comment)">
              {{ busyComment === comment.id ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </li>
    </TransitionGroup>

    <button v-if="cursor" type="button" class="game-comments__more" :disabled="loading" @click="load(true)">
      {{ loading ? 'Loading…' : 'Show older comments' }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { IonIcon, IonSpinner, alertController } from '@ionic/vue';
import { chatbubblesOutline, sendOutline } from 'ionicons/icons';
import UserAvatar from '@/components/common/UserAvatar.vue';
import { addGameComment, deleteGameComment, listGameComments } from '@/services/games-api.service';
import { useAuthStore } from '@/stores/auth';
import { createAuthorizedCall, describeContentError } from '@/stores/authorized';
import type { ApiPostComment } from '@/types/post';
import { toUserSummary } from '@/utils/display-name';
import { formatTimeAgo } from '@/utils/time';

/** Discussion under a posted game: questions for the host, "running late", and so on. */
const props = defineProps<{ gameId: string; hostId: string }>();

const auth = useAuthStore();
const authorized = createAuthorizedCall(auth);

const comments = ref<ApiPostComment[]>([]);
const total = ref(0);
const cursor = ref<string | null>(null);
const loading = ref(false);
const loadError = ref<string | null>(null);
const sending = ref(false);
const sendError = ref<string | null>(null);
const busyComment = ref<string | null>(null);
const draft = ref('');
const me = computed(() => (auth.currentUser ? toUserSummary(auth.currentUser) : null));

async function load(more: boolean): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  loadError.value = null;
  try {
    const page = await authorized((token) =>
      listGameComments(token, props.gameId, more ? cursor.value ?? undefined : undefined),
    );
    comments.value = more ? [...comments.value, ...page.comments] : page.comments;
    cursor.value = page.nextCursor;
    total.value = page.total;
  } catch (caught) {
    loadError.value = describeContentError(caught, 'Could not load comments.');
  } finally {
    loading.value = false;
  }
}

async function submit(): Promise<void> {
  const content = draft.value.trim();
  if (!content || sending.value) return;
  sending.value = true;
  sendError.value = null;
  try {
    const result = await authorized((token) => addGameComment(token, props.gameId, content));
    comments.value = [result.comment, ...comments.value];
    total.value = result.total;
    draft.value = '';
  } catch (caught) {
    sendError.value = describeContentError(caught, 'Could not post your comment.');
  } finally {
    sending.value = false;
  }
}

function canDelete(comment: ApiPostComment): boolean {
  const viewer = auth.currentUser?.id;
  return !!viewer && (comment.author.id === viewer || props.hostId === viewer);
}

async function remove(comment: ApiPostComment): Promise<void> {
  if (busyComment.value) return;
  const alert = await alertController.create({
    header: 'Delete comment?',
    message: 'This comment will be removed from the game.',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Delete', role: 'destructive' },
    ],
  });
  await alert.present();
  if ((await alert.onDidDismiss()).role !== 'destructive') return;
  busyComment.value = comment.id;
  try {
    const result = await authorized((token) => deleteGameComment(token, props.gameId, comment.id));
    comments.value = comments.value.filter((item) => item.id !== comment.id);
    total.value = result.total;
  } catch (caught) {
    sendError.value = describeContentError(caught, 'Could not delete the comment.');
  } finally {
    busyComment.value = null;
  }
}

onMounted(() => {
  void load(false);
});
</script>

<style scoped>
.game-comments {
  padding: 16px;
  border: 1px solid var(--gora-line);
  border-radius: 20px;
  background: var(--gora-surface);
}

.game-comments__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.game-comments__head h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
}

.game-comments__count {
  padding: 2px 9px;
  border-radius: 999px;
  background: var(--gora-accent-soft);
  color: var(--ion-color-primary);
  font-size: 0.75rem;
  font-weight: 800;
}

.game-comments__composer {
  display: flex;
  align-items: center;
  gap: 8px;
}

.game-comments__composer input {
  min-width: 0;
  flex: 1;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--gora-line);
  border-radius: 999px;
  background: var(--gora-surface-raised);
  color: var(--ion-text-color);
  font: inherit;
  font-size: 0.9rem;
}

.game-comments__composer input:focus {
  border-color: var(--ion-color-primary);
  outline: none;
}

.game-comments__composer button {
  display: grid;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  cursor: pointer;
  font-size: 18px;
  transition: transform 0.15s, opacity 0.2s;
}

.game-comments__composer button:not(:disabled):active {
  transform: scale(0.92);
}

.game-comments__composer button:disabled {
  opacity: 0.45;
}

.game-comments__error {
  margin: 8px 4px 0;
  color: #ef5b5b;
  font-size: 0.8rem;
}

.game-comments__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin: 18px 0 4px;
  color: var(--gora-muted);
  font-size: 0.85rem;
  text-align: center;
}

.game-comments__state ion-icon {
  color: var(--ion-color-primary);
  font-size: 30px;
}

.game-comments__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}

.game-comments__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.game-comments__avatar {
  display: flex;
  flex-shrink: 0;
  border-radius: 50%;
}

.game-comments__body {
  min-width: 0;
}

.game-comments__bubble {
  display: inline-block;
  max-width: 100%;
  padding: 8px 12px 9px;
  border-radius: 16px;
  background: var(--gora-surface-raised);
}

.game-comments__bubble strong {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
}

.game-comments__host {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--gora-accent-soft);
  color: var(--ion-color-primary);
  font-size: 0.65rem;
  font-weight: 800;
}

.game-comments__bubble p {
  margin: 2px 0 0;
  font-size: 0.9rem;
  line-height: 1.4;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.game-comments__meta {
  display: flex;
  gap: 12px;
  margin: 4px 0 0 12px;
  color: var(--gora-muted);
  font-size: 0.72rem;
}

.game-comments__meta button,
.game-comments__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--gora-muted);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.game-comments__link {
  color: var(--ion-color-primary);
}

.game-comments__more {
  display: block;
  margin: 14px auto 0;
  padding: 8px 16px;
  border: 1px solid var(--gora-line);
  border-radius: 999px;
  background: var(--gora-surface-raised);
  color: var(--ion-color-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
}

.game-comment-enter-active {
  transition: opacity 0.25s ease-out, transform 0.25s ease-out;
}

.game-comment-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
