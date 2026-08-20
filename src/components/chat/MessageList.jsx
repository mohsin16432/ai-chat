import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, Bot, ArrowDown, Sparkles } from 'lucide-react';
import MessageBubble from './MessageBubble';
import CodeBlock from './CodeBlock';
import { getActiveModel } from '../../lib/models';

function normalizeMarkdownTables(content) {
  if (!content || !content.includes('|')) return content;
  let result = content;
  result = result.replace(/\|\s+\|---/g, '|\n|---');
  result = result.replace(/\|\s+\|(?=\s*[A-Za-z])/g, '|\n|');
  return result;
}

export default function MessageList({ messages, urlMap, streamingText, onEditMessage, onRegenerate, onFeedback, settings, chats, activeChatId }) {
  const containerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollBadge, setShowScrollBadge] = useState(false);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 80;
    setIsAtBottom(nearBottom);
    if (nearBottom) setShowScrollBadge(false);
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
      setIsAtBottom(true);
      setShowScrollBadge(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
      scrollToBottom();
    }
  }, [messages.length]);

  // Scroll to bottom when switching chats — messages load async (cache then
  // Supabase fetch), so keep retrying until content settles.
  const prevChatIdRef = useRef(activeChatId);
  const needScrollRef = useRef(false);
  useEffect(() => {
    if (activeChatId !== prevChatIdRef.current) {
      prevChatIdRef.current = activeChatId;
      needScrollRef.current = true;
    }
    if (needScrollRef.current && messages.length > 0 && containerRef.current) {
      const scrollNow = () => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      };
      scrollNow();
      requestAnimationFrame(scrollNow);
      const t = setTimeout(() => { needScrollRef.current = false; }, 400);
      return () => clearTimeout(t);
    }
  }, [activeChatId, messages]);

  useEffect(() => {
    const isStreaming = streamingText !== null;
    if (isStreaming) {
      if (isAtBottom) {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      } else {
        setShowScrollBadge(true);
      }
    } else {
      setShowScrollBadge(false);
    }
  }, [streamingText, isAtBottom]);

  const getModelIconUrl = (model) => {
    if (model?.metadata?.image?.url) return model.metadata.image.url;
    if (model?.icon) return model.icon;
    const id = model?.id?.toLowerCase() || '';
    if (id.startsWith('openai/') || id.includes('gpt')) return 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=40&auto=format&fit=crop&q=60';
    if (id.startsWith('anthropic/') || id.includes('claude')) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=40&auto=format&fit=crop&q=60';
    if (id.startsWith('google/') || id.includes('gemini')) return 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=40&auto=format&fit=crop&q=60';
    if (id.startsWith('meta-llama/') || id.includes('llama')) return 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=40&auto=format&fit=crop&q=60';
    if (id.includes('deepseek')) return 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=40&auto=format&fit=crop&q=60';
    return null;
  };

  const activeModel = settings && chats && activeChatId ? getActiveModel(settings, chats, activeChatId) : null;
  const modelIconUrl = activeModel ? getModelIconUrl(activeModel) : null;
  const modelName = activeModel?.name || activeModel?.id || 'Assistant';

  return (
    <div className="flex-1 min-h-0 relative flex flex-col">
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl space-y-6 md:space-y-8 px-4 md:px-6 py-4 md:py-8 pb-10 md:pb-18">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              urlMap={urlMap}
              onEdit={onEditMessage}
              onRegenerate={onRegenerate}
              onFeedback={onFeedback}
              settings={settings}
              chats={chats}
              activeChatId={activeChatId}
            />
          ))}

          {streamingText !== null && (
            <div className="flex gap-3 md:gap-3.5 w-full">
              {/* Streaming avatar */}
              <div className="relative group shrink-0 mt-0.5">
                <div
                  className="w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center overflow-hidden"
                  style={{
                    background: 'var(--color-surface-alt)',
                    border: '1px solid color-mix(in srgb, var(--color-border) 88%, transparent)',
                  }}
                >
                  {modelIconUrl ? (
                    <img src={modelIconUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : activeModel ? (
                    <Sparkles size={14} style={{ color: 'var(--color-accent-hover)' }} />
                  ) : (
                    <Bot size={14} style={{ color: 'var(--color-text-faint)' }} />
                  )}
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 text-[10px] font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none" style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border-light)' }}>
                  {modelName}
                </div>
              </div>

              {/* Streaming content — no bubble, clean text */}
              <div className="flex-1 min-w-0 pt-0.5">
                {!streamingText ? (
                  <div className="flex items-center gap-2 py-2" style={{ color: 'var(--color-text-faint)' }}>
                    <Loader2 className="animate-spin" size={14} />
                    <span className="text-sm">Thinking…</span>
                  </div>
                ) : (
                  <div className="prose prose-sm prose-chat max-w-none text-[14px] md:text-[15px] leading-7">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          const childStr = typeof children === 'string' ? children : String(children || '');
                          const isBlock = !!match || childStr.includes('\n');
                          if (isBlock) {
                            return <CodeBlock language={match ? match[1] : ''}>{children}</CodeBlock>;
                          }
                          return (
                            <code
                              className={className}
                              style={{
                                background: 'var(--color-surface-hover)',
                                border: '1px solid var(--color-border-light)',
                                borderRadius: '5px',
                                padding: '0.15em 0.35em',
                                fontSize: '0.875em',
                              }}
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                        table({ children }) {
                          return (
                            <div className="overflow-x-auto -mx-1 px-1 my-3">
                              <table className="w-full text-xs border-collapse">{children}</table>
                            </div>
                          );
                        },
                        th({ children }) {
                          return <th className="border border-[var(--color-border)] px-2.5 py-1.5 text-left font-semibold whitespace-nowrap" style={{ background: 'var(--color-surface-alt)' }}>{children}</th>;
                        },
                        td({ children }) {
                          return <td className="border border-[var(--color-border-light)] px-2.5 py-1.5 align-top">{children}</td>;
                        },
                      }}
                    >
                      {normalizeMarkdownTables(streamingText)}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scroll-to-bottom badge */}
      {showScrollBadge && streamingText !== null && (
        <button 
          onClick={scrollToBottom}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium py-2 px-4 rounded-full shadow-lg flex items-center gap-2 cursor-pointer z-50"
          style={{
            background: 'color-mix(in srgb, var(--color-surface-alt) 96%, transparent)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <ArrowDown size={14} />
          New messages below
        </button>
      )}
    </div>
  );
}
