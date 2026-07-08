import { useEffect } from 'react';

export function useKeyboardShortcuts(handlers) {
  useEffect(() => {
    function onKeyDown(e) {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + K → Search
      if (isMod && e.key === 'k') {
        e.preventDefault();
        handlers.onSearch?.();
      }

      // Cmd/Ctrl + N → New chat
      if (isMod && e.key === 'n') {
        e.preventDefault();
        handlers.onNewChat?.();
      }

      // Cmd/Ctrl + , → Settings
      if (isMod && e.key === ',') {
        e.preventDefault();
        handlers.onSettings?.();
      }

      // Cmd/Ctrl + E → Export
      if (isMod && e.key === 'e') {
        e.preventDefault();
        handlers.onExport?.();
      }

      // Cmd/Ctrl + Shift + S → Chat settings
      if (isMod && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        handlers.onChatSettings?.();
      }

      // Cmd/Ctrl + B → Toggle sidebar
      if (isMod && e.key === 'b') {
        e.preventDefault();
        handlers.onToggleSidebar?.();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}