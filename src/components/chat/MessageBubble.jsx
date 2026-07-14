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
  Image as ImageIcon 
} from 'lucide-react';
import CodeBlock from './CodeBlock';

export default function MessageBubble({ 
  message, 
  urlMap, 
  onEdit, 
  onRegenerate, 
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

  // 1. Find the active chat and get the active model configured for it
  const activeChat = chats?.find(c => c.id === activeChatId);
  const activeModel = activeChat?.model || settings?.activeModel;

  // 2. Resolve the model: 
  // - First, try any saved model identifiers on the message itself.
  // - If none exist (which is common during and immediately after streaming), 
  //   fall back directly to the active model of the chat.
  // - Only use 'Assistant' as a last resort if no active model is found.
  const resolvedModel = 
    message.modelUsed || 
    message.model || 
    message.model_name ||
    message.modelId ||
    activeModel || 
    'Assistant';

  const isModelObject = resolvedModel && typeof resolvedModel === 'object';
  
  // 3. Extract the ID and Name
  const modelId = isModelObject 
    ? (resolvedModel.id || resolvedModel.name || '') 
    : (resolvedModel || '');
    
  const modelRawName = isModelObject 
    ? (resolvedModel.name || resolvedModel.id || 'Assistant') 
    : (resolvedModel || 'Assistant');

  // 4. Look up the full model object from settings to retrieve custom icons (like the "Z" logo)
  let matchedModelObject = isModelObject ? resolvedModel : null;
  if (!matchedModelObject && modelId && settings) {
    const modelsList = settings.models || settings.availableModels || [];
    matchedModelObject = modelsList.find(m => m.id === modelId || m.name === modelId);
  }

  // 5. Clean up and format the model name for display
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
    
    // Fallback formatting: remove tags, replace dashes/slashes, capitalize
    let cleanName = name.split(':')[0];
    cleanName = cleanName
      .replace(/[\/-]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
    return cleanName;
  };

  const displayModelName = formatModelName(matchedModelObject?.name || modelRawName);

  // 6. Resolve the model icon URL (prioritizing custom icons from your model objects)
  const getModelIconUrl = () => {
    // First priority: Custom icon from the matched model object (e.g. your custom "Z" logo)
    if (matchedModelObject) {
      if (matchedModelObject.metadata?.image?.url) return matchedModelObject.metadata.image.url;
      if (matchedModelObject.icon) return matchedModelObject.icon;
    }
    
    const idLower = modelId.toLowerCase();
    
    // Fallback presets
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
    if (
      idLower.includes('llama') || 
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

  // Reset image error state when the icon changes
  useEffect(() => {
    setImageError(false);
  }, [modelIcon]);

  // Copy to clipboard helper
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Handle edit submission
  const handleEditSubmit = () => {
    if (editContent.trim() && editContent !== content) {
      onEdit(id, editContent.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className="shrink-0 mt-1 relative group">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden border"
            style={{
              background: isUser ? 'var(--color-accent)' : 'var(--color-surface-hover)',
              color: isUser ? '#ffffff' : 'var(--color-text-faint)',
              borderColor: isUser ? 'var(--color-accent)' : 'var(--color-border)',
            }}
          >
            {isUser ? (
              <User size={14} className="text-white" />
            ) : (modelIcon && !imageError) ? (
              <img 
                src={modelIcon} 
                alt="" 
                className="w-full h-full object-cover" 
                onError={() => setImageError(true)}
              />
            ) : (
              <Bot size={14} />
            )}
          </div>
          
          {/* Tooltip for Model Name (Desktop Only) */}
          {!isUser && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden md:group-hover:block z-50 bg-neutral-900 text-neutral-100 text-[10px] font-medium px-2 py-1 rounded shadow-lg border border-neutral-800 whitespace-nowrap pointer-events-none">
              {displayModelName}
            </div>
          )}
        </div>

        {/* Message Content Area */}
        <div className="flex flex-col gap-1 max-w-full">
          
          {/* Static Model Name Header */}
          {!isUser && (
            <span 
              className="text-[11px] font-medium px-1 mb-0.5 tracking-wide select-none" 
              style={{ color: 'var(--color-text-faint, #888888)' }}
            >
              {displayModelName}
            </span>
          )}
          
          {/* Bubble Body */}
          <div
            className="rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm border overflow-x-auto"
            style={{
              background: isUser ? 'var(--color-accent)' : 'var(--color-surface-alt)',
              color: isUser ? '#ffffff' : 'var(--color-text)',
              borderColor: isUser ? 'var(--color-accent)' : 'var(--color-border)',
            }}
          >
            {isEditing ? (
              <div className="flex flex-col gap-2 min-w-[240px]">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-black/10 text-white rounded-lg p-2 outline-none text-sm border border-white/20 resize-none"
                  rows={3}
                />
                <div className="flex justify-end gap-2 text-xs">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-2.5 py-1 rounded hover:bg-white/10 text-white/80"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleEditSubmit}
                    className="px-2.5 py-1 bg-white text-indigo-900 font-semibold rounded hover:bg-white/90"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                {skill && (
                  <div 
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold mb-2 uppercase tracking-wider border"
                    style={{
                      background: isUser ? 'rgba(255,255,255,0.15)' : 'var(--color-accent-muted)',
                      borderColor: isUser ? 'rgba(255,255,255,0.25)' : 'var(--color-accent)',
                      color: isUser ? '#ffffff' : 'var(--color-text)',
                    }}
                  >
                    /{skill.command}
                  </div>
                )}

                {/* Markdown Content */}
                <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'prose-chat'}`}>
                  <ReactMarkdown
                    components={{
                      code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match;
                        
                        if (!isInline) {
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
                              background: isUser ? 'rgba(0,0,0,0.2)' : '#0d0d0d',
                              border: isUser ? '1px solid rgba(255,255,255,0.15)' : '1px solid var(--color-border)',
                              borderRadius: '4px',
                              padding: '0.15em 0.35em',
                              fontSize: '0.875em',
                              color: isUser ? '#ffffff' : 'inherit'
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

                {/* Attached Files Tray */}
                {files && files.length > 0 && (
                  <div className="mt-3 pt-2 border-t flex flex-wrap gap-2" style={{ borderColor: isUser ? 'rgba(255,255,255,0.15)' : 'var(--color-border)' }}>
                    {files.map((file, idx) => {
                      const isImage = file.type?.startsWith('image/') || urlMap?.[file.id]?.startsWith('data:image/');
                      const fileUrl = urlMap?.[file.id];

                      return (
                        <div 
                          key={idx} 
                          className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs border"
                          style={{
                            background: isUser ? 'rgba(255,255,255,0.1)' : 'var(--color-surface)',
                            borderColor: isUser ? 'rgba(255,255,255,0.2)' : 'var(--color-border)',
                          }}
                        >
                          {isImage ? (
                            <>
                              <ImageIcon size={12} className={isUser ? 'text-white' : 'text-indigo-500'} />
                              {fileUrl ? (
                                <a href={fileUrl} target="_blank" rel="noreferrer" className="underline hover:opacity-80">
                                  Image Attachment
                                </a>
                              ) : (
                                <span>Image Attachment</span>
                              )}
                            </>
                          ) : (
                            <>
                              <FileText size={12} className={isUser ? 'text-white' : 'text-emerald-500'} />
                              <span className="font-medium truncate max-w-[120px]">{file.name || 'Document'}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action Toolbar */}
          <div 
            className="flex items-center gap-2 text-xs opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity mt-1"
            style={{ 
              color: 'var(--color-text-faint)',
              justifyContent: isUser ? 'flex-end' : 'flex-start'
            }}
          >
            <button 
              onClick={handleCopy} 
              className="p-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
              title="Copy message"
            >
              {copied ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>

            {isUser && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)} 
                className="p-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
                title="Edit message"
              >
                <Edit3 size={13} />
              </button>
            )}

            {!isUser && onRegenerate && (
              <button 
                onClick={() => onRegenerate(id)} 
                className="p-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
                title="Regenerate response"
              >
                <RotateCw size={13} />
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}