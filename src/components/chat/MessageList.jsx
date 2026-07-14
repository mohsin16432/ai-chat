import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, Bot, ArrowDown, Sparkles } from 'lucide-react';
import MessageBubble from './MessageBubble';
import CodeBlock from './CodeBlock';
import { getActiveModel } from '../../lib/models';

export default function MessageList({ messages, urlMap, streamingText, onEditMessage, onRegenerate, settings, chats, activeChatId }) {
  const containerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollBadge, setShowScrollBadge] = useState(false);

  // Detect manual scrolling
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    
    // Check if user is within 80px of the bottom
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 80;
    
    setIsAtBottom(nearBottom);

    // Hide the badge if they manually scroll back to the bottom
    if (nearBottom) {
      setShowScrollBadge(false);
    }
  };

  // Scroll to bottom helper
  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setIsAtBottom(true);
      setShowScrollBadge(false);
    }
  };

  // Force scroll to bottom on a new user message
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
      scrollToBottom();
    }
  }, [messages.length]);

  // Handle streaming token updates
  useEffect(() => {
    const isStreaming = streamingText !== null;
    if (isStreaming) {
      if (isAtBottom) {
        // User is at the bottom, keep scrolling down
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      } else {
        // User has scrolled up! Show the floating badge instead of snapping
        setShowScrollBadge(true);
      }
    } else {
      setShowScrollBadge(false);
    }
  }, [streamingText, isAtBottom]);

  // Helper to resolve the model icon URL or return a fallback (matching ModelPicker logic)
  const getModelIconUrl = (model) => {
    if (model?.metadata?.image?.url) {
      return model.metadata.image.url;
    }
    if (model?.icon) {
      return model.icon;
    }
    const id = model?.id?.toLowerCase() || '';
    if (id.startsWith('openai/') || id.includes('gpt')) {
      return 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=40&auto=format&fit=crop&q=60';
    }
    if (id.startsWith('anthropic/') || id.includes('claude')) {
      return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=40&auto=format&fit=crop&q=60';
    }
    if (id.startsWith('google/') || id.includes('gemini')) {
      return 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=40&auto=format&fit=crop&q=60';
    }
    if (id.startsWith('meta-llama/') || id.includes('llama')) {
      return 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=40&auto=format&fit=crop&q=60';
    }
    if (id.includes('deepseek')) {
      return 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=40&auto=format&fit=crop&q=60';
    }
    return null;
  };

  // Resolve active model and its icon for the streaming/thinking bubble
  const activeModel = settings && chats && activeChatId ? getActiveModel(settings, chats, activeChatId) : null;
  const modelIconUrl = activeModel ? getModelIconUrl(activeModel) : null;
  const modelName = activeModel?.name || activeModel?.id || 'Assistant';

  return (
    <div className="flex-1 min-h-0 relative flex flex-col">
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {/* Increased bottom padding to pb-16 to leave a clean gap before the bottom input bar */}
        <div className="mx-auto max-w-5xl space-y-6 p-4 pb-16">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              urlMap={urlMap}
              onEdit={onEditMessage}
              onRegenerate={onRegenerate}
              settings={settings}
              chats={chats}
              activeChatId={activeChatId}
            />
          ))}

          {streamingText !== null && (
            <div className="flex gap-3 w-full">
              {/* Streaming Avatar with Tooltip */}
              <div className="relative group shrink-0 mt-1">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden"
                  style={{
                    background: 'var(--color-surface-hover)',
                    color: 'var(--color-text-faint)',
                  }}
                >
                  {modelIconUrl ? (
                    <img 
                      src={modelIconUrl} 
                      alt="" 
                      className="w-full h-full object-cover" 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : activeModel ? (
                    <Sparkles size={14} className="text-amber-500" />
                  ) : (
                    <Bot size={14} />
                  )}
                </div>

                {/* Model Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 bg-neutral-900 text-neutral-100 text-[10px] font-medium px-2 py-1 rounded shadow-lg border border-neutral-800 whitespace-nowrap">
                  {modelName}
                </div>
              </div>

              {/* Increased width threshold for streaming bubble */}
              <div className="w-full max-w-[95%] md:max-w-[92%]">
                <div
                  className="w-full rounded-2xl px-4 py-3 text-sm leading-relaxed overflow-x-auto"
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
                              return <CodeBlock language={match[1]}>{children}</CodeBlock>;
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
        </div>
      </div>

      {/* FLOATING ACTION: Smart Scroll Release Badge */}
      {showScrollBadge && streamingText !== null && (
        <button 
          onClick={scrollToBottom}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg flex items-center gap-2 border border-indigo-400/30 animate-bounce cursor-pointer z-50"
        >
          <ArrowDown size={14} />
          New messages below
        </button>
      )}
    </div>
  );
}