import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, Cpu, Sparkles } from 'lucide-react';
import { CAPABILITY_ICONS } from '../../lib/settings';
import { getModelById } from '../../lib/models';

export default function ModelPicker({ settings, chats, activeChatId, onChangeModel }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const currentModelId = activeChat?.model || settings.defaultModelId;
  const currentModel = getModelById(settings, currentModelId);

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    const allModels = settings?.models || [];
    if (!searchQuery.trim()) return allModels;
    const query = searchQuery.toLowerCase();
    return allModels.filter(
      (m) =>
        m.name?.toLowerCase().includes(query) ||
        m.id?.toLowerCase().includes(query)
    );
  }, [settings?.models, searchQuery]);

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when opening dropdown
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = (modelId) => {
    onChangeModel(modelId);
    setIsOpen(false);
  };

  // Helper to resolve the model icon URL or return a fallback
  const getModelIconUrl = (model) => {
    // 1. Check the nested metadata image URL from your API first
    if (model?.metadata?.image?.url) {
      return model.metadata.image.url;
    }

    // 2. Check if the API returned a direct icon URL (e.g. OpenRouter fallback)
    if (model?.icon) {
      return model.icon;
    }

    // 3. Dynamic fallback heuristics based on model ID prefixes
    const id = model?.id?.toLowerCase() || '';
    if (id.startsWith('openai/') || id.includes('gpt')) {
      return 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=40&auto=format&fit=crop&q=60'; // OpenAI style
    }
    if (id.startsWith('anthropic/') || id.includes('claude')) {
      return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=40&auto=format&fit=crop&q=60'; // Anthropic style
    }
    if (id.startsWith('google/') || id.includes('gemini')) {
      return 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=40&auto=format&fit=crop&q=60'; // Google style
    }
    if (id.startsWith('meta-llama/') || id.includes('llama')) {
      return 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=40&auto=format&fit=crop&q=60'; // Meta style
    }
    if (id.includes('deepseek')) {
      return 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=40&auto=format&fit=crop&q=60'; // DeepSeek style
    }
    
    return null;
  };

  const activeModelIcon = getModelIconUrl(currentModel);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors max-w-[180px] sm:max-w-[240px] cursor-pointer"
        style={{
          background: 'var(--color-surface-hover)',
          color: 'var(--color-text-muted)',
          borderColor: 'var(--color-border)',
        }}
        title="Select model for this chat"
      >
        {activeModelIcon ? (
          <img 
            src={activeModelIcon} 
            alt="" 
            className="w-4.5 h-4.5 rounded-md object-cover shrink-0" 
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <Sparkles size={13} className="text-amber-500 shrink-0" />
        )}
        <span className="truncate">
          {currentModel ? currentModel.name : 'Select Model'}
        </span>
        <ChevronDown size={12} className="opacity-60 shrink-0" style={{ color: 'var(--color-text-faint)' }} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-2xl border shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-surface-alt)',
          }}
        >
          {/* Search Input Box */}
          <div
            className="p-2 border-b flex items-center gap-2 shrink-0"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Search size={14} className="opacity-50 ml-1.5 shrink-0" style={{ color: 'var(--color-text-faint)' }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs outline-none py-1"
              style={{ color: 'var(--color-text)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[10px] opacity-60 hover:opacity-100 px-1.5 py-0.5 rounded transition-colors"
                style={{
                  background: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Models List Container */}
          <div className="max-h-60 overflow-y-auto py-1 divide-y divide-neutral-100/5 dark:divide-neutral-800/40">
            {filteredModels.length > 0 ? (
              filteredModels.map((m) => {
                const isSelected = currentModelId === m.id;
                const modelIcon = getModelIconUrl(m);
                
                // Extract and format capability icons
                const caps = Object.entries(m.capabilities)
                  .filter(([_, v]) => v)
                  .map(([k]) => CAPABILITY_ICONS[k] || k)
                  .join(' ');

                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelect(m.id)}
                    className="w-full text-left px-3.5 py-2.5 text-xs flex items-start gap-2.5 hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                    style={{ color: 'var(--color-text)' }}
                  >
                    <div className="mt-0.5 shrink-0">
                      {modelIcon ? (
                        <img 
                          src={modelIcon} 
                          alt="" 
                          className="w-5 h-5 rounded-md object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Cpu size={13} className={isSelected ? "text-indigo-500" : "opacity-40"} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate flex items-center justify-between gap-1.5">
                        <span className="truncate">{m.name}</span>
                        {isSelected && (
                          <Check size={12} className="text-indigo-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-[10px] opacity-40 truncate font-mono">
                          {m.id}
                        </span>
                        {caps && (
                          <span className="text-[10px] shrink-0 opacity-70" title="Capabilities">
                            {caps}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs opacity-50" style={{ color: 'var(--color-text-faint)' }}>
                No models match your search
              </div>
            )}
          </div>

          {/* Footer showing total count */}
          <div
            className="p-2 border-t text-[10px] opacity-40 text-center shrink-0"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-faint)',
            }}
          >
            {settings?.models?.length || 0} models configured
          </div>
        </div>
      )}
    </div>
  );
}