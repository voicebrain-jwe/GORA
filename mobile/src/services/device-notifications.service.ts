import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { AppNotification } from '@/types/notification';

export type DeviceNotificationPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

function browserNotificationsAvailable(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function asPermissionState(value: string): DeviceNotificationPermission {
  return value === 'granted' || value === 'denied' ? value : 'prompt';
}

/** Checks notification access without asking the device or browser. */
export async function checkDeviceNotificationPermission(): Promise<DeviceNotificationPermission> {
  if (Capacitor.isNativePlatform()) {
    try {
      return asPermissionState((await LocalNotifications.checkPermissions()).display);
    } catch {
      return 'unsupported';
    }
  }
  return browserNotificationsAvailable() ? asPermissionState(Notification.permission) : 'unsupported';
}

/** Call only from an explicit user interaction so the operating system can show its consent dialog. */
export async function requestDeviceNotificationPermission(): Promise<DeviceNotificationPermission> {
  if (Capacitor.isNativePlatform()) {
    try {
      return asPermissionState((await LocalNotifications.requestPermissions()).display);
    } catch {
      return 'unsupported';
    }
  }
  if (!browserNotificationsAvailable()) return 'unsupported';
  return asPermissionState(await Notification.requestPermission());
}

/** Shows a local foreground alert for a newly received in-app notification. Never requests permission. */
export async function showDeviceNotification(item: AppNotification): Promise<void> {
  if ((await checkDeviceNotificationPermission()) !== 'granted') return;

  if (Capacitor.isNativePlatform()) {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: numericId(item.id),
          title: item.title,
          body: item.body,
          extra: { link: item.link },
        },
      ],
    });
    return;
  }

  new Notification(item.title, { body: item.body, tag: item.id });
}

function numericId(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return (hash & 0x7fffffff) || 1;
}
