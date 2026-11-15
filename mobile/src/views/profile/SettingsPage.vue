<template>
  <ion-page class="profile-app-page">
    <SubPageHeader title="Settings" />

    <ion-content :fullscreen="true">
      <div class="settings">
        <router-link v-if="auth.currentUser" to="/profile" class="settings-account">
          <span class="settings-account__avatar" aria-hidden="true">
            {{ (auth.currentUser.firstName?.[0] ?? '') + (auth.currentUser.lastName?.[0] ?? '') || auth.currentUser.username[0] }}
          </span>
          <span class="settings-account__text">
            <strong>{{ [auth.currentUser.firstName, auth.currentUser.lastName].filter(Boolean).join(' ') || auth.currentUser.username }}</strong>
            <span>@{{ auth.currentUser.username }}</span>
            <small>{{ auth.currentUser.email }}</small>
          </span>
          <ion-icon :icon="chevronForwardOutline" class="settings-account__chevron" aria-hidden="true" />
        </router-link>

        <section v-if="auth.currentUser?.role === 'SUPER_ADMIN'" class="settings-group">
          <h2 class="settings-group__title">Administration</h2>
          <ion-list class="settings-list" lines="inset">
            <ion-item router-link="/admin" :detail="true">
              <span slot="start" class="settings-icon settings-icon--admin"><ion-icon :icon="shieldCheckmarkOutline" aria-hidden="true" /></span>
              <ion-label>Super Admin Dashboard<p>Manage GORA, accounts, and reports</p></ion-label>
            </ion-item>
          </ion-list>
        </section>

        <section class="settings-group">
          <h2 class="settings-group__title">Account</h2>
          <ion-list class="settings-list" lines="inset">
            <ion-item router-link="/profile/edit" :detail="true">
              <span slot="start" class="settings-icon"><ion-icon :icon="personOutline" aria-hidden="true" /></span>
              <ion-label>Edit Profile<p>Name, photo, bio, and city</p></ion-label>
            </ion-item>
            <ion-item router-link="/profile/saved" :detail="true">
              <span slot="start" class="settings-icon settings-icon--blue"><ion-icon :icon="bookmarkOutline" aria-hidden="true" /></span>
              <ion-label>Saved Posts<p>Posts you bookmarked</p></ion-label>
            </ion-item>
            <ion-item router-link="/profile/clubs/new" :detail="true">
              <span slot="start" class="settings-icon settings-icon--green"><ion-icon :icon="addCircleOutline" aria-hidden="true" /></span>
              <ion-label>Create Club<p>Start a community for your sport and city</p></ion-label>
            </ion-item>
          </ion-list>
        </section>

        <section class="settings-group">
          <h2 class="settings-group__title">Preferences</h2>
          <ion-list class="settings-list" lines="inset">
            <ion-item v-for="item in SETTINGS_ITEMS" :key="item.label" button :detail="true" @click="openSetting(item.id)">
              <span slot="start" class="settings-icon" :class="`settings-icon--${item.id}`"><ion-icon :icon="item.icon" aria-hidden="true" /></span>
              <ion-label>
                {{ item.label }}
                <p>{{ item.summary }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </section>

        <section class="settings-group">
          <h2 class="settings-group__title">Support</h2>
          <ion-list class="settings-list" lines="inset">
            <ion-item button :detail="true" @click="openHelp">
              <span slot="start" class="settings-icon settings-icon--purple"><ion-icon :icon="helpCircleOutline" aria-hidden="true" /></span>
              <ion-label>Help<p>Send a message to the GORA admin team</p></ion-label>
            </ion-item>
          </ion-list>
        </section>

        <ion-list class="settings-list settings-list--logout" lines="none">
          <ion-item button :detail="false" :disabled="isLoggingOut" class="settings-logout" @click="logOut">
            <span slot="start" class="settings-icon settings-icon--danger"><ion-icon :icon="logOutOutline" aria-hidden="true" /></span>
            <ion-label>{{ isLoggingOut ? 'Logging out…' : 'Log Out' }}</ion-label>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>

    <ion-modal class="profile-settings-modal" :is-open="activeSetting !== null" @did-dismiss="activeSetting = null">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ activeSettingTitle }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="activeSetting = null">Done</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <p v-if="settings.isLoading" class="settings-help">Loading your settings…</p>
        <ion-list v-else inset>
          <template v-if="activeSetting === 'notifications'">
            <ion-item>
              <ion-label>Friend activity<p>Friend requests, accepted requests, and new followers</p></ion-label>
              <ion-toggle slot="end" :checked="settings.values.notifyFriends" :disabled="settings.isSaving" @ionChange="saveSetting({ notifyFriends: $event.detail.checked })" />
            </ion-item>
            <ion-item>
              <ion-label>Game activity<p>Join requests, responses, and game updates</p></ion-label>
              <ion-toggle slot="end" :checked="settings.values.notifyGames" :disabled="settings.isSaving" @ionChange="saveSetting({ notifyGames: $event.detail.checked })" />
            </ion-item>
            <ion-item>
              <ion-label>Messages<p>New messages and message requests</p></ion-label>
              <ion-toggle slot="end" :checked="settings.values.notifyMessages" :disabled="settings.isSaving" @ionChange="saveSetting({ notifyMessages: $event.detail.checked })" />
            </ion-item>
            <ion-item>
              <ion-label>Posts and activity<p>Likes, comments, story replies, lives, and badges</p></ion-label>
              <ion-toggle slot="end" :checked="settings.values.notifyContent" :disabled="settings.isSaving" @ionChange="saveSetting({ notifyContent: $event.detail.checked })" />
            </ion-item>
            <ion-item>
              <ion-label>Device alerts<p>Show friend requests and game updates as device notifications. You can change this later in your device settings.</p></ion-label>
              <ion-button slot="end" fill="outline" size="small" :disabled="notificationPermission === 'denied' || notificationPermission === 'unsupported'" @click="enableDeviceAlerts">
                {{ deviceAlertAction }}
              </ion-button>
            </ion-item>
            <p v-if="notificationPermission === 'denied'" class="settings-description">Device alerts are blocked. Enable notifications for GORA in your device or browser settings.</p>
            <p v-else-if="notificationPermission === 'unsupported'" class="settings-description">Device alerts are not supported on this device. Your in-app notification inbox is still available.</p>
          </template>
          <template v-else-if="activeSetting === 'privacy'">
            <ion-item>
              <ion-label>Who can view your profile</ion-label>
              <ion-select :value="settings.values.profileVisibility" interface="popover" :disabled="settings.isSaving" @ionChange="saveSetting({ profileVisibility: $event.detail.value })">
                <ion-select-option value="PUBLIC">Everyone</ion-select-option>
                <ion-select-option value="FRIENDS">Friends only</ion-select-option>
              </ion-select>
            </ion-item>
            <p class="settings-description">When set to friends only, people who are not your friends cannot open your profile.</p>
          </template>
          <template v-else-if="activeSetting === 'location'">
            <ion-item>
              <ion-label>Use device location<p>Use your current location to find nearby games. Location is only used for search.</p></ion-label>
              <ion-toggle slot="end" :checked="settings.values.useDeviceLocation" :disabled="settings.isSaving" @ionChange="saveSetting({ useDeviceLocation: $event.detail.checked })" />
            </ion-item>
            <ion-item>
              <ion-label>Default search distance</ion-label>
              <ion-select :value="settings.values.defaultDistanceKm" interface="popover" :disabled="settings.isSaving" @ionChange="saveSetting({ defaultDistanceKm: $event.detail.value })">
                <ion-select-option :value="null">Any distance</ion-select-option>
                <ion-select-option v-for="distance in DISTANCE_OPTIONS" :key="distance" :value="distance">{{ distance }} km</ion-select-option>
              </ion-select>
            </ion-item>
            <p class="settings-description">You can change the distance any time from the games search filters.</p>
          </template>
          <template v-else-if="activeSetting === 'more' && !isAccountSection">
            <ion-item>
              <ion-icon slot="start" :icon="languageOutline" aria-hidden="true" />
              <ion-label>Language<p>Choose your preferred language</p></ion-label>
              <ion-select :value="appPreferences.language" interface="popover" aria-label="Language" @ionChange="setLanguage($event.detail.value)">
                <ion-select-option value="en">English</ion-select-option>
                <ion-select-option value="fil">Filipino</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-icon slot="start" :icon="colorPaletteOutline" aria-hidden="true" />
              <ion-label>Display<p>Choose light or dark mode</p></ion-label>
              <ion-select :value="appPreferences.displayMode" interface="popover" aria-label="Display mode" @ionChange="setDisplayMode($event.detail.value)">
                <ion-select-option value="dark">Dark</ion-select-option>
                <ion-select-option value="light">Light</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-icon slot="start" :icon="cameraReverseOutline" aria-hidden="true" />
              <ion-label>Camera<p>Which camera opens first for Live and video calls</p></ion-label>
              <ion-select :value="appPreferences.cameraFacing" interface="popover" aria-label="Default camera" @ionChange="setCameraFacing($event.detail.value)">
                <ion-select-option value="user">Front camera</ion-select-option>
                <ion-select-option value="environment">Back camera</ion-select-option>
              </ion-select>
            </ion-item>
            <p class="settings-description">These preferences are saved on this device. You can also switch cameras while live or on a call.</p>
            <ion-item button :detail="true" @click="openAccount">
              <ion-icon slot="start" :icon="personOutline" aria-hidden="true" />
              <ion-label>Account<p>Change your email, password, and phone number</p></ion-label>
            </ion-item>
          </template>
          <template v-else-if="activeSetting === 'more' && isAccountSection">
            <ion-item button :detail="false" @click="isAccountSection = false">
              <ion-label color="primary">‹ More Settings</ion-label>
            </ion-item>
            <p v-if="accountLoading" class="settings-description">Loading account details…</p>
            <template v-else>
              <form class="account-form" @submit.prevent="saveAccountEmail">
                <h2>Email</h2>
                <ion-input v-model="accountEmail" type="email" label="Email address" label-placement="stacked" autocomplete="email" required />
                <ion-input v-model="emailPassword" type="password" label="Current password" label-placement="stacked" autocomplete="current-password" required />
                <ion-button type="submit" expand="block" :disabled="accountBusy || !emailPassword">Save email</ion-button>
              </form>
              <form class="account-form" @submit.prevent="saveAccountPhone">
                <h2>Phone number</h2>
                <ion-input v-model="accountPhone" type="tel" label="Phone with country code" label-placement="stacked" placeholder="+639123456789" autocomplete="tel" required />
                <p class="settings-description">Phone number is stored for your account. SMS verification is not available yet.</p>
                <ion-input v-model="phonePassword" type="password" label="Current password" label-placement="stacked" autocomplete="current-password" required />
                <ion-button type="submit" expand="block" :disabled="accountBusy || !phonePassword">Save phone number</ion-button>
              </form>
              <form class="account-form" @submit.prevent="saveAccountPassword">
                <h2>Password</h2>
                <ion-input v-model="currentPassword" type="password" label="Current password" label-placement="stacked" autocomplete="current-password" required />
                <ion-input v-model="newPassword" type="password" label="New password (at least 8 characters)" label-placement="stacked" autocomplete="new-password" :minlength="8" required />
                <ion-input v-model="confirmNewPassword" type="password" label="Confirm new password" label-placement="stacked" autocomplete="new-password" :minlength="8" required />
                <ion-button type="submit" expand="block" :disabled="accountBusy || !currentPassword || !newPassword || !confirmNewPassword">Change password</ion-button>
              </form>
              <section class="account-danger">
                <h2>Account status</h2>
                <p>Deactivation hides your account until an administrator reactivates it. Deletion permanently removes your sign-in details and profile photos; posts and games remain attributed to “Deleted User.”</p>
                <ion-button expand="block" fill="outline" color="warning" :disabled="accountBusy" @click="confirmAccountAction('deactivate')">Deactivate account</ion-button>
                <ion-button expand="block" color="danger" :disabled="accountBusy" @click="confirmAccountAction('delete')">Delete account</ion-button>
              </section>
            </template>
          </template>
        </ion-list>
      </ion-content>
    </ion-modal>

    <ion-modal class="profile-settings-modal" :is-open="isHelpOpen" :can-dismiss="!isSendingHelp" @did-dismiss="isHelpOpen = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Contact Help</ion-title>
          <ion-buttons slot="end">
            <ion-button :disabled="isSendingHelp" @click="isHelpOpen = false">Close</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list inset>
          <ion-item button :detail="true" @click="openHelpRequests">
            <span slot="start" class="help-message-icon">
              <ion-icon :icon="mailOutline" aria-hidden="true" />
              <span v-if="unreadHelpRequestCount > 0" class="help-unread-badge" :aria-label="`${unreadHelpRequestCount} unread help messages`">
                {{ unreadHelpRequestCount > 99 ? '99+' : unreadHelpRequestCount }}
              </span>
            </span>
            <ion-label>
              My Help Requests
              <p>Check replies and review status from the admin team</p>
            </ion-label>
          </ion-item>
        </ion-list>
        <form class="settings-help" @submit.prevent="sendHelp">
          <p>Tell us what you need help with. Your message will be sent to the admin inbox.</p>
          <ion-textarea
            v-model="helpMessage"
            label="Your message"
            label-placement="stacked"
            placeholder="Describe the issue or question..."
            :maxlength="2000"
            :disabled="isSendingHelp"
            :auto-grow="true"
            required
          />
          <p v-if="helpError" class="settings-help__error" role="alert">{{ helpError }}</p>
          <ion-button type="submit" expand="block" :disabled="isSendingHelp || !helpMessage.trim()">
            {{ isSendingHelp ? 'Sending...' : 'Send to Admin' }}
          </ion-button>
        </form>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonInput,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import { alertController } from '@ionic/vue';
