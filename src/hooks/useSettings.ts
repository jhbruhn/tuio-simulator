import { useState, useEffect } from "react";

interface Settings {
  port: number;
  fps: number;
  showGrid: boolean;
  aspectRatio: number; // Width / Height (e.g., 16/9 = 1.778)
}

const DEFAULT_SETTINGS: Settings = {
  port: 3333,
  fps: 60,
  showGrid: true,
  aspectRatio: 16 / 9, // Default 16:9 aspect ratio
};

const SETTINGS_KEY = "tuio-simulator-settings";

/**
 * Hook for managing persistent settings using localStorage
 *
 * Settings are automatically saved to localStorage and restored on app start
 */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    // Load settings from localStorage on first render
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle missing keys from older versions
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (err) {
      console.error("Failed to load settings from localStorage:", err);
    }
    return DEFAULT_SETTINGS;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error("Failed to save settings to localStorage:", err);
    }
  }, [settings]);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
