import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  User, 
  Bot, 
  Edit3, 
  Copy, 
  RotateCw, 
  CheckCheck, 
  FileText, 
  Image as ImageIcon,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Square
} from 'lucide-react';
import CodeBlock from './CodeBlock';

export default function MessageBubble({ 
  message, 
  urlMap, 
  onEdit, 
  onRegenerate,
  onFeedback,
  settings, 
  chats, 
  activeChatId 
}) {
  const { id, role, content, files, skill } = message;
  const isUser = role === 'user';
  
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  function toggleSpeak() {
    if (!ttsSupported) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    // Strip markdown for cleaner speech
    const plainText = (content || '')
      .replace(/```[\s\S]*?```/g, ' code block ')
      .replace(/[#*`_~\[\]()>|-]/g, '')
      .replace(/\n+/g, '. ')
      .trim();
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }

  // Resolve the model that actually generated THIS message
  const activeChat = chats?.find(c => c.id === activeChatId);
  const fallbackModelId = activeChat?.model || settings?.defaultModelId || settings?.activeModel;

  const resolvedModel = 
    message.modelUsed || 
    message.model || 
    message.model_name ||
    message.modelId ||
    fallbackModelId || 
    'Assistant';

  const isModelObject = resolvedModel && typeof resolvedModel === 'object';
  
  const modelId = isModelObject 
    ? (resolvedModel.id || resolvedModel.name || '') 
    : (resolvedModel || '');
    
  const modelRawName = isModelObject 
    ? (resolvedModel.name || resolvedModel.id || 'Assistant') 
    : (resolvedModel || 'Assistant');

  let matchedModelObject = isModelObject ? resolvedModel : null;
  if (!matchedModelObject && modelId && settings) {
    const modelsList = settings.models || settings.availableModels || [];
    matchedModelObject = modelsList.find(m => m.id === modelId || m.name === modelId);
  }

  const formatModelName = (name) => {
    if (!name || name === 'Assistant') return 'Assistant';
    const lower = name.toLowerCase();
    if (lower.includes('gpt-4o')) return 'GPT-4o';
    if (lower.includes('gpt-4')) return 'GPT-4';
    if (lower.includes('claude-3-5-sonnet')) return 'Claude 3.5 Sonnet';
    if (lower.includes('claude-3')) return 'Claude 3';
    if (lower.includes('gemini-1.5-pro')) return 'Gemini 1.5 Pro';
    if (lower.includes('gemini-1.5-flash')) return 'Gemini 1.5 Flash';
    if (lower.includes('deepseek-coder')) return 'DeepSeek Coder';
    if (lower.includes('deepseek-chat')) return 'DeepSeek Chat';
    if (lower.includes('deepseek')) return 'DeepSeek';
    let cleanName = name.split(':')[0];
    cleanName = cleanName
      .replace(/[\/-]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
    return cleanName;
  };

  const displayModelName = formatModelName(matchedModelObject?.name || modelRawName);

  const getModelIconUrl = () => {
    if (matchedModelObject) {
      if (matchedModelObject.metadata?.image?.url) return matchedModelObject.metadata.image.url;
      if (matchedModelObject.icon) return matchedModelObject.icon;
    }
    const idLower = modelId.toLowerCase();
    if (idLower.includes('gpt') || idLower.includes('openai')) {
      return 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=80&auto=format&fit=crop&q=60';
    }
    if (idLower.includes('claude') || idLower.includes('anthropic')) {
      return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&auto=format&fit=crop&q=60';
    }
    if (idLower.includes('gemini') || idLower.includes('google')) {
      return 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=80&auto=format&fit=crop&q=60';
    }
    if (idLower.includes('deepseek')) {
      return 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=80&auto=format&fit=crop&q=60';
    }
    if (idLower.includes('llama') || idLower.includes('meta')) {
      return 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=80&auto=format&fit=crop&q=60';
    }
    if (
      idLower.includes('ollama') || 
      idLower.includes('mistral') || 
      idLower.includes('phi') || 
      idLower.includes('gemma') ||
      idLower.includes('qwen')
    ) {
      return 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=80&auto=format&fit=crop&q=60';
    }
    return null;
  };

  const modelIcon = getModelIconUrl();

  useEffect(() => {
    setImageError(false);
  }, [modelIcon]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleEditSubmit = () => {
    if (editContent.trim() && editContent !== content) {
      onEdit(id, editContent.trim());
    }
    setIsEditing(false);
  };

  // --- USER MESSAGE: subtle right-aligned pill ---
  if (isUser) {
    return (
      <div className="group flex w-full justify-end">
        <div className="flex flex-col items-end gap-1 max-w-[85%] md:max-w-[75%]">
          {isEditing ? (
            <div className="flex flex-col gap-2 min-w-[240px] w-full">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full rounded-2xl p-3 text-sm outline-none resize-none"
                style={{
                  background: 'var(--color-surface-alt)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border-light)',
                }}
                rows={3}
              />
              <div className="flex justify-end gap-2 text-xs">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEditSubmit}
                  className="px-3 py-1.5 rounded-lg font-medium text-white transition-opacity"
                  style={{ background: 'var(--color-accent)' }}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              {skill && (
                <div 
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold mb-1 uppercase tracking-wider"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  /{skill.command}
                </div>
              )}
              <div
                className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                style={{
                  background: 'var(--color-user-bubble)',
                  color: 'var(--color-text)',
                }}
              >
                <div className="prose prose-sm prose-chat max-w-none">
                  <ReactMarkdown
                    components={{
                      code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match;
                        if (!isInline) {
                          return <CodeBlock language={match[1]}>{children}</CodeBlock>;
                        }
                        return (
                          <code
                            className={className}
                            style={{
                              background: 'rgba(255,255,255,0.08)',
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
                    {content || ''}
                  </ReactMarkdown>
                </div>

                {files && files.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t flex flex-wrap gap-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    {files.map((file, idx) => {
                      const isImage = file.type?.startsWith('image/') || urlMap?.[file.id]?.startsWith('data:image/');
                      const fileUrl = urlMap?.[file.id];
                      return (
                        <div 
                          key={idx} 
                          className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs"
                          style={{ background: 'rgba(255,255,255,0.06)' }}
                        >
                          {isImage ? (
                            <>
                              <ImageIcon size={12} style={{ color: 'var(--color-text-muted)' }} />
                              {fileUrl ? (
                                <a href={fileUrl} target="_blank" rel="noreferrer" className="underline hover:opacity-80" style={{ color: 'var(--color-text-muted)' }}>
                                  Image Attachment
                                </a>
                              ) : (
                                <span style={{ color: 'var(--color-text-muted)' }}>Image Attachment</span>
                              )}
                            </>
                          ) : (
                            <>
                              <FileText size={12} style={{ color: 'var(--color-text-muted)' }} />
                              <span className="font-medium truncate max-w-[120px]" style={{ color: 'var(--color-text-muted)' }}>{file.name || 'Document'}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action toolbar — hover reveal on desktop */}
              <div 
                className="flex items-center gap-1 text-xs opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--color-text-faint)' }}
              >
                <button 
                  onClick={handleCopy} 
                  className="p-1 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors"
                  title="Copy"
                >
                  {copied ? <CheckCheck size={13} style={{ color: 'var(--color-success)' }} /> : <Copy size={13} />}
                </button>
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="p-1 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors"
                  title="Edit"
                >
                  <Edit3 size={13} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- ASSISTANT MESSAGE: clean flowing text, no bubble ---
  return (
    <div className="group flex w-full justify-start">
      <div className="flex gap-3 w-full max-w-[85%] md:max-w-[80%]">
        
        {/* Avatar — small, subtle */}
        <div className="shrink-0 mt-0.5 relative group">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden"
            style={{
              background: 'var(--color-surface-alt)',
              border: '1px solid var(--color-border)',
            }}
          >
            {(modelIcon && !imageError) ? (
              <img 
                src={modelIcon} 
                alt="" 
                className="w-full h-full object-cover" 
                onError={() => setImageError(true)}
              />
            ) : (
              <Bot size={14} style={{ color: 'var(--color-text-faint)' }} />
            )}
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden md:group-hover:block z-50 text-[10px] font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none" style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border-light)' }}>
            {displayModelName}
          </div>
        </div>

        {/* Content — no bubble, just text */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          
          {/* Skill badge */}
          {skill && (
            <div 
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider w-fit"
              style={{
                background: 'var(--color-accent-muted)',
                color: 'var(--color-accent-hover)',
              }}
            >
              /{skill.command}
            </div>
          )}

          {/* Markdown content — clean, no wrapper */}
          <div className="prose prose-sm prose-chat max-w-none text-sm leading-relaxed">
            <ReactMarkdown
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match;
                  if (!isInline) {
                    return <CodeBlock language={match[1]}>{children}</CodeBlock>;
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
              }}
            >
              {content || ''}
            </ReactMarkdown>
          </div>

          {/* Attached files */}
          {files && files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {files.map((file, idx) => {
                const isImage = file.type?.startsWith('image/') || urlMap?.[file.id]?.startsWith('data:image/');
                const fileUrl = urlMap?.[file.id];
                return (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs"
                    style={{
                      background: 'var(--color-surface-alt)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {isImage ? (
                      <>
                        <ImageIcon size={12} style={{ color: 'var(--color-accent-hover)' }} />
                        {fileUrl ? (
                          <a href={fileUrl} target="_blank" rel="noreferrer" className="underline hover:opacity-80" style={{ color: 'var(--color-text-muted)' }}>
                            Image Attachment
                          </a>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>Image Attachment</span>
                        )}
                      </>
                    ) : (
                      <>
                        <FileText size={12} style={{ color: 'var(--color-success)' }} />
                        <span className="font-medium truncate max-w-[120px]" style={{ color: 'var(--color-text-muted)' }}>{file.name || 'Document'}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action toolbar — always visible, subtle */}
          <div 
            className="flex items-center gap-1 text-xs mt-1"
            style={{ color: 'var(--color-text-faint)' }}
          >
            <button 
              onClick={handleCopy} 
              className="p-1 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors"
              title="Copy"
            >
              {copied ? <CheckCheck size={13} style={{ color: 'var(--color-success)' }} /> : <Copy size={13} />}
            </button>
            {onRegenerate && (
              <button 
                onClick={() => onRegenerate(id)} 
                className="p-1 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors"
                title="Regenerate"
              >
                <RotateCw size={13} />
              </button>
            )}
            {onFeedback && (
              <>
                <button
                  onClick={() => onFeedback(id, message.feedback === 'up' ? null : 'up')}
                  className="p-1 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors"
                  style={{ color: message.feedback === 'up' ? 'var(--color-accent-hover)' : undefined }}
                  title="Good response"
                >
                  <ThumbsUp size={13} />
                </button>
                <button
                  onClick={() => onFeedback(id, message.feedback === 'down' ? null : 'down')}
                  className="p-1 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors"
                  style={{ color: message.feedback === 'down' ? 'var(--color-accent-hover)' : undefined }}
                  title="Bad response"
                >
                  <ThumbsDown size={13} />
                </button>
              </>
            )}
            {ttsSupported && (
              <button
                onClick={toggleSpeak}
                className="p-1 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors"
                style={{ color: isSpeaking ? 'var(--color-accent-hover)' : undefined }}
                title={isSpeaking ? 'Stop reading' : 'Read aloud'}
              >
                {isSpeaking ? <Square size={13} /> : <Volume2 size={13} />}
              </button>
            )}
            {message.usage && (message.usage.prompt_tokens || message.usage.completion_tokens) && (
              <span className="text-[10px] ml-1" style={{ color: 'var(--color-text-faint)' }} title={`Prompt: ${message.usage.prompt_tokens || 0} tokens\nCompletion: ${message.usage.completion_tokens || 0} tokens`}>
                {(message.usage.prompt_tokens || 0) + (message.usage.completion_tokens || 0)} tok
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
