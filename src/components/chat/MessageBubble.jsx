import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  User, 
  Sparkles, 
  Bot, 
  Edit3, 
  Check, 
  Copy, 
  RotateCw, 
  CheckCheck, 
  FileText, 
  Image as ImageIcon 
} from 'lucide-react';
import CodeBlock from './CodeBlock';
import { getActiveModel } from '../../lib/models';

export default function MessageBubble({ 
  message, 
  urlMap, 
  onEdit, 
  onRegenerate, 
  settings, 
  chats, 
  activeChatId 
}) {
  const { id, role, content, files, skill, modelUsed } = message;
  const isUser = role === 'user';
  
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [copied, setCopied] = useState(false);

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

  // Helper to resolve model icon
  const getModelIconUrl = () => {
    if (modelUsed?.metadata?.image?.url) return modelUsed.metadata.image.url;
    if (modelUsed?.icon) return modelUsed.icon;
    
    const modelId = modelUsed?.id?.toLowerCase() || '';
    if (modelId.startsWith('openai/') || modelId.includes('gpt')) {
      return 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=40&auto=format&fit=crop&q=60';
    }
    if (modelId.startsWith('anthropic/') || modelId.includes('claude')) {
      return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=40&auto=format&fit=crop&q=60';
    }
    if (modelId.startsWith('google/') || modelId.includes('gemini')) {
      return 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=40&auto=format&fit=crop&q=60';
    }
    return null;
  };

  const modelIcon = getModelIconUrl();
  const modelName = modelUsed?.name || modelUsed?.id || 'Assistant';

  return (
    /* Align container: justify-end for user, justify-start for model */
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      
      {/* Bubble wrapper: flex-row-reverse for user to put avatar on the right */}
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
            ) : modelIcon ? (
              <img 
                src={modelIcon} 
                alt="" 
                className="w-full h-full object-cover" 
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <Bot size={14} />
            )}
          </div>
          
          {/* Tooltip for Model Name */}
          {!isUser && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 bg-neutral-900 text-neutral-100 text-[10px] font-medium px-2 py-1 rounded shadow-lg border border-neutral-800 whitespace-nowrap">
              {modelName}
            </div>
          )}
        </div>

        {/* Message Content Area */}
        <div className="flex flex-col gap-1.5 max-w-full">
          
          {/* Bubble Body */}
          <div
            className="rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm border overflow-x-auto"
            style={{
              background: isUser ? 'var(--color-accent)' : 'var(--color-surface-alt)',
              color: isUser ? '#ffffff' : 'var(--color-text)',
              borderColor: isUser ? 'var(--color-accent)' : 'var(--color-border)',
            }}
          >
            {/* Inline Editing Mode (User only) */}
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
                {/* Active Skill Badge inside bubble */}
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
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        if (!inline && match) {
                          return <CodeBlock language={match[1]}>{children}</CodeBlock>;
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
                    {content}
                  </ReactMarkdown>
                </div>

                {/* Attached Files Tray inside bubble */}
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

          {/* Action Toolbar below the bubble */}
          <div 
            className={`flex items-center gap-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'justify-end' : 'justify-start'}`}
            style={{ color: 'var(--color-text-faint)' }}
          >
            {/* Copy Button */}
            <button 
              onClick={handleCopy} 
              className="p-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
              title="Copy message"
            >
              {copied ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>

            {/* Edit Button (User only) */}
            {isUser && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)} 
                className="p-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
                title="Edit message"
              >
                <Edit3 size={13} />
              </button>
            )}

            {/* Regenerate Button (Assistant only, and only if not the first system greeting) */}
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