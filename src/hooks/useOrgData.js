import { useState, useEffect } from 'react';
import { loadFolders, assignChat } from '../lib/folders';
import { loadPersonas } from '../lib/personas';

// Subscribes to localStorage-backed folders + personas so the sidebar and
// modals stay in sync across components (mirrors the skills-changed pattern).
export function useFoldersState() {
  const [state, setState] = useState(() => loadFolders());

  useEffect(() => {
    const handler = (e) => setState(e.detail || loadFolders());
    window.addEventListener('folders-changed', handler);
    return () => window.removeEventListener('folders-changed', handler);
  }, []);

  return {
    ...state,
    setFolder: (chatId, folderId) => assignChat(chatId, folderId),
  };
}

export function usePersonasState() {
  const [personas, setPersonas] = useState(() => loadPersonas());

  useEffect(() => {
    const handler = (e) => setPersonas(e.detail || loadPersonas());
    window.addEventListener('personas-changed', handler);
    return () => window.removeEventListener('personas-changed', handler);
  }, []);

  return personas;
}
