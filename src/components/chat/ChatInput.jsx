import { useState, useRef, useEffect } from 'react';
import { SendHorizonal, Paperclip, X, ImagePlus, Square, Terminal } from 'lucide-react';
import { loadSkills } from '../../lib/skills';

export default function ChatInput({ onSend, sending, disabled, onCancel }) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState([]);
  const [skills, setSkills] = useState([]);
  const [filteredSkills, setFilteredSkills] = useState([]);
  const [showCommands, setShowCommands] = useState(false);
  const [selectedSkillIndex, setSelectedSkillIndex] = useState(0);
  const [activeSkill, setActiveSkill] = useState(null);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const commandMenuRef = useRef(null);

  // Load skills initially and subscribe to updates
  useEffect(() => {
    setSkills(loadSkills());

    const handleSkillsChange = () => {
      setSkills(loadSkills());
    };

    window.addEventListener('skills-changed', handleSkillsChange);
    return () => {
      window.removeEventListener('skills-changed', handleSkillsChange);
    };
  }, []);

  // Double-safe backup: refresh skills list when the user focuses the input field
  function handleInputFocus() {
    setSkills(loadSkills());
  }

  // Filter skills list as the user types
  useEffect(() => {
    const lastWord = input.split(/\s+/).pop() || '';
    if (lastWord.startsWith('/')) {
      const query = lastWord.slice(1).toLowerCase();
      const matched = skills.filter(skill => 
        skill.command.toLowerCase().includes(query) ||
        skill.name.toLowerCase().includes(query)
      );
      setFilteredSkills(matched);
      setShowCommands(matched.length > 0);
      setSelectedSkillIndex(0);
    } else {
      setShowCommands(false);
    }
  }, [input, skills]);

  function handleSend() {
    const text = input.trim();
    if ((!text && files.length === 0) || sending) return;
    
    onSend(text, files, activeSkill);
    setInput('');
    setFiles([]);
    setActiveSkill(null);
  }

  const selectSkill = (skill) => {
    const words = input.split(/\s+/);
    words.pop(); // Remove the "/command" chunk
    const baseText = words.join(' ');
    
    setInput(baseText);
    setActiveSkill(skill);
    setShowCommands(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (showCommands && filteredSkills.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSkillIndex(prev => (prev + 1) % filteredSkills.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSkillIndex(prev => (prev - 1 + filteredSkills.length) % filteredSkills.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        selectSkill(filteredSkills[selectedSkillIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommands(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="pb-safe relative">
      
      {/* Floating command dropdown */}
      {showCommands && (
        <div 
          ref={commandMenuRef}
          className="mx-auto max-w-3xl left-4 right-4 absolute bottom-full mb-2 border rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-50 transition-all"
          style={{
            background: 'var(--color-surface-alt)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider border-b" style={{ color: 'var(--color-text-faint)', borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            Available Command Skills
          </div>
          {filteredSkills.map((skill, index) => (
            <button
              key={skill.id}
              onClick={() => selectSkill(skill)}
              className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-b last:border-0"
              style={{
                borderColor: 'var(--color-border)',
                background: index === selectedSkillIndex ? 'var(--color-surface-hover)' : 'transparent',
              }}
            >
              <Terminal size={16} className="mt-0.5" style={{ color: index === selectedSkillIndex ? 'var(--color-accent)' : 'var(--color-text-faint)' }} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>/{skill.command}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                    {skill.name}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>{skill.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="mx-auto max-w-3xl px-4 pb-2">
          <div className="flex gap-2 flex-wrap">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs"
                style={{
                  background: 'var(--color-surface-alt)',
                  color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <ImagePlus size={12} style={{ color: 'var(--color-accent)' }} />
                <span className="truncate max-w-[120px]">{f.name}</span>
                <button
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="p-0.5 rounded transition-colors"
                  style={{ color: 'var(--color-text-faint)' }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Command Tag Indicator */}
      {activeSkill && (
        <div className="mx-auto max-w-3xl px-4 pb-2">
          <div 
            className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs border"
            style={{
              background: 'var(--color-accent-muted)',
              color: 'var(--color-text)',
              borderColor: 'var(--color-accent)',
            }}
          >
            <Terminal size={12} style={{ color: 'var(--color-accent)' }} />
            <span>Active Command: <strong>/{activeSkill.command}</strong> ({activeSkill.name})</span>
            <button
              onClick={() => setActiveSkill(null)}
              className="p-0.5 rounded transition-colors hover:bg-black/20"
              title="Remove active skill"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="mx-auto max-w-3xl px-4 pb-4">
        <div
          className="flex items-end gap-2 rounded-2xl px-3 py-2"
          style={{
            background: 'var(--color-surface-alt)',
            border: '1px solid var(--color-border)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              setFiles([...files, ...Array.from(e.target.files)]);
              e.target.value = '';
            }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 p-2 rounded-xl transition-colors"
            style={{ color: 'var(--color-text-faint)' }}
            title="Attach image"
          >
            <Paperclip size={18} />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder="Message (type / for commands)..."
            className="flex-1 resize-none bg-transparent py-2 text-sm outline-none"
            style={{
              color: 'var(--color-text)',
              maxHeight: '10rem',
              minHeight: '1.5rem',
            }}
          />

          {sending ? (
            <button
              onClick={onCancel}
              className="shrink-0 p-2 rounded-xl transition-all active:scale-95"
              style={{
                background: 'var(--color-danger)',
                color: 'white',
              }}
              title="Stop generating"
            >
              <Square size={18} fill="white" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={disabled}
              className="shrink-0 p-2 rounded-xl transition-all disabled:opacity-30"
              style={{
                background: input.trim() || files.length > 0 ? 'var(--color-accent)' : 'transparent',
                color: input.trim() || files.length > 0 ? 'white' : 'var(--color-text-faint)',
              }}
              title="Send"
            >
              <SendHorizonal size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}