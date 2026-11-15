import { onMounted, onUnmounted, watch } from "vue";
import { useNotificationsStore } from "@/stores/notifications";
import { useAuthStore } from "@/stores/auth";
import { showDeviceNotification } from '@/services/device-notifications.service';

/** One poller for the authenticated layout, shared by the desktop and mobile bells. */
export function useNotificationPolling(): void {
  const notifications = useNotificationsStore();
  const auth = useAuthStore();
  let mounted = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  let seeded = false;
  let knownIds = new Set<string>();
  const refresh = async () => {
    if (!auth.accessToken || document.hidden) return;
    const loaded = await notifications.load(true);
    if (!loaded) return;

    const latest = notifications.items;
    if (seeded) {
      for (const item of latest) {
        if (!knownIds.has(item.id) && !item.read) void showDeviceNotification(item);
      }
    }
    knownIds = new Set(latest.map((item) => item.id));
    seeded = true;
  };
  watch(
    () => [auth.sessionVersion, auth.currentUser?.id, auth.accessToken],
    () => {
      seeded = false;
      knownIds = new Set();
      if (mounted) refresh();
    },
  );
  onMounted(() => {
    mounted = true;
    refresh();
    timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
  });
  onUnmounted(() => {
    mounted = false;
    clearInterval(timer);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", refresh);
  });
}
