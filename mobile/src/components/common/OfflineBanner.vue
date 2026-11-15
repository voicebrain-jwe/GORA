<template>
  <div v-if="offline" class="offline-banner" role="status" aria-live="polite" aria-atomic="true">
    <ion-icon :icon="cloudOfflineOutline" aria-hidden="true" />
    <span>No internet connection</span>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { IonIcon } from '@ionic/vue';
import { cloudOfflineOutline } from 'ionicons/icons';

const offline = ref(typeof navigator !== 'undefined' && !navigator.onLine);
function updateConnection(): void {
  offline.value = !navigator.onLine;
}
onMounted(() => {
  updateConnection();
  window.addEventListener('online', updateConnection);
  window.addEventListener('offline', updateConnection);
  window.addEventListener('focus', updateConnection);
  document.addEventListener('visibilitychange', updateConnection);
});
onBeforeUnmount(() => {
  window.removeEventListener('online', updateConnection);
  window.removeEventListener('offline', updateConnection);
  window.removeEventListener('focus', updateConnection);
  document.removeEventListener('visibilitychange', updateConnection);
});
</script>

<style scoped>
.offline-banner {
  position: fixed;
  z-index: 100000;
  right: 16px;
  bottom: calc(76px + env(safe-area-inset-bottom, 0px));
  left: 16px;
  display: flex;
  width: fit-content;
  max-width: calc(100% - 32px);
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-inline: auto;
  padding: 12px 18px;
  border: 1px solid #fca5a5;
  border-radius: 14px;
  background: #7f1d1d;
  color: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
  font-size: 0.9rem;
  font-weight: 700;
  pointer-events: none;
}
.offline-banner ion-icon {
  flex-shrink: 0;
  font-size: 22px;
}
</style>
