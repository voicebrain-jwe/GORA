<template>
  <section class="post-comments-sheet">
    <header class="post-comments-sheet__header">
      <h2>Comments <span>{{ commentCount }}</span></h2>
      <button type="button" class="post-comments-sheet__close" aria-label="Close comments" @click="close">
        <ion-icon :icon="closeOutline" aria-hidden="true" />
      </button>
    </header>

    <div ref="listRef" class="post-comments-sheet__list">
      <div v-if="loading && comments.length === 0" class="post-comments-sheet__state" aria-busy="true">
        <ion-spinner name="crescent" />
      </div>
      <div v-else-if="loadError" class="post-comments-sheet__state" role="alert">
        <p>{{ loadError }}</p>
        <button type="button" @click="load(false)">Try again</button>
      </div>
      <div v-else-if="comments.length === 0" class="post-comments-sheet__state">
        <ion-icon :icon="chatbubblesOutline" aria-hidden="true" />
        <p>No comments yet. Start the conversation.</p>
      </div>

      <article v-for="comment in comments" :key="comment.id" class="post-comments-sheet__item">
        <router-link :to="`/profile/${comment.author.username}`" class="post-comments-sheet__avatar" @click="close">
          <UserAvatar :user="toUserSummary(comment.author)" :size="34" />
        </router-link>
        <div class="post-comments-sheet__body">
          <div class="post-comments-sheet__bubble">
            <strong>{{ toUserSummary(comment.author).displayName }}</strong>
            <p>{{ comment.content }}</p>
          </div>
          <div class="post-comments-sheet__meta">
            <time :datetime="comment.createdAt">{{ formatTimeAgo(Date.parse(comment.createdAt), Date.now()) }}</time>
            <button
              v-if="canDelete(comment)"
              type="button"
              :disabled="busyComment !== null"
              @click="remove(comment)"
            >
              {{ busyComment === comment.id ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </article>

      <button v-if="cursor" type="button" class="post-comments-sheet__more" :disabled="loading" @click="load(true)">
        {{ loading ? 'Loading…' : 'Load more comments' }}
      </button>
    </div>

    <p v-if="sendError" class="post-comments-sheet__error" role="alert">{{ sendError }}</p>
    <form class="post-comments-sheet__composer" @submit.prevent="submit">
      <input
        v-model="draft"
        maxlength="2200"
        aria-label="Write a comment"
        placeholder="Write a comment…"
        :disabled="sending"
        enterkeyhint="send"
      />
      <button type="submit" :disabled="!draft.trim() || sending" aria-label="Send comment">
        <ion-spinner v-if="sending" name="crescent" />
        <ion-icon v-else :icon="sendOutline" aria-hidden="true" />
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { IonIcon, IonSpinner, alertController, modalController } from '@ionic/vue';
import { chatbubblesOutline, closeOutline, sendOutline } from 'ionicons/icons';
import UserAvatar from '@/components/common/UserAvatar.vue';
import { addPostComment, deletePostComment, listPostComments } from '@/services/posts-api.service';
import { useAuthStore } from '@/stores/auth';
import { createAuthorizedCall, describeContentError } from '@/stores/authorized';
import { usePostsStore } from '@/stores/posts';
import type { ApiPostComment } from '@/types/post';
import { toUserSummary } from '@/utils/display-name';
import { toFeedPost } from '@/utils/post-api';
import { formatTimeAgo } from '@/utils/time';

/** Opened from the feed's Comment button, Facebook-style, without leaving the feed. */
const props = defineProps<{ postId: string; postAuthorId: string; initialCount: number }>();

const auth = useAuthStore();
const posts = usePostsStore();
const authorized = createAuthorizedCall(auth);

const comments = ref<ApiPostComment[]>([]);
const cursor = ref<string | null>(null);
const loading = ref(false);
const loadError = ref<string | null>(null);
const sending = ref(false);
const sendError = ref<string | null>(null);
const busyComment = ref<string | null>(null);
const draft = ref('');
const listRef = ref<HTMLElement | null>(null);
const commentCount = computed(() => posts.findPost(props.postId)?.comments ?? props.initialCount);

function close(): void {
  void modalController.dismiss();
}

async function load(more: boolean): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  loadError.value = null;
  try {
    const page = await authorized((token) => listPostComments(token, props.postId, more ? cursor.value ?? undefined : undefined));
    comments.value = more ? [...comments.value, ...page.comments] : page.comments;
    cursor.value = page.nextCursor;
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
    const result = await authorized((token) => addPostComment(token, props.postId, content));
    posts.rememberProfilePosts([toFeedPost(result.post)]);
    comments.value = [result.comment, ...comments.value];
    draft.value = '';
    await nextTick();
    listRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (caught) {
    sendError.value = describeContentError(caught, 'Could not post your comment.');
  } finally {
    sending.value = false;
  }
}

function canDelete(comment: ApiPostComment): boolean {
  const me = auth.currentUser?.id;
  return !!me && (comment.author.id === me || props.postAuthorId === me);
}

async function remove(comment: ApiPostComment): Promise<void> {
  if (busyComment.value) return;
  const alert = await alertController.create({
    header: 'Delete comment?',
    message: 'This comment will be removed from the post.',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Delete', role: 'destructive' },
    ],
  });
  await alert.present();
  if ((await alert.onDidDismiss()).role !== 'destructive') return;
  busyComment.value = comment.id;
  try {
    const updated = await authorized((token) => deletePostComment(token, props.postId, comment.id));
    posts.rememberProfilePosts([toFeedPost(updated)]);
    comments.value = comments.value.filter((item) => item.id !== comment.id);
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
.post-comments-sheet {
  display: flex;
  height: 100%;
  flex-direction: column;
  background: var(--gora-surface);
  color: var(--ion-text-color);
}

.post-comments-sheet__header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-bottom: 1px solid var(--gora-line);
}

.post-comments-sheet__grabber {
  position: absolute;
  top: 7px;
  left: 50%;
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: var(--gora-line-strong);
  transform: translateX(-50%);
}

.post-comments-sheet__header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
}

.post-comments-sheet__header h2 span {
  margin-left: 4px;
  color: var(--gora-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.post-comments-sheet__close {
  position: absolute;
  top: 10px;
  right: 10px;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: var(--gora-surface-raised);
  color: var(--ion-text-color);
  cursor: pointer;
  font-size: 20px;
}

.post-comments-sheet__list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  padding: 16px;
  overscroll-behavior: contain;
}

.post-comments-sheet__state {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 16px;
  color: var(--gora-muted);
  text-align: center;
}

.post-comments-sheet__state ion-icon {
  color: var(--ion-color-primary);
  font-size: 40px;
}

.post-comments-sheet__state p {
  margin: 0;
}

.post-comments-sheet__state button,
.post-comments-sheet__more {
  align-self: center;
  padding: 8px 16px;
  border: 1px solid var(--gora-line);
  border-radius: 999px;
  background: var(--gora-surface-raised);
  color: var(--ion-color-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
}

.post-comments-sheet__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  animation: comment-in 0.2s ease-out;
}

.post-comments-sheet__avatar {
  display: flex;
  flex-shrink: 0;
  border-radius: 50%;
}

.post-comments-sheet__body {
  min-width: 0;
}

.post-comments-sheet__bubble {
  display: inline-block;
  max-width: 100%;
  padding: 8px 12px 9px;
  border-radius: 16px;
  background: var(--gora-surface-raised);
}

.post-comments-sheet__bubble strong {
  display: block;
  font-size: 0.8rem;
}

.post-comments-sheet__bubble p {
  margin: 2px 0 0;
  font-size: 0.92rem;
  line-height: 1.4;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.post-comments-sheet__meta {
  display: flex;
  gap: 12px;
  margin: 4px 0 0 12px;
  color: var(--gora-muted);
  font-size: 0.72rem;
}

.post-comments-sheet__meta button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--gora-muted);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.post-comments-sheet__error {
  margin: 0;
  padding: 8px 16px;
  color: #ef5b5b;
  font-size: 0.82rem;
}

.post-comments-sheet__composer {
  display: flex;
  gap: 8px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--gora-line);
}

.post-comments-sheet__composer input {
  min-width: 0;
  flex: 1;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--gora-line);
  border-radius: 999px;
  background: var(--gora-surface-raised);
  color: var(--ion-text-color);
  font: inherit;
}

.post-comments-sheet__composer input:focus {
  border-color: var(--ion-color-primary);
  outline: none;
}

.post-comments-sheet__composer button {
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
  font-size: 19px;
}

.post-comments-sheet__composer button:disabled {
  opacity: 0.5;
}

@keyframes comment-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
</style>
