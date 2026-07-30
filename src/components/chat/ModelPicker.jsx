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

  const filteredModels = useMemo(() => {
    const allModels = settings?.models || [];
    if (!searchQuery.trim()) return allModels;
    const query = searchQuery.toLowerCase();
    return allModels.filter(
      (m) => m.name?.toLowerCase().includes(query) || m.id?.toLowerCase().includes(query)
    );
  }, [settings?.models, searchQuery]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const activeModelIcon = getModelIconUrl(currentModel);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors max-w-[160px] sm:max-w-[220px] cursor-pointer"
        style={{ background: 'transparent', color: 'var(--color-text-muted)' }}
        title="Select model"
      >
        {activeModelIcon ? (
          <img src={activeModelIcon} alt="" className="w-4 h-4 rounded object-cover shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <Sparkles size={13} style={{ color: 'var(--color-text-faint)' }} className="shrink-0" />
        )}
        <span className="truncate">{currentModel ? currentModel.name : 'Select Model'}</span>
        <ChevronDown size={12} className="opacity-50 shrink-0" style={{ color: 'var(--color-text-faint)' }} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-xl border shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in"
          style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface-alt)' }}
        >
          <div className="p-2 border-b flex items-center gap-2 shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <Search size={14} className="opacity-50 ml-1.5 shrink-0" style={{ color: 'var(--color-text-faint)' }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search models…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs outline-none py-1"
              style={{ color: 'var(--color-text)' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[10px] opacity-60 hover:opacity-100 px-1.5 py-0.5 rounded" style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}>
                Clear
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {filteredModels.length > 0 ? (
              filteredModels.map((m) => {
                const isSelected = currentModelId === m.id;
                const modelIcon = getModelIconUrl(m);
                const caps = Object.entries(m.capabilities).filter(([_, v]) => v).map(([k]) => CAPABILITY_ICONS[k] || k).join(' ');

                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelect(m.id)}
                    className="w-full text-left px-3 py-2.5 text-xs flex items-start gap-2.5 hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                    style={{ color: 'var(--color-text)' }}
                  >
                    <div className="mt-0.5 shrink-0">
                      {modelIcon ? (
                        <img src={modelIcon} alt="" className="w-5 h-5 rounded-md object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <Cpu size={13} style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text-faint)' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate flex items-center justify-between gap-1.5">
                        <span className="truncate">{m.name}</span>
                        {isSelected && <Check size={12} style={{ color: 'var(--color-accent)' }} className="shrink-0" />}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-[10px] opacity-40 truncate font-mono">{m.id}</span>
                        {caps && <span className="text-[10px] shrink-0 opacity-60">{caps}</span>}
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

          <div className="p-2 border-t text-[10px] opacity-40 text-center shrink-0" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-faint)' }}>
            {settings?.models?.length || 0} models configured
          </div>
        </div>
      )}
    </div>
  );
}
