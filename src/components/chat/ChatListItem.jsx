import { useState, useEffect } from 'react';
import { Pencil, Trash2, MessageSquare, Check } from 'lucide-react';

export default function ChatListItem({ chat, isActive, onSelect, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.title);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => setDraft(chat.title), [chat.title]);

  useEffect(() => {
    if (!isConfirmingDelete) return;
    const timer = setTimeout(() => setIsConfirmingDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [isConfirmingDelete]);

  function commit() {
    setEditing(false);
    if (draft.trim() && draft.trim() !== chat.title) onRename(chat.id, draft);
    else setDraft(chat.title);
  }

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (isConfirmingDelete) {
      onDelete(chat.id);
      setIsConfirmingDelete(false);
    } else {
      setIsConfirmingDelete(true);
    }
  };

  return (
    <div
      onClick={() => !editing && onSelect(chat.id)}
      className="group flex items-center gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer transition-colors"
      style={{
        background: isActive ? 'var(--color-surface-active)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = 'var(--color-surface-hover)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      {editing ? (
        <div className="flex-1 flex items-center gap-1">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setDraft(chat.title);
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded-lg px-2 py-1 text-sm outline-none"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-accent)',
            }}
          />
          <button onClick={commit} className="p-0.5" style={{ color: 'var(--color-accent)' }}>
            <Check size={14} />
          </button>
        </div>
      ) : (
        <>
          <MessageSquare size={15} style={{ color: 'var(--color-text-faint)' }} className="shrink-0" />
          <span
            className="flex-1 truncate text-sm"
            style={{ color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)' }}
          >
            {chat.title || 'New chat'}
          </span>
          <div
            className={`flex items-center gap-0.5 transition-opacity ${
              isActive || isConfirmingDelete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="p-1 rounded-md transition-colors"
              style={{ color: 'var(--color-text-faint)' }}
              title="Rename"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={handleDeleteClick}
              className="p-1 rounded-md transition-colors"
              style={{
                color: isConfirmingDelete ? 'var(--color-danger)' : 'var(--color-text-faint)',
                background: isConfirmingDelete ? 'var(--color-danger-muted)' : 'transparent',
              }}
              title={isConfirmingDelete ? 'Click again to confirm' : 'Delete'}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}