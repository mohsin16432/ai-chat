import { useState } from 'react';
import { loadSettings, saveSettings as persistSettings } from '../lib/settings';

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings());

  function updateSettings(s) {
    setSettings(s);
    persistSettings(s);
  }

  return { settings, updateSettings };
}