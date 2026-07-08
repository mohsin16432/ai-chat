import { useState } from 'react';
import { Trash2, Plus, Star } from 'lucide-react';
import { CAPABILITY_KEYS, CAPABILITY_LABELS, CAPABILITY_ICONS, makeModel } from '../../lib/settings';

export default function ModelManager({ models, defaultModelId, onUpdate }) {
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  function addModel() {
    const id = newModelId.trim();
    if (!id) return;
    if (models.find((m) => m.id === id)) return;
    const next = [...models, makeModel(id, newModelName || id)];
    onUpdate(next, defaultModelId || id);
    setNewModelId('');
    setNewModelName('');
    setShowAddForm(false);
  }

  function removeModel(id) {
    const next = models.filter((m) => m.id !== id);
    const newDefault = defaultModelId === id ? next[0]?.id || '' : defaultModelId;
    onUpdate(next, newDefault);
  }

  function toggleCap(id, cap) {
    const next = models.map((m) =>
      m.id === id
        ? { ...m, capabilities: { ...m.capabilities, [cap]: !m.capabilities[cap] } }
        : m
    );
    onUpdate(next, defaultModelId);
  }

  function updateName(id, name) {
    const next = models.map((m) => (m.id === id ? { ...m, name } : m));
    onUpdate(next, defaultModelId);
  }

  function setDefault(id) {
    onUpdate(models, id);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
          Models
        </h3>
        <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
          {models.length} configured
        </span>
      </div>

      {models.length === 0 && (
        <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-faint)' }}>
          No models configured yet
        </p>
      )}

      <div className="space-y-2">
        {models.map((m) => (
          <div
            key={m.id}
            className="rounded-xl p-3 space-y-2.5"
            style={{
              background: 'var(--color-surface)',
              border: `1px solid ${defaultModelId === m.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDefault(m.id)}
                className="shrink-0 p-0.5 rounded"
                title={defaultModelId === m.id ? 'Default model' : 'Set as default'}
                style={{
                  color: defaultModelId === m.id ? 'var(--color-accent)' : 'var(--color-text-faint)',
                }}
              >
                <Star size={14} fill={defaultModelId === m.id ? 'currentColor' : 'none'} />
              </button>

              <input
                value={m.name}
                onChange={(e) => updateName(m.id, e.target.value)}
                className="flex-1 rounded-lg px-2 py-1 text-sm outline-none"
                style={{
                  background: 'var(--color-surface-alt)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
                placeholder="Display name"
              />

              <code
                className="text-xs truncate max-w-[120px] hidden sm:block"
                style={{ color: 'var(--color-text-faint)' }}
                title={m.id}
              >
                {m.id}
              </code>

              <button
                onClick={() => removeModel(m.id)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-faint)' }}
                title="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 pl-7">
              {CAPABILITY_KEYS.map((cap) => (
                <label
                  key={cap}
                  className="flex items-center gap-1.5 text-xs cursor-pointer select-none"
                  style={{ color: m.capabilities[cap] ? 'var(--color-text)' : 'var(--color-text-faint)' }}
                >
                  <input
                    type="checkbox"
                    checked={!!m.capabilities[cap]}
                    onChange={() => toggleCap(m.id, cap)}
                    className="rounded"
                  />
                  <span>{CAPABILITY_ICONS[cap]}</span>
                  {CAPABILITY_LABELS[cap]}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add model */}
      {showAddForm ? (
        <div
          className="rounded-xl p-3 space-y-2"
          style={{
            background: 'var(--color-surface)',
            border: '1px dashed var(--color-border-light)',
          }}
        >
          <input
            autoFocus
            value={newModelId}
            onChange={(e) => setNewModelId(e.target.value)}
            placeholder="Model ID (e.g. gpt-4o)"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addModel();
              if (e.key === 'Escape') setShowAddForm(false);
            }}
          />
          <input
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
            placeholder="Display name (optional)"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addModel();
              if (e.key === 'Escape') setShowAddForm(false);
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={addModel}
              disabled={!newModelId.trim()}
              className="flex-1 rounded-lg py-1.5 text-xs font-medium disabled:opacity-40"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              Add model
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 rounded-lg py-1.5 text-xs"
              style={{ color: 'var(--color-text-faint)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-colors"
          style={{
            border: '1px dashed var(--color-border-light)',
            color: 'var(--color-text-faint)',
          }}
        >
          <Plus size={14} /> Add model
        </button>
      )}
    </div>
  );
}