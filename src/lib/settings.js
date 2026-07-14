export const CAPABILITY_KEYS = ['text', 'vision', 'imageGen', 'speech'];

export const CAPABILITY_LABELS = {
  text: 'Text',
  vision: 'Vision',
  imageGen: 'Image Gen',
  speech: 'Speech'
};

export const CAPABILITY_ICONS = {
  text: '📝',
  vision: '👁️',
  imageGen: '🎨',
  speech: '🗣️'
};

export function makeModel(id, name, capabilities = { text: true, vision: false, imageGen: false, speech: false }) {
  return { id, name, capabilities };
}

const STORAGE_KEY = 'app_settings';

const DEFAULT_SETTINGS = {
  baseUrl: '',
  apiKey: '',
  defaultModelId: '',
  models: [], // Start with an empty array as requested
  searchProvider: 'duckduckgo',
  searchApiKey: '',
};

/**
 * Loads settings from localStorage with fallback to defaults
 */
export function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        models: Array.isArray(parsed.models) ? parsed.models : []
      };
    }
  } catch (e) {
    console.error("Failed to load settings from localStorage:", e);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Saves settings to localStorage
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings to localStorage:", e);
  }
  return settings;
}