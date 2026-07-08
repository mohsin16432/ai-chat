import { useState } from 'react';
import { X, Settings } from 'lucide-react';
import ModelManager from './ModelManager';

export default function SettingsModal({ settings, onSave, onClose }) {
  const [draft, setDraft] = useState({
    baseUrl: settings.baseUrl || '',
    apiKey: settings.apiKey || '',
    defaultModelId: settings.defaultModelId || '',
    models: settings.models || [],
  });

  function handleModelsUpdate(models, defaultModelId) {
    setDraft({ ...draft, models, defaultModelId });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-5"
        style={{
          background: 'var(--color-surface-alt)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={18} style={{ color: 'var(--color-text-faint)' }} />
            <h2 className="font-semibold">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-faint)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* General section */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
            General
          </h3>
          <label className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Base URL
            <input
              value={draft.baseUrl}
              onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
              placeholder="https://api.example.com/v1"
              className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            />
          </label>
          <label className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>
            API Key
            <input
              type="password"
              value={draft.apiKey}
              onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
              className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            />
          </label>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--color-border)' }} />

        {/* Models section */}
        <ModelManager
          models={draft.models}
          defaultModelId={draft.defaultModelId}
          onUpdate={handleModelsUpdate}
        />

        <button
          onClick={() => {
            onSave(draft);
            onClose();
          }}
          className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors"
          style={{
            background: 'var(--color-accent)',
            color: 'white',
          }}
        >
          Save settings
        </button>
      </div>
    </div>
  );
}