import { defineStore } from 'pinia';
import { ref } from 'vue';
import { setAppLanguage } from '@/i18n';

export type DisplayMode = 'dark' | 'light';
export type AppLanguage = 'en' | 'fil';
/** 'user' = front camera, 'environment' = back camera (getUserMedia facingMode). */
export type CameraFacing = 'user' | 'environment';

const STORAGE_KEY = 'gora.app-preferences';

interface AppPreferences {
  displayMode: DisplayMode;
  language: AppLanguage;
  cameraFacing: CameraFacing;
}

const DEFAULT_PREFERENCES: AppPreferences = { displayMode: 'dark', language: 'en', cameraFacing: 'user' };

function readPreferences(): AppPreferences {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(saved) as Partial<AppPreferences>;
    return {
      displayMode: parsed.displayMode === 'light' ? 'light' : 'dark',
      language: parsed.language === 'fil' ? 'fil' : 'en',
      cameraFacing: parsed.cameraFacing === 'environment' ? 'environment' : 'user',
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function applyPreferences(preferences: AppPreferences): void {
  document.documentElement.classList.toggle('gora-theme-light', preferences.displayMode === 'light');
  setAppLanguage(preferences.language);
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    preferences.displayMode === 'light' ? '#f4f6f8' : '#101113',
  );
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', preferences.displayMode);
}

/** The saved default camera, read without Pinia so media helpers can use it. */
export function readCameraFacing(): CameraFacing {
  return readPreferences().cameraFacing;
}

export function initializeAppPreferences(): void {
  applyPreferences(readPreferences());
}

export const useAppPreferencesStore = defineStore('app-preferences', () => {
  const saved = readPreferences();
  const displayMode = ref<DisplayMode>(saved.displayMode);
  const language = ref<AppLanguage>(saved.language);
  const cameraFacing = ref<CameraFacing>(saved.cameraFacing);

  function persist(): void {
    const preferences = { displayMode: displayMode.value, language: language.value, cameraFacing: cameraFacing.value };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Apply the current choice for this session even if browser storage is unavailable.
    }
    applyPreferences(preferences);
  }

  function setDisplayMode(value: DisplayMode): void {
    displayMode.value = value;
    persist();
  }

  function setLanguage(value: AppLanguage): void {
    language.value = value;
    persist();
  }

  function setCameraFacing(value: CameraFacing): void {
    cameraFacing.value = value;
    persist();
  }

  return { displayMode, language, cameraFacing, setDisplayMode, setLanguage, setCameraFacing };
});
