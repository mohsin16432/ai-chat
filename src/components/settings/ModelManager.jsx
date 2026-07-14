import { useState } from 'react';
import { Trash2, Plus, Star, RefreshCw, AlertTriangle, Trash } from 'lucide-react';
import { CAPABILITY_KEYS, CAPABILITY_LABELS, CAPABILITY_ICONS, makeModel } from '../../lib/settings';
import { discoverModels } from '../../lib/models';

export default function ModelManager({ models, defaultModelId, onUpdate, baseUrl, apiKey }) {
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

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

  async function handleDiscoverModels() {
    if (!baseUrl) {
      setDiscoveryError('Please provide a Base URL in connection configurations first.');
      return;
    }
    setDiscoveryError('');
    setIsDiscovering(true);
    try {
      const discovered = await discoverModels(baseUrl, apiKey);
      if (discovered.length === 0) {
        throw new Error('No models returned from provider.');
      }
      
      // Merge discovered models, preserving custom display names of existing ones
      const merged = [...models];
      discovered.forEach((dm) => {
        const existingIndex = merged.findIndex((m) => m.id === dm.id);
        if (existingIndex > -1) {
          // Keep existing name but update capabilities
          merged[existingIndex] = {
            ...merged[existingIndex],
            capabilities: dm.capabilities
          };
        } else {
          merged.push(dm);
        }
      });

      const nextDefault = defaultModelId || merged[0]?.id || '';
      onUpdate(merged, nextDefault);
    } catch (err) {
      setDiscoveryError(err.message || 'Failed to auto-discover models. Check CORS or API Key.');
    } finally {
      setIsDiscovering(false);
    }
  }

  function removeModel(id) {
    const next = models.filter((m) => m.id !== id);
    const newDefault = defaultModelId === id ? next[0]?.id || '' : defaultModelId;
    onUpdate(next, newDefault);
  }

  function clearAllModels() {
    onUpdate([], '');
    setConfirmClear(false);
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

      {/* Discovery Error Alert */}
      {discoveryError && (
        <div className="p-3 bg-rose-950/40 border border-rose-900 rounded-xl text-xs text-rose-300 flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{discoveryError}</span>
        </div>
      )}

      {/* Action Buttons: Discover & Clear All */}
      <div className="flex gap-2">
        <button
          onClick={handleDiscoverModels}
          disabled={isDiscovering}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-colors border cursor-pointer"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
        >
          <RefreshCw size={14} className={isDiscovering ? 'animate-spin' : ''} />
          {isDiscovering ? 'Discovering...' : 'Discover models'}
        </button>

        {models.length > 0 && (
          <div className="relative">
            {confirmClear ? (
              <div className="flex gap-1">
                <button
                  onClick={clearAllModels}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Confirm Clear?
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="border text-xs px-3 py-2.5 rounded-xl cursor-pointer"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-faint)',
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-medium transition-colors border border-rose-900/30 text-rose-400 hover:bg-rose-950/20 cursor-pointer"
              >
                <Trash size={14} />
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      {models.length === 0 && (
        <p className="text-sm py-6 text-center border border-dashed rounded-xl" style={{ color: 'var(--color-text-faint)', borderColor: 'var(--color-border)' }}>
          No models configured yet. Use the discover button above or add one manually.
        </p>
      )}

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
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
                className="shrink-0 p-0.5 rounded cursor-pointer"
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
                className="text-xs truncate max-w-[120px] hidden sm:block font-mono"
                style={{ color: 'var(--color-text-faint)' }}
                title={m.id}
              >
                {m.id}
              </code>

              <button
                onClick={() => removeModel(m.id)}
                className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-rose-500/10 text-rose-400"
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
                    className="rounded cursor-pointer"
                  />
                  <span>{CAPABILITY_ICONS[cap]}</span>
                  {CAPABILITY_LABELS[cap]}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add model manually */}
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
              className="flex-1 rounded-lg py-1.5 text-xs font-medium disabled:opacity-40 cursor-pointer"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              Add model
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 rounded-lg py-1.5 text-xs cursor-pointer"
              style={{ color: 'var(--color-text-faint)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-colors cursor-pointer"
          style={{
            border: '1px dashed var(--color-border-light)',
            color: 'var(--color-text-faint)',
          }}
        >
          <Plus size={14} /> Add model manually
        </button>
      )}
    </div>
  );
}