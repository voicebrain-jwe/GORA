<template>
  <ion-app>
    <ion-router-outlet :swipe-gesture="false" />
    <OfflineBanner />
  </ion-app>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import { IonApp, IonRouterOutlet, useIonRouter, useBackButton } from '@ionic/vue';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import OfflineBanner from '@/components/common/OfflineBanner.vue';
import { installSwipeBack } from '@/utils/swipe-back';
import { installFilipinoLocalization } from '@/i18n';
import { installKeyboardViewport } from '@/utils/keyboard-viewport';

let stopKeyboardViewport: (() => void) | undefined;
let stopLocalization: (() => void) | undefined;
let stopSwipeBack: (() => void) | undefined;
const ionRouter = useIonRouter();
const router = useRouter();
const auth = useAuthStore();
let nativeBackListener: PluginListenerHandle | undefined;
let disposed = false;

function navigateBack(): void {
  if (ionRouter.canGoBack()) ionRouter.back();
  else if (auth.isAuthenticated && router.currentRoute.value.path !== '/home') {
    void router.replace('/home');
  }
  // At the root, consume Back and keep GORA open.
}

// Ionic dialogs/menus (priority 100/99) get first chance to consume Back.
const backHandler = Capacitor.getPlatform() === 'android'
  ? useBackButton(10, navigateBack)
  : undefined;

onMounted(() => {
  if (Capacitor.getPlatform() === 'android') {
    // AppPlugin dispatches Ionic's document "backbutton" event when a native
    // listener exists. Navigation is handled once by useBackButton above.
    void NativeApp.addListener('backButton', () => {}).then((listener) => {
      if (disposed) void listener.remove();
      else nativeBackListener = listener;
    });
  } else if (Capacitor.isNativePlatform()) {
    stopSwipeBack = installSwipeBack(navigateBack, () => true);
  }
  stopKeyboardViewport = installKeyboardViewport();
  stopLocalization = installFilipinoLocalization(document.body);
});
onBeforeUnmount(() => {
  disposed = true;
  backHandler?.unregister();
  void nativeBackListener?.remove();
  stopSwipeBack?.();
  stopKeyboardViewport?.();
  stopLocalization?.();
});
</script>