import {
  addCircleOutline,
  bookmarkOutline,
  chevronForwardOutline,
  cameraReverseOutline,
  colorPaletteOutline,
  helpCircleOutline,
  languageOutline,
  locationOutline,
  lockClosedOutline,
  logOutOutline,
  mailOutline,
  notificationsOutline,
  personOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import SubPageHeader from '@/components/layout/SubPageHeader.vue';
import { useAuthStore } from '@/stores/auth';
import { useNotificationsStore } from '@/stores/notifications';
import { captureSession, createAuthorizedCall } from '@/stores/authorized';
import {
  changeMyAccountEmail,
  changeMyAccountPassword,
  changeMyAccountPhone,
  deactivateMyAccount,
  deleteMyAccount,
  getMyAccountSettings,
  sendHelpRequest,
} from '@/services/profile-api.service';
import { describeApiError } from '@/utils/api-errors';
import { showNotice } from '@/utils/notice';
import { useSettingsStore } from '@/stores/settings';
import type { UserSettings } from '@/types/user-settings';
import { DISTANCE_FILTERS } from '@/utils/search';
import { useDiscoveryStore } from '@/stores/discovery';
import { useFiltersStore } from '@/stores/filters';
import { useAppPreferencesStore, type AppLanguage, type DisplayMode, type CameraFacing } from '@/stores/app-preferences';
import {
  checkDeviceNotificationPermission,
  requestDeviceNotificationPermission,
  type DeviceNotificationPermission,
} from '@/services/device-notifications.service';

const SETTINGS_ITEMS = [
  { id: 'notifications', label: 'Notification Settings', summary: 'Choose what updates you receive', icon: notificationsOutline },
  { id: 'privacy', label: 'Privacy', summary: 'Control who can view your profile', icon: lockClosedOutline },
  { id: 'location', label: 'Location & Distance', summary: 'Set your nearby games search preferences', icon: locationOutline },
  { id: 'more', label: 'More Settings', summary: 'Language, display, and account options', icon: colorPaletteOutline },
] as const;
const DISTANCE_OPTIONS = DISTANCE_FILTERS.filter((distance): distance is Exclude<typeof distance, null> => distance !== null);

const auth = useAuthStore();
const notifications = useNotificationsStore();
const settings = useSettingsStore();
const appPreferences = useAppPreferencesStore();
const discovery = useDiscoveryStore();
const filters = useFiltersStore();
const router = useRouter();
const isLoggingOut = ref(false);
const unreadHelpRequestCount = computed(() => notifications.unreadHelpRequestCount);
const isHelpOpen = ref(false);
const isSendingHelp = ref(false);
const helpMessage = ref('');
const helpError = ref('');
const activeSetting = ref<(typeof SETTINGS_ITEMS)[number]['id'] | null>(null);
const isAccountSection = ref(false);
const activeSettingTitle = computed(() => isAccountSection.value ? 'Account' : SETTINGS_ITEMS.find((item) => item.id === activeSetting.value)?.label ?? 'Settings');
const accountLoading = ref(false);
const accountBusy = ref(false);
const accountEmail = ref('');
const accountPhone = ref('');
const emailPassword = ref('');
const phonePassword = ref('');
const currentPassword = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');
const notificationPermission = ref<DeviceNotificationPermission>('prompt');
const deviceAlertAction = computed(() =>
  notificationPermission.value === 'granted' ? 'Enabled' : 'Enable',
);

onMounted(() => {
  void settings.load().catch(() => showNotice('Could not load your settings. Please try again.'));
  void notifications.load(true);
});
onIonViewWillEnter(() => void notifications.load(true));

async function openSetting(id: (typeof SETTINGS_ITEMS)[number]['id']): Promise<void> {
  activeSetting.value = id;
  isAccountSection.value = false;
  if (id === 'more') return;
  if (id === 'notifications') notificationPermission.value = await checkDeviceNotificationPermission();
  try {
    await settings.load();
  } catch {
    await showNotice('Could not load your settings. Please try again.');
  }
}

async function enableDeviceAlerts(): Promise<void> {
  notificationPermission.value = await requestDeviceNotificationPermission();
  if (notificationPermission.value === 'granted') {
    await showNotice('Device alerts are enabled.');
  } else if (notificationPermission.value === 'denied') {
    await showNotice('Device alerts were not allowed. You can enable them later in settings.');
  }
}

async function openAccount(): Promise<void> {
  isAccountSection.value = true;
  const isCurrent = captureSession(auth);
  accountLoading.value = true;
  try {
    const account = await createAuthorizedCall(auth)(getMyAccountSettings);
    if (!isCurrent()) return;
    accountEmail.value = account.email;
    accountPhone.value = account.phoneNumber ?? '';
  } catch (error) {
    if (isCurrent()) await showNotice(describeApiError(error, 'Could not load account details.'));
  } finally {
    if (isCurrent()) accountLoading.value = false;
  }
}

async function saveAccountEmail(): Promise<void> {
  await withAccountAction(async (token) => {
    const result = await changeMyAccountEmail(token, accountEmail.value, emailPassword.value);
    accountEmail.value = result.email;
    emailPassword.value = '';
    await auth.loadCurrentUser();
    await showNotice('Email address updated.');
  }, 'Could not update email address.');
}

async function saveAccountPhone(): Promise<void> {
  await withAccountAction(async (token) => {
    const result = await changeMyAccountPhone(token, accountPhone.value, phonePassword.value);
    accountPhone.value = result.phoneNumber ?? '';
    phonePassword.value = '';
    await showNotice('Phone number saved.');
  }, 'Could not save phone number.');
}

async function saveAccountPassword(): Promise<void> {
  if (newPassword.value !== confirmNewPassword.value) {
    await showNotice('The new passwords do not match.');
    return;
  }
  await withAccountAction(async (token) => {
    await changeMyAccountPassword(token, currentPassword.value, newPassword.value);
    currentPassword.value = '';
    newPassword.value = '';
    confirmNewPassword.value = '';
    await showNotice('Password changed.');
  }, 'Could not change password.');
}

async function withAccountAction(action: (token: string) => Promise<void>, fallback: string): Promise<void> {
  const isCurrent = captureSession(auth);
  accountBusy.value = true;
  try {
    await createAuthorizedCall(auth)(action);
  } catch (error) {
    if (isCurrent()) await showNotice(describeApiError(error, fallback));
  } finally {
    if (isCurrent()) accountBusy.value = false;
  }
}

async function confirmAccountAction(action: 'deactivate' | 'delete'): Promise<void> {
  const deleting = action === 'delete';
  const alert = await alertController.create({
    header: deleting ? 'Delete your account?' : 'Deactivate your account?',
    message: deleting
      ? 'This cannot be undone. Your profile details will be removed and your posts and games will show as Deleted User.'
      : 'Your account will be hidden and you will be signed out. Contact an administrator if you need it reactivated.',
    inputs: [
      ...(deleting ? [{ name: 'confirmation', type: 'text' as const, placeholder: 'Type DELETE to continue' }] : []),
      { name: 'currentPassword', type: 'password' as const, placeholder: 'Current password' },
    ],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: deleting ? 'Delete account' : 'Deactivate', role: 'confirm' }],
  });
  await alert.present();
  const { role, data } = await alert.onDidDismiss<{ currentPassword?: string; confirmation?: string }>();
  if (role !== 'confirm') return;
  const password = data?.currentPassword ?? '';
  if (!password || (deleting && data?.confirmation !== 'DELETE')) {
    await showNotice(deleting ? 'Enter your password and type DELETE to confirm.' : 'Enter your current password to continue.');
    return;
  }
  await withAccountAction(async (token) => {
    if (deleting) await deleteMyAccount(token, password);
    else await deactivateMyAccount(token, password);
    await auth.logout();
    activeSetting.value = null;
    isAccountSection.value = false;
    await router.replace('/login');
  }, deleting ? 'Could not delete account.' : 'Could not deactivate account.');
}

