import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, Bot } from 'lucide-react';
import MessageBubble from './MessageBubble';
import CodeBlock from './CodeBlock';

export default function MessageList({ messages, urlMap, streamingText }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 p-4 pb-8">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} urlMap={urlMap} />
        ))}

        {streamingText !== null && (
          <div className="flex gap-3">
            <div
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-1"
              style={{
                background: 'var(--color-surface-hover)',
                color: 'var(--color-text-faint)',
              }}
            >
              <Bot size={14} />
            </div>
            <div className="max-w-[85%] md:max-w-[75%]">
              <div
                className="rounded-2xl px-4 py-3 text-sm leading-relaxed overflow-x-auto"
                style={{
                  background: 'var(--color-surface-alt)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {!streamingText ? (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-text-faint)' }}>
                    <Loader2 className="animate-spin" size={14} />
                    <span className="text-xs">Thinking…</span>
                  </div>
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
                      {streamingText}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}