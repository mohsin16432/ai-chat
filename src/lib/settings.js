const SETTINGS_KEY = 'llm-settings';

const CAPABILITY_KEYS = ['text', 'vision', 'imageGen', 'speech'];

const CAPABILITY_LABELS = {
  text: 'Text',
  vision: 'Vision (images in)',
  imageGen: 'Image generation',
  speech: 'Speech',
};

const CAPABILITY_ICONS = {
  text: '📝',
  vision: '👁️',
  imageGen: '🎨',
  speech: '🔊',
};

function makeModel(id, name, capabilities = {}) {
  return {
    id: id.trim(),
    name: (name || id).trim(),
    capabilities: {
      text: true,
      vision: false,
      imageGen: false,
      speech: false,
      ...capabilities,
    },
  };
}

function loadSettings() {
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    raw = {};
  }

  const settings = {
    baseUrl: raw.baseUrl || '',
    apiKey: raw.apiKey || '',
    models: Array.isArray(raw.models)
      ? raw.models.map((m) => makeModel(m.id, m.name, m.capabilities))
      : [],
    defaultModelId: raw.defaultModelId || '',
  };

  // Migration: old shape had a single `model` string
  if (raw.model && settings.models.length === 0) {
    settings.models = [makeModel(raw.model, raw.model, { text: true })];
    settings.defaultModelId = raw.model;
  }

  if (
    settings.models.length > 0 &&
    !settings.models.find((m) => m.id === settings.defaultModelId)
  ) {
    settings.defaultModelId = settings.models[0].id;
  }

  return settings;
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export {
  SETTINGS_KEY,
  CAPABILITY_KEYS,
  CAPABILITY_LABELS,
  CAPABILITY_ICONS,
  makeModel,
  loadSettings,
  saveSettings,
};