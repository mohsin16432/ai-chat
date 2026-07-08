import { useState, useEffect, useRef } from 'react';
import { Search, X, MessageSquare, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function SearchModal({ onSelectChat, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        // Search in chat titles
        const { data: chatResults } = await supabase
          .from('chats')
          .select('id, title, updated_at')
          .ilike('title', `%${query.trim()}%`)
          .order('updated_at', { ascending: false })
          .limit(10);

        // Search in message content
        const { data: msgResults } = await supabase
          .from('messages')
          .select('id, chat_id, content, role, created_at')
          .ilike('content', `%${query.trim()}%`)
          .order('created_at', { ascending: false })
          .limit(20);

        // Group message results by chat and fetch chat titles
        const chatIds = [...new Set((msgResults || []).map((m) => m.chat_id))];
        let chatMap = {};
        if (chatIds.length > 0) {
          const { data: chatData } = await supabase
            .from('chats')
            .select('id, title')
            .in('id', chatIds);
          (chatData || []).forEach((c) => { chatMap[c.id] = c.title; });
        }

        const combined = [];

        // Add chat title matches
        (chatResults || []).forEach((c) => {
          combined.push({
            type: 'chat',
            chatId: c.id,
            chatTitle: c.title,
            preview: c.title,
            date: c.updated_at,
          });
        });

        // Add message matches (dedupe by chat if already in title results)
        const titleChatIds = new Set((chatResults || []).map((c) => c.id));
        (msgResults || []).forEach((m) => {
          combined.push({
            type: 'message',
            chatId: m.chat_id,
            chatTitle: chatMap[m.chat_id] || 'Untitled',
            preview: m.content.substring(0, 150),
            role: m.role,
            date: m.created_at,
            alsoInTitles: titleChatIds.has(m.chat_id),
          });
        });

        setResults(combined);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

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
                    {highlightMatch(r.chatTitle, query)}
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