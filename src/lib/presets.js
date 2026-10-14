const PRESETS_KEY = 'ai-chat-presets';

export function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota */
  }
  window.dispatchEvent(new CustomEvent('presets-changed', { detail: list }));
}

export function createPreset({ name, content, model }) {
  const list = loadPresets();
  const preset = {
    id: `preset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: (name || '').trim() || 'Untitled preset',
    content: content || '',
    model: model || null,
    created_at: new Date().toISOString(),
  };
  list.push(preset);
  save(list);
  return preset;
}

export function updatePreset(id, patch) {
  const list = loadPresets();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch };
  save(list);
}

export function deletePreset(id) {
  save(loadPresets().filter((p) => p.id !== id));
}

// Insert a preset into the composer. Prefer a direct setter; fall back to an
// event so any open ChatInput can adopt the text.
export function insertPresetIntoComposer(text) {
  window.dispatchEvent(new CustomEvent('insert-preset', { detail: { text } }));
}
