import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Pencil, Sparkles, MessageSquarePlus } from 'lucide-react';
import { loadPersonas, createPersona, updatePersona, deletePersona } from '../../lib/personas';

const PALETTE = ['#7b72ff', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export default function PersonasModal({ models, defaultModelId, onClose, onUse }) {
  const [personas, setPersonas] = useState(() => loadPersonas());
  const [editing, setEditing] = useState(null); // persona object or 'new'
  const [draft, setDraft] = useState(emptyDraft());

  useEffect(() => {
    const handler = (e) => setPersonas(e.detail || loadPersonas());
    window.addEventListener('personas-changed', handler);
    return () => window.removeEventListener('personas-changed', handler);
  }, []);

  function emptyDraft() {
    return { name: '', systemPrompt: '', model: '', temperature: 0.7, top_p: 1.0, color: PALETTE[0] };
  }

  function startNew() {
    setDraft(emptyDraft());
    setEditing('new');
  }

  function startEdit(p) {
    setDraft({ ...p });
    setEditing(p.id);
  }

  function save() {
    if (editing === 'new') {
      createPersona(draft);
    } else {
      updatePersona(editing, draft);
    }
    setEditing(null);
    setDraft(emptyDraft());
  }

  function remove(id) {
    deletePersona(id);
  }

  const modelName = (id) => models.find((m) => m.id === id)?.name || (id || 'Default model');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-6 space-y-5"
        style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} style={{ color: 'var(--color-accent-hover)' }} />
            <h2 className="font-semibold">Personas</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-faint)' }}>
            <X size={18} />
          </button>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Name</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Senior Reviewer"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>System Prompt</label>
              <textarea
                value={draft.systemPrompt}
                onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
                rows={4}
                placeholder="You are a helpful assistant that..."
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-y"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', minHeight: '5rem' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Model (optional)</label>
                <select
                  value={draft.model}
                  onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                >
                  <option value="">Default</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Color</label>
                <div className="flex gap-1.5 pt-1.5">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setDraft({ ...draft, color: c })}
                      className="w-6 h-6 rounded-full"
                      style={{ background: c, outline: draft.color === c ? '2px solid var(--color-text)' : 'none', outlineOffset: 2 }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Temperature</label>
                  <span className="text-xs font-mono" style={{ color: 'var(--color-accent-hover)' }}>{draft.temperature.toFixed(2)}</span>
                </div>
                <input type="range" min="0" max="2" step="0.05" value={draft.temperature}
                  onChange={(e) => setDraft({ ...draft, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Top P</label>
                  <span className="text-xs font-mono" style={{ color: 'var(--color-accent-hover)' }}>{draft.top_p.toFixed(2)}</span>
                </div>
                <input type="range" min="0" max="1" step="0.05" value={draft.top_p}
                  onChange={(e) => setDraft({ ...draft, top_p: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500" />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={save} className="flex-1 rounded-xl py-2.5 text-sm font-medium" style={{ background: 'var(--color-accent)', color: 'white' }}>Save</button>
              <button onClick={() => { setEditing(null); setDraft(emptyDraft()); }} className="px-4 rounded-xl py-2.5 text-sm" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {personas.length === 0 && (
                <div className="text-sm text-center py-8" style={{ color: 'var(--color-text-faint)' }}>
                  No personas yet. Create a reusable assistant (system prompt + model + temperature).
                </div>
              )}
              {personas.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center" style={{ background: p.color + '22', color: p.color }}>
                    <Sparkles size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs truncate" style={{ color: 'var(--color-text-faint)' }}>{modelName(p.model)} · Temp {p.temperature.toFixed(2)}</div>
                  </div>
                  {onUse && (
                    <button onClick={() => onUse(p)} className="p-1.5 rounded-lg" style={{ color: 'var(--color-accent-hover)' }} title="Start chat with this persona">
                      <MessageSquarePlus size={16} />
                    </button>
                  )}
                  <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-faint)' }} title="Edit">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => remove(p.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--color-danger)' }} title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button onClick={startNew} className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
              <Plus size={16} /> New persona
            </button>
          </>
        )}
      </div>
    </div>
  );
}
