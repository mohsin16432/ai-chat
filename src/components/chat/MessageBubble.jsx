import ReactMarkdown from 'react-markdown';
import { Loader2, User, Bot, Copy, Check, Pencil, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import CodeBlock from './CodeBlock';

export default function MessageBubble({ message, urlMap, onEdit, onRegenerate }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.content);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function handleEditSubmit() {
    const trimmed = editDraft.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit(message.id, trimmed);
    }
    setEditing(false);
  }

  return (
    <div className={`group flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-1"
        style={{
          background: isUser ? 'var(--color-accent-muted)' : 'var(--color-surface-hover)',
          color: isUser ? 'var(--color-accent-hover)' : 'var(--color-text-faint)',
        }}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className="rounded-2xl px-4 py-3 text-sm leading-relaxed overflow-x-auto"
          style={{
            background: isUser ? 'var(--color-user-bubble)' : 'var(--color-surface-alt)',
            color: isUser ? 'var(--color-user-bubble-text)' : 'var(--color-text)',
            border: isUser ? 'none' : '1px solid var(--color-border)',
          }}
        >
          {/* Attachments */}
          {(message.attachments || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {(message.attachments || []).map((p) =>
                urlMap[p] ? (
                  <img
                    key={p}
                    src={urlMap[p]}
                    alt=""
                    className="max-h-52 rounded-xl object-cover"
                    style={{ border: '1px solid var(--color-border)' }}
                  />
                ) : (
                  <div
                    key={p}
                    className="flex h-24 w-32 items-center justify-center rounded-xl"
                    style={{ background: 'var(--color-surface-hover)' }}
                  >
                    <Loader2 className="animate-spin" size={18} style={{ color: 'var(--color-text-faint)' }} />
                  </div>
                )
              )}
            </div>
          )}

          {/* Content */}
          {editing ? (
            <div className="space-y-2">
              <textarea
                autoFocus
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleEditSubmit();
                  }
                  if (e.key === 'Escape') {
                    setEditing(false);
                    setEditDraft(message.content);
                  }
                }}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-y"
                style={{
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-accent)',
                  minHeight: '3rem',
                }}
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditDraft(message.content);
                  }}
                  className="px-3 py-1 text-xs rounded-lg"
                  style={{ color: 'var(--color-text-faint)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="px-3 py-1 text-xs rounded-lg font-medium"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  Save & Regenerate
                </button>
              </div>
            </div>
          ) : isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="prose prose-sm prose-chat max-w-none">
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    if (!inline && match) {
                      return (
                        <CodeBlock language={match[1]}>
                          {children}
                        </CodeBlock>
                      );
                    }
                    return (
                      <code
                        className={className}
                        style={{
                          background: '#0d0d0d',
                          border: '1px solid var(--color-border)',
                          borderRadius: '4px',
                          padding: '0.15em 0.35em',
                          fontSize: '0.875em',
                        }}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!editing && (
          <div className="mt-1 flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {isUser && onEdit && (
              <button
                onClick={() => {
                  setEditDraft(message.content);
                  setEditing(true);
                }}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-faint)' }}
              >
                <Pencil size={12} /> Edit
              </button>
            )}
            {!isUser && onRegenerate && (
              <button
                onClick={() => onRegenerate(message.id)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-faint)' }}
              >
                <RefreshCw size={12} /> Regenerate
              </button>
            )}
            <button
              onClick={copyMessage}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
              style={{
                color: copied ? 'var(--color-success)' : 'var(--color-text-faint)',
              }}
            >
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}