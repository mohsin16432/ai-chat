import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, Bot, ArrowDown } from 'lucide-react';
import MessageBubble from './MessageBubble';
import CodeBlock from './CodeBlock';

export default function MessageList({ messages, urlMap, streamingText, onEditMessage, onRegenerate }) {
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

  return (
    <div className="flex-1 min-h-0 relative flex flex-col">
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="mx-auto max-w-3xl space-y-6 p-4 pb-8">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              urlMap={urlMap}
              onEdit={onEditMessage}
              onRegenerate={onRegenerate}
            />
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