function setLanguage(language: AppLanguage): void {
  if (language === 'en' || language === 'fil') appPreferences.setLanguage(language);
}

function setCameraFacing(facing: CameraFacing): void {
  if (facing === 'user' || facing === 'environment') appPreferences.setCameraFacing(facing);
}

function setDisplayMode(mode: DisplayMode): void {
  if (mode === 'light' || mode === 'dark') appPreferences.setDisplayMode(mode);
}

async function saveSetting(changes: Partial<UserSettings>): Promise<void> {
  try {
    await settings.update(changes);
    if (changes.defaultDistanceKm !== undefined) filters.maxDistanceKm = changes.defaultDistanceKm;
    if (changes.useDeviceLocation === false) {
      discovery.clearLocation();
      void discovery.fetchNearbyGames();
    }
  } catch {
    await showNotice('Could not save this setting. Please try again.');
    await settings.load(true).catch(() => undefined);
  }
}

function openHelp(): void {
  helpMessage.value = '';
  helpError.value = '';
  isHelpOpen.value = true;
  void notifications.load(true);
}

async function openHelpRequests(): Promise<void> {
  isHelpOpen.value = false;
  await router.push('/profile/help');
}

async function sendHelp(): Promise<void> {
  const message = helpMessage.value.trim();
  if (!message || isSendingHelp.value) return;
  const isCurrent = captureSession(auth);
  isSendingHelp.value = true;
  helpError.value = '';
  try {
    await createAuthorizedCall(auth)((token) => sendHelpRequest(token, message));
    if (!isCurrent()) return;
    isHelpOpen.value = false;
    void showNotice('Your help message was sent to the admin inbox.');
  } catch (caught) {
    if (isCurrent()) helpError.value = describeApiError(caught, 'Could not send your message.');
  } finally {
    if (isCurrent()) isSendingHelp.value = false;
  }
}

