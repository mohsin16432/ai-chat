import { useState, useRef, useEffect } from 'react';
import { SendHorizonal, Paperclip, X, ImagePlus, Square, Terminal, FileText, Loader2, Globe } from 'lucide-react';
import { loadSkills } from '../../lib/skills';
import { parseDocument } from '../../lib/documentParser';

export default function ChatInput({ onSend, sending, disabled, onCancel }) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState([]); // Will store { type: 'image'|'document', file: File, previewUrl?: string, parsedText?: string }
  const [parsingFile, setParsingFile] = useState(false);
  const [skills, setSkills] = useState([]);
  const [filteredSkills, setFilteredSkills] = useState([]);
  const [showCommands, setShowCommands] = useState(false);
  const [selectedSkillIndex, setSelectedSkillIndex] = useState(0);
  const [activeSkill, setActiveSkill] = useState(null);
  const [webSearchActive, setWebSearchActive] = useState(false); // Web Search state toggle


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

  // Handle uploading and parsing files client-side
  async function handleFileChange(e) {
    const uploadedFiles = Array.from(e.target.files || []);
    e.target.value = ''; // Reset file input path
    if (uploadedFiles.length === 0) return;

    setParsingFile(true);
    const newFiles = [...files];

    for (const file of uploadedFiles) {
      const filename = file.name.toLowerCase();
      const isImage = file.type.startsWith('image/');

      if (isImage) {
        newFiles.push({
          type: 'image',
          file: file,
          name: file.name,
          previewUrl: URL.createObjectURL(file)
        });
      } else {
        // Document parser execution route
        try {
          const parsedText = await parseDocument(file);
          newFiles.push({
            type: 'document',
            file: file,
            name: file.name,
            parsedText: parsedText
          });
        } catch (err) {
          console.warn('Document extraction failed:', err);
          alert(`Could not read document contents for ${file.name}: ${err.message || err}`);
        }
      }
    }

    setFiles(newFiles);
    setParsingFile(false);
  }

  function handleSend() {
    const text = input.trim();
    if ((!text && files.length === 0) || sending || parsingFile) return;
    
    const images = files.filter(f => f.type === 'image').map(f => f.file);
    const documents = files.filter(f => f.type === 'document').map(f => ({
      name: f.name,
      content: f.parsedText
    }));

    // Pass webSearchActive state parameter to App.jsx dispatch trigger
    onSend(text, images, activeSkill, documents, webSearchActive);
    setInput('');
    setFiles([]);
    setActiveSkill(null);
    setWebSearchActive(false); // Reset search state once sent
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

  const removeFile = (idxToRemove) => {
    const targetFile = files[idxToRemove];
    if (targetFile.previewUrl) {
      URL.revokeObjectURL(targetFile.previewUrl); // Prevent browser memory leaks
    }
    setFiles(files.filter((_, idx) => idx !== idxToRemove));
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

      {/* Files Previews & Metadata Tray */}
      {files.length > 0 && (
        <div className="mx-auto max-w-3xl px-4 pb-2">
          <div className="flex gap-2 flex-wrap">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs border"
                style={{
                  background: 'var(--color-surface-alt)',
                  color: 'var(--color-text-muted)',
                  borderColor: 'var(--color-border)',
                }}
              >
                {f.type === 'image' ? (
                  <>
                    <ImagePlus size={12} style={{ color: 'var(--color-accent)' }} />
                    <span className="truncate max-w-[120px]">{f.name}</span>
                  </>
                ) : (
                  <>
                    <FileText size={12} style={{ color: 'var(--color-success)' }} />
                    <span className="truncate max-w-[150px] font-medium">{f.name}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)' }}>READY</span>
                  </>
                )}
                <button
                  onClick={() => removeFile(i)}
                  className="p-0.5 rounded transition-colors hover:bg-[var(--color-surface-hover)]"
                  style={{ color: 'var(--color-text-faint)' }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parsing progress indicator */}
      {parsingFile && (
        <div className="mx-auto max-w-3xl px-4 pb-2 flex items-center gap-2 text-xs" style={{ color: 'var(--color-accent)' }}>
          <Loader2 className="animate-spin" size={12} />
          <span>Analyzing document contents client-side...</span>
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
          {/* Expanded file selector filter targets */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.csv,.json,.txt"
            multiple
            hidden
            onChange={handleFileChange}
          />

           <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 p-2 rounded-xl transition-colors"
            style={{ color: 'var(--color-text-faint)' }}
            title="Attach file (Image, PDF, CSV, JSON, TXT)"
            disabled={parsingFile}
          >
            <Paperclip size={18} />
          </button>

          {/* Web Search Globe Toggle Button */}
          <button
            type="button"
            onClick={() => setWebSearchActive(!webSearchActive)}
            className="shrink-0 p-2 rounded-xl transition-all active:scale-95"
            style={{ 
              color: webSearchActive ? 'var(--color-accent-hover)' : 'var(--color-text-faint)',
              background: webSearchActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: webSearchActive ? '1px solid var(--color-accent)' : '1px solid transparent'
            }}
            title="Toggle Web Search"
          >
            <Globe size={18} className={webSearchActive ? 'animate-pulse' : ''} />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder="Message (type / for commands, attach file)..."
            className="flex-1 resize-none bg-transparent py-2 text-sm outline-none animate-fade-in"
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
              disabled={disabled || parsingFile}
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