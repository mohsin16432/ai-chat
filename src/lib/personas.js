const PERSONAS_KEY = 'ai-chat-personas';

export function loadPersonas() {
  try {
    const raw = localStorage.getItem(PERSONAS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(PERSONAS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('personas-changed', { detail: list }));
}

export function createPersona({ name, systemPrompt, model, temperature, top_p, color }) {
  const list = loadPersonas();
  const persona = {
    id: `persona_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || 'Untitled persona',
    systemPrompt: systemPrompt || '',
    model: model || null,
    temperature: temperature ?? 0.7,
    top_p: top_p ?? 1.0,
    color: color || '#7b72ff',
    created_at: new Date().toISOString(),
  };
  list.push(persona);
  save(list);
  return persona;
}

export function updatePersona(id, patch) {
  const list = loadPersonas();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch };
  save(list);
}

export function deletePersona(id) {
  const list = loadPersonas().filter((p) => p.id !== id);
  save(list);
}

export function getPersona(id) {
  return loadPersonas().find((p) => p.id === id) || null;
}

// Persist a full personas array and notify listeners (used by sync).
export function savePersonas(list) {
  save(Array.isArray(list) ? list : []);
}