async function logOut(): Promise<void> {
  isLoggingOut.value = true;

  try {
    await auth.logout();
    await router.replace('/login');
  } finally {
    isLoggingOut.value = false;
  }
}
</script>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 640px;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 16px 16px 32px;
}

/* Account card */
.settings-account {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--gora-line);
  border-radius: 16px;
  background: var(--gora-surface);
  box-shadow: var(--gora-shadow);
  color: var(--ion-text-color);
  text-decoration: none;
}

.settings-account__avatar {
  display: grid;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--ion-color-primary), var(--ion-color-primary-tint));
  color: var(--ion-color-primary-contrast);
  font-size: 1.05rem;
  font-weight: 800;
  text-transform: uppercase;
}

.settings-account__text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1px;
}

.settings-account__text strong {
  font-size: 1.02rem;
}

.settings-account__text span,
.settings-account__text small {
  overflow: hidden;
  color: var(--gora-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-account__text span {
  font-size: 0.85rem;
}

.settings-account__text small {
  font-size: 0.76rem;
}

.settings-account__chevron {
  color: var(--gora-muted);
  font-size: 18px;
}

/* Groups */
.settings-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-group__title {
  margin: 0 4px;
  color: var(--gora-muted);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.settings-list {
  overflow: hidden;
  margin: 0;
  padding: 4px 0;
  border: 1px solid var(--gora-line);
  border-radius: 16px;
  background: var(--gora-surface);
  box-shadow: var(--gora-shadow);
}

.settings-list ion-item {
  --background: transparent;
  --background-hover: var(--gora-surface-hover);
  --background-hover-opacity: 1;
  --border-color: var(--gora-line);
  --min-height: 60px;
  --padding-start: 14px;
  --inner-padding-end: 12px;
  font-weight: 650;
}

.settings-list ion-label p {
  margin-top: 2px;
  color: var(--gora-muted);
  font-size: 0.8rem;
  font-weight: 400;
}

/* Colored icon tiles */
.settings-icon {
  display: grid;
  width: 36px;
  height: 36px;
  margin-inline-end: 14px;
  place-items: center;
  border-radius: 10px;
  background: var(--gora-accent-soft);
  color: var(--ion-color-primary);
  font-size: 19px;
}

.settings-icon--blue,
.settings-icon--privacy {
  background: rgba(59, 130, 246, 0.14);
  color: #3b82f6;
}

.settings-icon--green,
.settings-icon--location {
  background: rgba(34, 197, 94, 0.14);
  color: #22c55e;
}

.settings-icon--purple,
.settings-icon--more {
  background: rgba(168, 85, 247, 0.14);
  color: #a855f7;
}

.settings-icon--notifications {
  background: rgba(245, 158, 11, 0.16);
  color: #f59e0b;
}

.settings-icon--admin {
  background: rgba(14, 165, 233, 0.14);
  color: #0ea5e9;
}

.settings-icon--danger {
  background: rgba(239, 91, 91, 0.14);
  color: #ef5b5b;
}

.settings-logout {
  --color: #ef5b5b;
}

.account-form,
.account-danger {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 18px 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--ion-color-step-150, #333);
}

.account-form h2,
.account-danger h2 {
  margin: 4px 0;
  color: var(--ion-text-color);
  font-size: 1rem;
  font-weight: 700;
}

.account-form ion-input {
  --background: var(--ion-card-background, #1c1c1e);
  --padding-start: 12px;
  --padding-end: 12px;
  border: 1px solid var(--ion-color-step-200, #3a3a3c);
  border-radius: 10px;
}

.account-danger {
  border: 1px solid color-mix(in srgb, var(--ion-color-danger) 40%, transparent);
  border-radius: 12px;
  padding: 16px;
}

.account-danger p {
  margin: 0 0 4px;
  color: var(--gora-muted);
  font-size: 0.86rem;
  line-height: 1.45;
}

.settings-help {
  display: grid;
  gap: 18px;
  max-width: 680px;
  margin: 0 auto;
  padding: 20px 16px;
}

.settings-help > p:first-child {
  margin: 0;
  color: var(--gora-muted);
  line-height: 1.5;
}

.settings-help__error {
  margin: 0;
  color: #ff8585;
}

.help-unread-badge {
  position: absolute;
  top: -5px;
  right: -8px;
  display: inline-flex;
  min-width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--ion-color-primary, #ff642e);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1;
}

.help-message-icon {
  position: relative;
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  color: var(--ion-color-primary);
}

.help-message-icon ion-icon {
  font-size: 22px;
}

.settings-description {
  margin: 8px 24px 20px;
  color: var(--gora-muted);
  font-size: 0.84rem;
  line-height: 1.5;
}
</style>
