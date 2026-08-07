import { useState, useEffect, useRef } from 'react';
import { Search, X, MessageSquare, ArrowRight } from 'lucide-react';
import { useChatSearch } from '../../hooks/useChatSearch';

export default function SearchModal({ onSelectChat, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const { results, searching } = useChatSearch(query);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function highlightMatch(text, q) {
    if (!q.trim()) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-transparent font-semibold" style={{ color: 'var(--color-accent-hover)' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  function getChatTitle(title) {
    return title && title.trim() && title !== 'New chat' ? title : 'Untitled chat';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden"
        style={{
          background: 'var(--color-surface-alt)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <Search size={18} style={{ color: 'var(--color-text-faint)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats and messages…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--color-text)' }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded"
              style={{ color: 'var(--color-text-faint)' }}
            >
              <X size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-xs"
            style={{ color: 'var(--color-text-faint)' }}
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {!query.trim() && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-faint)' }}>
              Type to search across all chats
            </p>
          )}

          {query.trim() && results.length === 0 && !searching && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-faint)' }}>
              No results found
            </p>
          )}

          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.chatId}-${i}`}
              onClick={() => {
                onSelectChat(r.chatId);
                onClose();
              }}
              className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
              style={{ borderBottom: '1px solid var(--color-border)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <MessageSquare
                size={16}
                className="shrink-0 mt-0.5"
                style={{ color: 'var(--color-text-faint)' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                    {highlightMatch(getChatTitle(r.chatTitle), query)}
                  </span>
                  {r.type === 'message' && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: 'var(--color-surface-hover)',
                        color: 'var(--color-text-faint)',
                      }}
                    >
                      {r.role}
                    </span>
                  )}
                </div>
                {r.type === 'message' && (
                  <p
                    className="text-xs mt-0.5 line-clamp-2"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {highlightMatch(r.preview, query)}
                  </p>
                )}
              </div>
              <ArrowRight size={14} className="shrink-0 mt-1" style={{ color: 'var(--color-text-faint)' }} />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 flex items-center gap-4 text-xs"
          style={{
            borderTop: '1px solid var(--color-border)',
            color: 'var(--color-text-faint)',
          }}
        >
          <span><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>↵</kbd> to select</span>
          <span><kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>ESC</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
