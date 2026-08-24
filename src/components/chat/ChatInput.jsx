import { useState, useRef, useEffect } from 'react';
import { SendHorizonal, Paperclip, X, ImagePlus, Square, Terminal, FileText, Loader2, Globe, Mic, MicOff } from 'lucide-react';
import { loadSkills } from '../../lib/skills';
import { parseDocument } from '../../lib/documentParser';

// Web Speech API support check
const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

export default function ChatInput({ onSend, sending, disabled, onCancel }) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState([]);
  const [parsingFile, setParsingFile] = useState(false);
  const [skills, setSkills] = useState([]);
  const [filteredSkills, setFilteredSkills] = useState([]);
  const [showCommands, setShowCommands] = useState(false);
  const [selectedSkillIndex, setSelectedSkillIndex] = useState(0);
  const [activeSkill, setActiveSkill] = useState(null);
  const [webSearchActive, setWebSearchActive] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef(null);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const commandMenuRef = useRef(null);

  useEffect(() => {
    setSkills(loadSkills());
    const handleSkillsChange = () => setSkills(loadSkills());
    window.addEventListener('skills-changed', handleSkillsChange);
    return () => window.removeEventListener('skills-changed', handleSkillsChange);
  }, []);

  function handleInputFocus() {
    setSkills(loadSkills());
  }

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

  async function handleFileChange(e) {
    const uploadedFiles = Array.from(e.target.files || []);
    e.target.value = '';
    if (uploadedFiles.length === 0) return;

    setParsingFile(true);
    const newFiles = [...files];

    for (const file of uploadedFiles) {
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        newFiles.push({ type: 'image', file: file, name: file.name, previewUrl: URL.createObjectURL(file) });
      } else {
        try {
          const parsedText = await parseDocument(file);
          newFiles.push({ type: 'document', file: file, name: file.name, parsedText: parsedText });
        } catch (err) {
          console.warn('Document extraction failed:', err);
          alert(`Could not read document contents for ${file.name}: ${err.message || err}`);
        }
      }
    }

    setFiles(newFiles);
    setParsingFile(false);
  }

  const micPermsPluginRef = useRef(null);
  function getMicPermsPlugin() {
    if (micPermsPluginRef.current) return micPermsPluginRef.current;
    try {
      const w = typeof window !== 'undefined' ? window : null;
      if (!w) return null;
      const Cap = w.Capacitor || (w.capCustomPlugins && w.capCustomPlugins.Capacitor) || null;
      const Plugins = (Cap && typeof Cap.Plugins === 'object' && Cap.Plugins) || null;
      if (Plugins && Plugins.MicPermissions) {
        micPermsPluginRef.current = Plugins.MicPermissions;
        return Plugins.MicPermissions;
      }
      const candidates = [];
      if (Cap && typeof Cap.registerPlugin === 'function') candidates.push([Cap, Cap.registerPlugin]);
      if (Plugins && typeof Plugins.registerPlugin === 'function') candidates.push([Plugins, Plugins.registerPlugin]);
      for (const [ctx, fn] of candidates) {
        try {
          const MicPerms = fn.call(ctx, 'MicPermissions', {}, {
            name: 'MicPermissions',
            methods: {
              checkAudioPermission: { name: 'checkAudioPermission', rtype: 'promise' },
              requestAudioPermission: { name: 'requestAudioPermission', rtype: 'promise' },
            },
          });
          if (MicPerms) {
            micPermsPluginRef.current = MicPerms;
            return MicPerms;
          }
        } catch (_) {}
      }
    } catch (_) {}
    return null;
  }

  async function requestAndroidMicPermission() {
    try {
      const MicPerms = getMicPermsPlugin();
      if (!MicPerms) return { ok: true, skip: true, reason: 'no-plugin' };
      try {
        const checkRes = await MicPerms.checkAudioPermission();
        if (checkRes && checkRes.granted) return { ok: true, skip: false, result: checkRes };
        const reqRes = await MicPerms.requestAudioPermission();
        if (!reqRes || !reqRes.granted) {
          return { ok: false, skip: false, result: reqRes, denied: true };
        }
        return { ok: true, skip: false, result: reqRes };
      } catch (innerErr) {
        return { ok: true, skip: true, reason: 'call-throw', error: innerErr?.message || String(innerErr) };
      }
    } catch (err) {
      return { ok: true, skip: true, reason: 'throw', error: err?.message || String(err) };
    }
  }

  function toggleMic() {
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this Android WebView.');
      return;
    }
    if (isListening) {
      const current = recognitionRef.current;
      recognitionRef.current = null;
      setIsListening(false);
      try {
        current && typeof current.stop === 'function' && current.stop();
      } catch (_) {}
      return;
    }

    const isAndroid = /android/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '');
    const baseTextRef = { value: input.replace(/\u200b/g, '').trim() };
    const accRef = { cycleFinal: '', cycleInterim: '', onstartFired: false };
    const session = {
      running: true,
      restartCount: 0,
      lastStartAttemptedAt: 0,
      current: null,
    };
    recognitionRef.current = { stop: () => { session.running = false; try { session.current && session.current.stop(); } catch (_) {} } };
    setIsListening(true);

    function applyInput(nextFinal, nextInterim) {
      const combined = nextFinal + nextInterim;
      setInput(baseTextRef.value + (baseTextRef.value && combined ? ' ' : '') + combined);
    }

    function startOne() {
      if (!session.running) return;
      if (!SpeechRecognition) return;
      const recognition = new SpeechRecognition();
      if (!isAndroid) {
        recognition.continuous = true;
        recognition.interimResults = true;
      } else {
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
      }
      if (typeof recognition.lang !== 'undefined') recognition.lang = (navigator && navigator.language) || 'en-US';
      session.current = recognition;
      let localFinal = '';
      let localInterim = '';

      recognition.onstart = () => {
        accRef.onstartFired = true;
        localFinal = '';
        localInterim = '';
        accRef.cycleInterim = '';
        applyInput(accRef.cycleFinal, accRef.cycleInterim);
      };
      recognition.onresult = (event) => {
        let finalAdded = '';
        let interimTotal = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = (event.results[i][0] && event.results[i][0].transcript) || '';
          if (event.results[i].isFinal) {
            finalAdded += t;
            localFinal += t;
          } else {
            interimTotal += t;
          }
        }
        localInterim = interimTotal;
        accRef.cycleInterim = localInterim;
        if (finalAdded) {
          accRef.cycleFinal += (accRef.cycleFinal && finalAdded ? ' ' : '') + finalAdded;
          accRef.cycleInterim = localInterim;
        }
        applyInput(accRef.cycleFinal, accRef.cycleInterim);
      };
      recognition.onerror = (event) => {
        const code = (event && event.error) || 'unknown';
        if (!accRef.onstartFired) {
          if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'permission-denied') {
            alert('Microphone permission is required for voice input. Please allow the mic permission in the Android app settings.');
            session.running = false;
          } else if (code === 'network' || code === 'not-supportable' || code === 'language-not-supported' || code === 'audio-capture') {
            alert(`Voice input failed: ${code}`);
            session.running = false;
          } else if (code === 'no-speech' || code === 'aborted') {
            // transient; onend will clean up or restart
          } else {
            session.running = false;
          }
        } else if (code === 'network' || code === 'audio-capture') {
          alert(`Voice input stopped: ${code}`);
          session.running = false;
        }
      };
      recognition.onend = () => {
        if (localInterim) {
          const appended = localInterim;
          accRef.cycleFinal += (accRef.cycleFinal && appended ? ' ' : '') + appended;
          localInterim = '';
          accRef.cycleInterim = '';
          applyInput(accRef.cycleFinal, accRef.cycleInterim);
        }
        if (!session.running || !isAndroid) {
          applyInput(accRef.cycleFinal, '');
          recognitionRef.current = null;
          setIsListening(false);
          return;
        }
        session.restartCount += 1;
        if (session.restartCount > 40) {
          recognitionRef.current = null;
          setIsListening(false);
          return;
        }
        const now = Date.now();
        const wait = Math.max(200, 420 - (now - (session.lastStartAttemptedAt || 0)));
        setTimeout(() => {
          if (!session.running) {
            recognitionRef.current = null;
            setIsListening(false);
            return;
          }
          session.lastStartAttemptedAt = Date.now();
          try {
            startOne();
          } catch (_) {
            recognitionRef.current = null;
            setIsListening(false);
          }
        }, wait);
      };
      try {
        session.lastStartAttemptedAt = Date.now();
        recognition.start();
      } catch (err) {
        alert(`Could not start voice input: ${(err && err.message) || String(err)}`);
        recognitionRef.current = null;
        setIsListening(false);
      }
    }

    (async () => {
      const permRes = await requestAndroidMicPermission();
      if (permRes && permRes.denied) {
        alert('Microphone permission is required for voice input. Please allow the mic permission in the Android app settings.');
        recognitionRef.current = null;
        setIsListening(false);
        return;
      }
      try {
        startOne();
      } catch (_) {
        recognitionRef.current = null;
        setIsListening(false);
      }
    })();
  }

  function handleSend() {
    const text = input.replace(/\u200b/g, '').trim();
    if ((!text && files.length === 0) || sending || parsingFile) return;
    
    const images = files.filter(f => f.type === 'image').map(f => f.file);
    const documents = files.filter(f => f.type === 'document').map(f => ({ name: f.name, content: f.parsedText }));

    onSend(text, images, activeSkill, documents, webSearchActive);
    setInput('');
    setFiles([]);
    setActiveSkill(null);
    setWebSearchActive(false);
  }

  const selectSkill = (skill) => {
    const words = input.split(/\s+/);
    words.pop();
    const baseText = words.join(' ');
    setInput(baseText);
    setActiveSkill(skill);
    setShowCommands(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (showCommands && filteredSkills.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedSkillIndex(prev => (prev + 1) % filteredSkills.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedSkillIndex(prev => (prev - 1 + filteredSkills.length) % filteredSkills.length); return; }
      if (e.key === 'Enter') { e.preventDefault(); selectSkill(filteredSkills[selectedSkillIndex]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setShowCommands(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const removeFile = (idxToRemove) => {
    const targetFile = files[idxToRemove];
    if (targetFile.previewUrl) URL.revokeObjectURL(targetFile.previewUrl);
    setFiles(files.filter((_, idx) => idx !== idxToRemove));
  };

  return (
    <div
      className="relative px-4 md:px-6 pt-3"
      style={{
        background: 'transparent',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
      }}
    >

      {/* Command dropdown */}
      {showCommands && (
        <div
          ref={commandMenuRef}
          className="mx-auto max-w-4xl left-4 right-4 absolute bottom-full mb-3 border rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-50 animate-fade-in"
          style={{ background: 'color-mix(in srgb, var(--color-surface-alt) 96%, transparent)', borderColor: 'var(--color-border-light)' }}
        >
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider border-b" style={{ color: 'var(--color-text-faint)', borderColor: 'var(--color-border)' }}>
            Commands
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
                  <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>/{skill.command}</span>
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
        <div className="mx-auto max-w-4xl pb-3">
          <div className="flex gap-2 flex-wrap">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs" style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                {f.type === 'image' ? (
                  <><ImagePlus size={12} style={{ color: 'var(--color-accent-hover)' }} /><span className="truncate max-w-[120px]">{f.name}</span></>
                ) : (
                  <><FileText size={12} style={{ color: 'var(--color-success)' }} /><span className="truncate max-w-[150px] font-medium">{f.name}</span><span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)' }}>READY</span></>
                )}
                <button onClick={() => removeFile(i)} className="p-0.5 rounded transition-colors hover:bg-[var(--color-surface-hover)]" style={{ color: 'var(--color-text-faint)' }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parsing indicator */}
      {parsingFile && (
        <div className="mx-auto max-w-4xl pb-2 flex items-center gap-2 text-xs" style={{ color: 'var(--color-accent-hover)' }}>
          <Loader2 className="animate-spin" size={12} />
          <span>Analyzing document…</span>
        </div>
      )}

      {/* Active skill tag */}
      {activeSkill && (
        <div className="mx-auto max-w-4xl pb-3">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-text)', border: '1px solid var(--color-accent)' }}>
            <Terminal size={12} style={{ color: 'var(--color-accent)' }} />
            <span>Active: <strong>/{activeSkill.command}</strong> ({activeSkill.name})</span>
            <button onClick={() => setActiveSkill(null)} className="p-0.5 rounded transition-colors hover:bg-black/20" title="Remove">
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="mx-auto max-w-4xl">
        <div
          className="poe-panel rounded-[24px] md:rounded-[26px] px-3 md:px-4 py-2.5 md:py-3"
          style={{
            background: 'color-mix(in srgb, var(--color-surface-alt) 94%, transparent)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="hidden md:flex items-center justify-between gap-3 px-1 pb-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-faint)' }}>
              Message
            </div>
            <div className="text-[11px]" style={{ color: 'var(--color-text-faint)' }}>
              {input.trim().length > 0 ? `${input.trim().length} chars` : 'Ready'}
            </div>
          </div>

          <div className="md:hidden flex items-center justify-between gap-3 px-1 pb-2 select-none">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-faint)' }}>
              Message
            </div>
            <div className="text-[11px]" style={{ color: 'var(--color-text-faint)' }}>
              {input.trim().length > 0 ? `${input.trim().length} chars` : 'Ready'}
            </div>
          </div>

          <div className="flex items-end gap-1.5 md:gap-2">
            <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.csv,.json,.txt,.css,.html,.js,.ts,.jsx,.tsx,.py,.md,.xml,.svg" multiple onChange={handleFileChange} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 p-2 md:p-2.5 rounded-2xl transition-colors poe-control"
              style={{ color: 'var(--color-text-faint)' }}
              title="Attach file"
              disabled={parsingFile}
            >
              <Paperclip size={18} />
            </button>

            <button
              type="button"
              onClick={() => setWebSearchActive(!webSearchActive)}
              className="shrink-0 p-2 md:p-2.5 rounded-2xl transition-all active:scale-95"
              style={{
                color: webSearchActive ? 'var(--color-accent-hover)' : 'var(--color-text-faint)',
                background: webSearchActive ? 'var(--color-accent-muted)' : 'transparent',
                border: `1px solid ${webSearchActive ? 'color-mix(in srgb, var(--color-accent) 28%, transparent)' : 'transparent'}`,
              }}
              title="Toggle Web Search"
            >
              <Globe size={18} className={webSearchActive ? 'animate-pulse' : ''} />
            </button>

            {SpeechRecognition && (
              <button
                type="button"
                onClick={toggleMic}
                className="shrink-0 p-2 md:p-2.5 rounded-2xl transition-all active:scale-95"
                style={{
                  color: isListening ? 'var(--color-danger)' : 'var(--color-text-faint)',
                  background: isListening ? 'var(--color-danger-muted)' : 'transparent',
                  border: `1px solid ${isListening ? 'color-mix(in srgb, var(--color-danger) 30%, transparent)' : 'transparent'}`,
                }}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              placeholder="Message"
              className="flex-1 resize-none bg-transparent py-2 px-1 text-[15px] outline-none"
              style={{ color: 'var(--color-text)', maxHeight: '10rem', minHeight: '1.5rem' }}
            />

            {sending ? (
              <button
                onClick={onCancel}
                className="shrink-0 p-2 md:p-2.5 rounded-2xl transition-all active:scale-95"
                style={{ background: 'var(--color-danger)', color: 'white' }}
                title="Stop generating"
              >
                <Square size={18} fill="white" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={disabled || parsingFile}
                className="shrink-0 p-2 md:p-2.5 rounded-2xl transition-all disabled:opacity-30"
                style={{
                  background: input.trim() || files.length > 0 ? 'var(--color-accent)' : 'transparent',
                  color: input.trim() || files.length > 0 ? 'white' : 'var(--color-text-faint)',
                  border: `1px solid ${input.trim() || files.length > 0 ? 'transparent' : 'color-mix(in srgb, var(--color-border) 60%, transparent)'}`,
                }}
                title="Send"
              >
                <SendHorizonal size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
