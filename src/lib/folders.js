const FOLDERS_KEY = 'ai-chat-folders';

const FOLDER_COLORS = ['#7b72ff', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#a3a3a3'];

export function loadFolders() {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (!raw) return { folders: [], assignments: {} };
    const parsed = JSON.parse(raw);
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      assignments: parsed.assignments || {},
    };
  } catch {
    return { folders: [], assignments: {} };
  }
}

function save(state) {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
  window.dispatchEvent(new CustomEvent('folders-changed', { detail: state }));
}

export function createFolder(name, color) {
  const state = loadFolders();
  const folder = {
    id: `folder_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || 'Untitled folder',
    color: color || FOLDER_COLORS[state.folders.length % FOLDER_COLORS.length],
  };
  state.folders.push(folder);
  save(state);
  return folder;
}

export function renameFolder(folderId, name) {
  const state = loadFolders();
  const f = state.folders.find((x) => x.id === folderId);
  if (f) {
    f.name = name.trim() || f.name;
    save(state);
  }
}

export function deleteFolder(folderId) {
  const state = loadFolders();
  state.folders = state.folders.filter((x) => x.id !== folderId);
  for (const chatId of Object.keys(state.assignments)) {
    if (state.assignments[chatId] === folderId) delete state.assignments[chatId];
  }
  save(state);
}

export function assignChat(chatId, folderId) {
  const state = loadFolders();
  if (folderId) state.assignments[chatId] = folderId;
  else delete state.assignments[chatId];
  save(state);
}

export function folderForChat(chatId) {
  const state = loadFolders();
  return state.assignments[chatId] || null;
}

export function folderById(folderId) {
  if (!folderId) return null;
  const state = loadFolders();
  return state.folders.find((x) => x.id === folderId) || null;
}

export { FOLDER_COLORS };
