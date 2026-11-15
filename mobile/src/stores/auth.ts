import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { ApiError } from '@/services/api-client';
import { fetchAuthenticatedUser, loginAccount, registerAccount } from '@/services/auth.service';
import { tokenStorage } from '@/services/token-storage';
import type { AuthResponse, CurrentAuthUser, LoginInput, RegisterInput } from '@/types/auth';
import { normalizeLoginInput, normalizeRegisterInput } from '@/utils/auth';

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<CurrentAuthUser | null>(null);
  const accessToken = ref<string | null>(null);
  const isInitialized = ref(false);
  const sessionVersion = ref(0);
  let restoring: Promise<void> | null = null;

  const isAuthenticated = computed(() => accessToken.value !== null && currentUser.value !== null);

  /** Restores a saved session once per app launch. Safe to call from every navigation. */
  function initialize(): Promise<void> {
    restoring ??= restoreSession().finally(() => {
      isInitialized.value = true;
    });
    return restoring;
  }

  async function restoreSession(): Promise<void> {
    const version = sessionVersion.value;
    const saved = await tokenStorage.get();

    if (!saved || version !== sessionVersion.value) {
      return;
    }

    accessToken.value = saved;
    const cached = await tokenStorage.getUser();
    if (version !== sessionVersion.value) return;
    currentUser.value = cached;

    // The bundled app can open without a server round trip or a request timeout.
    if (cached && typeof navigator !== 'undefined' && navigator.onLine === false) {
      refreshWhenOnline();
      return;
    }

    try {
      await loadCurrentUser();
    } catch {
      if (version !== sessionVersion.value) return;
      // API unreachable (offline): stay signed in with the last known profile and
      // refresh it once the connection is back. Only a 401/403 signs you out.
      if (cached && version === sessionVersion.value) {
        currentUser.value = cached;
        refreshWhenOnline();
      } else if (version === sessionVersion.value) {
        accessToken.value = null;
        currentUser.value = null;
      }
    }
  }

  let waitingForOnline = false;
  let onlineListener: (() => void) | null = null;

  function refreshWhenOnline(): void {
    if (!accessToken.value || waitingForOnline || typeof window === 'undefined') return;
    waitingForOnline = true;
    onlineListener = () => {
      waitingForOnline = false;
      onlineListener = null;
      void loadCurrentUser().catch(() => refreshWhenOnline());
    };
    window.addEventListener('online', onlineListener, { once: true });
  }

  /** Refreshes currentUser from GET /auth/me; drops the session if the token is no longer accepted. */
  async function loadCurrentUser(): Promise<void> {
    const token = accessToken.value;
    const version = sessionVersion.value;
    if (!token) {
      currentUser.value = null;
      return;
    }

    try {
      const user = await fetchAuthenticatedUser(token);
      if (version === sessionVersion.value && token === accessToken.value) {
        currentUser.value = user;
        await tokenStorage.setUser(user);
      }
    } catch (error) {
      if (version !== sessionVersion.value || token !== accessToken.value) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await clearSession();
        return;
      }

      throw error;
    }
  }

  async function login(input: LoginInput): Promise<void> {
    const version = ++sessionVersion.value;
    await startSession(await loginAccount(normalizeLoginInput(input)), version);
  }

  async function register(input: RegisterInput): Promise<void> {
    const version = ++sessionVersion.value;
    await startSession(await registerAccount(normalizeRegisterInput(input)), version);
  }

  /** Client-side logout: forgets the token. The JWT itself stays valid until it expires. */
  async function logout(): Promise<void> {
    await clearSession();
  }

  async function startSession(response: AuthResponse, version: number): Promise<void> {
    if (version !== sessionVersion.value) return;
    accessToken.value = response.accessToken;
    currentUser.value = { ...response.user, profileImageUrl: null, bio: null, city: null };
    await tokenStorage.set(response.accessToken);
    if (version !== sessionVersion.value) return;
    // Login already supplies an authenticated identity. Save it even if /auth/me
    // fails immediately afterwards, so the next offline launch can restore it.
    await tokenStorage.setUser(currentUser.value);
    await loadCurrentUser().catch(() => undefined);
  }

  async function clearSession(): Promise<void> {
    if (onlineListener && typeof window !== 'undefined') window.removeEventListener('online', onlineListener);
    onlineListener = null;
    waitingForOnline = false;
    sessionVersion.value++;
    accessToken.value = null;
    currentUser.value = null;
    await tokenStorage.clear();
  }

  return {
    currentUser,
    accessToken,
    isAuthenticated,
    isInitialized,
    sessionVersion,
    initialize,
    loadCurrentUser,
    login,
    register,
    logout,
  };
});
