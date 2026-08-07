import { useState, useEffect } from 'react';
import { Pencil, Trash2, MessageSquare, Check, Pin, PinOff, MoreHorizontal } from 'lucide-react';

export default function ChatListItem({ chat, isActive, onSelect, onRename, onDelete, onTogglePin, mobile = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.title);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => setDraft(chat.title), [chat.title]);

  useEffect(() => {
    setEditing(false);
    setActionsOpen(false);
    setIsConfirmingDelete(false);
  }, [chat.id]);

  useEffect(() => {
    if (!isConfirmingDelete) return;
    const timer = setTimeout(() => setIsConfirmingDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [isConfirmingDelete]);

  function commit() {
    setEditing(false);
    setActionsOpen(false);
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

  const formattedDate = chat.updated_at
    ? new Date(chat.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null;
  const displayTitle = chat.title && chat.title.trim() && chat.title !== 'New chat' ? chat.title : 'Untitled chat';

  if (mobile) {
    return (
      <div
        className="px-4 py-4"
        style={{
          background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {editing ? (
          <div className="flex items-center gap-2 pl-14">
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
                  setActionsOpen(false);
                }
              }}
              className="flex-1 rounded-2xl px-3 py-2 text-sm outline-none"
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: '#f5f7fb',
                border: '1px solid rgba(255,255,255,0.14)',
              }}
            />
            <button
              onClick={commit}
              className="p-2 rounded-xl"
              style={{ color: '#9ec3ff', background: 'rgba(158,195,255,0.12)' }}
            >
              <Check size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <button onClick={() => onSelect(chat.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <MessageSquare size={18} style={{ color: '#f5f7fb' }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-[17px] font-medium leading-6"
                      style={{ color: '#f5f7fb' }}
                    >
                      {displayTitle}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[13px]" style={{ color: 'rgba(245,247,251,0.62)' }}>
                      <span className="truncate">{chat.pinned ? 'Pinned conversation' : 'Tap to open conversation'}</span>
                      {chat.pinned && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
                          style={{ background: 'rgba(158,195,255,0.14)', color: '#c9dcff' }}
                        >
                          <Pin size={10} />
                          Pinned
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </button>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {formattedDate && (
                <div className="text-[12px]" style={{ color: 'rgba(245,247,251,0.62)' }}>
                  {formattedDate}
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActionsOpen((prev) => !prev);
                  setIsConfirmingDelete(false);
                }}
                className="p-2 rounded-xl"
                style={{
                  color: '#f5f7fb',
                  background: actionsOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                title="Chat actions"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>
        )}

        {(actionsOpen || isConfirmingDelete) && !editing && (
          <div className="mt-3 pl-14">
            <div className="flex flex-wrap gap-2">
              {onTogglePin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(chat.id, !chat.pinned);
                    setActionsOpen(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[13px]"
                  style={{
                    color: '#f5f7fb',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {chat.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  {chat.pinned ? 'Unpin' : 'Pin'}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(true);
                  setActionsOpen(true);
                  setIsConfirmingDelete(false);
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[13px]"
                style={{
                  color: '#f5f7fb',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={handleDeleteClick}
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[13px]"
                style={{
                  color: '#ffd6d6',
                  background: isConfirmingDelete ? 'rgba(255,92,92,0.18)' : 'rgba(255,92,92,0.1)',
                  border: '1px solid rgba(255,92,92,0.22)',
                }}
              >
                <Trash2 size={14} />
                {isConfirmingDelete ? 'Confirm delete' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => !editing && onSelect(chat.id)}
      className="group flex items-center gap-2.5 rounded-2xl px-3 py-2.5 cursor-pointer transition-colors"
      style={{
        background: isActive ? 'color-mix(in srgb, var(--color-surface-alt) 88%, transparent)' : 'transparent',
        border: isActive ? '1px solid color-mix(in srgb, var(--color-border-light) 72%, transparent)' : '1px solid transparent',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'color-mix(in srgb, var(--color-surface) 82%, transparent)';
          e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-border) 56%, transparent)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'transparent';
        }
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
              if (e.key === 'Escape') { setDraft(chat.title); setEditing(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded-md px-2 py-1 text-sm outline-none"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-accent)' }}
          />
          <button onClick={commit} className="p-0.5" style={{ color: 'var(--color-accent)' }}>
            <Check size={14} />
          </button>
        </div>
      ) : (
        <>
          <MessageSquare size={14} style={{ color: 'var(--color-text-faint)' }} className="shrink-0" />
          <span
            className="flex-1 truncate text-sm"
            style={{ color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)' }}
          >
            {displayTitle}
          </span>
          {chat.pinned && (
            <span
              className="shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent-hover)' }}
            >
              <Pin size={10} />
              Pinned
            </span>
          )}
          <div
            className={`flex items-center gap-0.5 transition-opacity ${
              isActive || isConfirmingDelete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {onTogglePin && (
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePin(chat.id, !chat.pinned); }}
                className="p-1.5 rounded-xl transition-colors poe-control"
                style={{ color: chat.pinned ? 'var(--color-danger)' : 'var(--color-text-faint)' }}
                title={chat.pinned ? 'Unpin' : 'Pin'}
              >
                {chat.pinned ? <PinOff size={12} /> : <Pin size={12} />}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="p-1.5 rounded-xl transition-colors poe-control"
              style={{ color: 'var(--color-text-faint)' }}
              title="Rename"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={handleDeleteClick}
              className="p-1.5 rounded-xl transition-colors"
              style={{
                color: isConfirmingDelete ? 'var(--color-danger)' : 'var(--color-text-faint)',
                background: isConfirmingDelete ? 'var(--color-danger-muted)' : 'transparent',
                border: `1px solid ${isConfirmingDelete ? 'color-mix(in srgb, var(--color-danger) 30%, transparent)' : 'transparent'}`,
              }}
              title={isConfirmingDelete ? 'Click again to confirm' : 'Delete'}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
