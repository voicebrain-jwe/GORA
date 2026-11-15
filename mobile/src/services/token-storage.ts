import type { CurrentAuthUser } from '@/types/auth';

const TOKEN_KEY = 'gora.accessToken';
/** The last signed-in user, so the app stays signed in when it opens offline. */
const USER_KEY = 'gora.currentUser';

/**
 * The bundled Capacitor WebView keeps this origin's localStorage between app
 * launches and updates. Logout clears both the token and cached identity.
 */
export const tokenStorage = {
  async get(): Promise<string | null> {
    try {
      return readStorage()?.getItem(TOKEN_KEY) ?? null;
    } catch {
      return null;
    }
  },

  async set(token: string): Promise<void> {
    try {
      readStorage()?.setItem(TOKEN_KEY, token);
    } catch {
      /* Keep this session in memory if storage is unavailable. */
    }
  },

  async clear(): Promise<void> {
    try {
      readStorage()?.removeItem(TOKEN_KEY);
      readStorage()?.removeItem(USER_KEY);
    } catch {
      /* Storage may be disabled by the browser. */
    }
  },

  async getUser(): Promise<CurrentAuthUser | null> {
    try {
      const raw = readStorage()?.getItem(USER_KEY);
      const user = raw ? (JSON.parse(raw) as CurrentAuthUser) : null;
      return user && typeof user.id === 'string' ? user : null;
    } catch {
      return null;
    }
  },

  async setUser(user: CurrentAuthUser): Promise<void> {
    try {
      readStorage()?.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* Offline sign-in just won't be available. */
    }
  },
};

function readStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
