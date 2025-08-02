
import type { AppSettings } from '../types';

const SETTINGS_KEY = 'nexus-settings';

const defaultSettings: AppSettings = {
  disablePublicSquareSync: false,
  syncDurationMs: Infinity, // 'All Time'
};

export const settingsService = {
  loadSettings(): AppSettings {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // Ensure all keys from default settings are present
        return { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    }
    return defaultSettings;
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  },
};
