import { useState, useEffect } from 'react';
import { Settings, X, RotateCcw } from 'lucide-react';

const DEFAULTS = {
  system_prompt: '',
  temperature: 0.7,
  top_p: 1.0,
};

export default function ChatSettings({ chat, onUpdate, onClose }) {
  const [draft, setDraft] = useState({
    system_prompt: chat?.system_prompt ?? DEFAULTS.system_prompt,
    temperature: chat?.temperature ?? DEFAULTS.temperature,
    top_p: chat?.top_p ?? DEFAULTS.top_p,
  });

  useEffect(() => {
    setDraft({
      system_prompt: chat?.system_prompt ?? DEFAULTS.system_prompt,
      temperature: chat?.temperature ?? DEFAULTS.temperature,
      top_p: chat?.top_p ?? DEFAULTS.top_p,
    });
  }, [chat?.id]);

  function handleSave() {
    onUpdate(chat.id, draft);
    onClose();
  }

  function resetToDefaults() {
    setDraft({ ...DEFAULTS });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-6 space-y-5"
        style={{
          background: 'var(--color-surface-alt)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={18} style={{ color: 'var(--color-text-faint)' }} />
            <h2 className="font-semibold">Chat Settings</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={resetToDefaults}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-faint)' }}
              title="Reset to defaults"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-faint)' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* System Prompt */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            System Prompt
          </label>
          <textarea
            value={draft.system_prompt}
            onChange={(e) => setDraft({ ...draft, system_prompt: e.target.value })}
            placeholder="You are a helpful assistant..."
            rows={4}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-y"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              minHeight: '5rem',
              maxHeight: '12rem',
            }}
          />
          <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
            Instructions that guide the AI's behavior for this chat. Leave empty for default behavior.
          </p>
        </div>

        {/* Temperature */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Temperature
            </label>
            <span className="text-xs font-mono" style={{ color: 'var(--color-accent-hover)' }}>
              {draft.temperature.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={draft.temperature}
            onChange={(e) => setDraft({ ...draft, temperature: parseFloat(e.target.value) })}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-faint)' }}>
            <span>Precise (0)</span>
            <span>Balanced (0.7)</span>
            <span>Creative (2)</span>
          </div>
        </div>

        {/* Top P */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Top P
            </label>
            <span className="text-xs font-mono" style={{ color: 'var(--color-accent-hover)' }}>
              {draft.top_p.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={draft.top_p}
            onChange={(e) => setDraft({ ...draft, top_p: parseFloat(e.target.value) })}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-faint)' }}>
            <span>Focused (0)</span>
            <span>Balanced (1)</span>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
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