import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Pencil, Send, Bookmark } from 'lucide-react';
import { loadPresets, createPreset, updatePreset, deletePreset, insertPresetIntoComposer } from '../../lib/presets';

export default function PresetsModal({ onClose }) {
  const [presets, setPresets] = useState(() => loadPresets());
  const [composerText, setComposerText] = useState('');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null); // { id, name, content }

  useEffect(() => {
    const handler = () => setPresets(loadPresets());
    window.addEventListener('presets-changed', handler);
    return () => window.removeEventListener('presets-changed', handler);
  }, []);

  useEffect(() => {
    function handleComposerText(e) {
      setComposerText(e.detail?.text || '');
    }
    window.addEventListener('composer-text', handleComposerText);
    // Ask the open composer for its current text.
    window.dispatchEvent(new CustomEvent('request-composer-text'));
    return () => window.removeEventListener('composer-text', handleComposerText);
  }, []);

  function handleAddFromComposer() {
    const content = (composerText || '').trim();
    if (!content) {
      alert('Type a prompt in the chat box first, then save it as a preset.');
      return;
    }
    const preset = createPreset({ name: name || content.slice(0, 40), content });
    setName('');
    setPresets(loadPresets());
    window.dispatchEvent(new CustomEvent('presets-changed'));
    return preset;
  }

  function handleSaveEdit() {
    if (!editing) return;
    updatePreset(editing.id, { name: editing.name, content: editing.content });
    setEditing(null);
    setPresets(loadPresets());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-6 space-y-4"
        style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark size={18} style={{ color: 'var(--color-text-faint)' }} />
            <h2 className="font-semibold">Prompt Presets</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-faint)' }}>
            <X size={18} />
          </button>
        </div>

        {editing ? (
          <div className="space-y-3 rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="Preset name"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            />
            <textarea
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              rows={5}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y"
              style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-lg text-sm" style={{ color: 'var(--color-text-muted)' }}>Cancel</button>
              <button onClick={handleSaveEdit} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--color-accent)' }}>Save</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name for current prompt (optional)"
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
              />
              <button
                onClick={handleAddFromComposer}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white transition-colors"
                style={{ background: 'var(--color-accent)' }}
              >
                <Plus size={15} /> Save prompt
              </button>
            </div>

            {presets.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-faint)' }}>
                No presets yet. Type a prompt and tap “Save prompt”.
              </p>
            ) : (
              <div className="space-y-2">
                {presets.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start gap-2 rounded-xl p-3"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                        {p.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { insertPresetIntoComposer(p.content); onClose(); }}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--color-accent-hover)' }}
                        title="Insert into composer"
                      >
                        <Send size={14} />
                      </button>
                      <button
                        onClick={() => setEditing({ id: p.id, name: p.name, content: p.content })}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--color-text-faint)' }}
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => { deletePreset(p.id); setPresets(loadPresets()); }}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--color-danger)' }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
