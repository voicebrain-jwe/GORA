<template>
  <!-- Phone app: a full screen with Reload and Exit. -->
  <div
    v-if="offline && isNative"
    class="offline-screen"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="offline-title"
    aria-describedby="offline-text"
  >
    <div class="offline-screen__body">
      <span class="offline-screen__icon"><ion-icon :icon="cloudOfflineOutline" aria-hidden="true" /></span>
      <h1 id="offline-title">No internet connection</h1>
      <p id="offline-text">
        Check your Wi-Fi or mobile data, then tap Reload.
      </p>
      <p v-if="stillOffline" class="offline-screen__retry" role="status">Still offline. Try again in a moment.</p>
      <div class="offline-screen__actions">
        <button type="button" class="offline-screen__primary" :disabled="checking" @click="reload">
          <ion-icon :icon="refreshOutline" aria-hidden="true" :class="{ 'offline-screen__spin': checking }" />
          {{ checking ? 'Checking…' : 'Reload' }}
        </button>
        <button v-if="canExit" type="button" class="offline-screen__secondary" @click="exitApp">
          <ion-icon :icon="exitOutline" aria-hidden="true" />
          Exit
        </button>
      </div>
    </div>
  </div>

  <!-- Browser: a small banner, the page stays usable. -->
  <div v-else-if="offline" class="offline-banner" role="status" aria-live="polite" aria-atomic="true">
    <ion-icon :icon="cloudOfflineOutline" aria-hidden="true" />
    <span>No internet connection</span>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { IonIcon } from '@ionic/vue';
import { cloudOfflineOutline, exitOutline, refreshOutline } from 'ionicons/icons';

const isNative = Capacitor.isNativePlatform();
/** iOS does not allow apps to close themselves. */
const canExit = isNative && Capacitor.getPlatform() === 'android';

const offline = ref(typeof navigator !== 'undefined' && !navigator.onLine);
const checking = ref(false);
const stillOffline = ref(false);

function updateConnection(): void {
  offline.value = !navigator.onLine;
  if (!offline.value) stillOffline.value = false;
}

async function reload(): Promise<void> {
  if (checking.value) return;
  checking.value = true;
  stillOffline.value = false;
  // Give the radio a moment to report a new network.
  await new Promise((resolve) => setTimeout(resolve, 800));
  checking.value = false;
  if (navigator.onLine) {
    window.location.reload();
  } else {
    stillOffline.value = true;
  }
}

function exitApp(): void {
  void App.exitApp();
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
.offline-screen {
  position: fixed;
  z-index: 100000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(24px + env(safe-area-inset-top, 0px)) 24px calc(24px + env(safe-area-inset-bottom, 0px));
  background: var(--ion-background-color, #101113);
  color: var(--ion-text-color, #f5f6f8);
  text-align: center;
}

.offline-screen__body {
  display: flex;
  width: 100%;
  max-width: 340px;
  flex-direction: column;
  align-items: center;
}

.offline-screen__icon {
  display: grid;
  width: 88px;
  height: 88px;
  place-items: center;
  border-radius: 50%;
  background: var(--gora-accent-soft, rgba(255, 96, 40, 0.1));
  color: var(--ion-color-primary, #ff6028);
  font-size: 44px;
}

.offline-screen h1 {
  margin: 22px 0 8px;
  font-size: 1.35rem;
  font-weight: 800;
}

.offline-screen p {
  margin: 0;
  color: var(--gora-muted, #aab3bf);
  font-size: 0.92rem;
  line-height: 1.5;
}

.offline-screen__retry {
  margin-top: 12px !important;
  color: var(--ion-color-primary, #ff6028) !important;
  font-weight: 600;
}

.offline-screen__actions {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 10px;
  margin-top: 28px;
}

.offline-screen__primary,
.offline-screen__secondary {
  display: inline-flex;
  min-height: 50px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 14px;
  cursor: pointer;
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
}

.offline-screen__primary {
  border: 0;
  background: var(--ion-color-primary, #ff6028);
  color: var(--ion-color-primary-contrast, #101113);
}

.offline-screen__primary:disabled {
  opacity: 0.7;
}

.offline-screen__secondary {
  border: 1px solid var(--gora-line, rgba(245, 246, 248, 0.12));
  background: transparent;
  color: var(--ion-text-color, #f5f6f8);
}

.offline-screen ion-icon {
  font-size: 20px;
}

.offline-screen__icon ion-icon {
  font-size: 44px;
}

.offline-screen__spin {
  animation: offline-spin 0.9s linear infinite;
}

@keyframes offline-spin {
  to {
    transform: rotate(360deg);
  }
}

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
