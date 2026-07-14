import { useState, useEffect } from 'react';
import { X, Settings, Terminal, Upload, Trash2, ShieldAlert, Loader2, Play } from 'lucide-react';
import ModelManager from './ModelManager';
import { loadSkills, saveCustomSkill, saveCustomSkills, deleteCustomSkill, parseMarkdownSkill, parseZipFile, downloadSkillFromRemote } from '../../lib/skills';

export default function SettingsModal({ settings, onSave, onClose }) {
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'skills'
  const [skills, setSkills] = useState([]);
  const [cliInput, setCliInput] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const [draft, setDraft] = useState({
    baseUrl: settings.baseUrl || '',
    apiKey: settings.apiKey || '',
    defaultModelId: settings.defaultModelId || '',
    models: settings.models || [],
    searchProvider: settings.searchProvider || 'duckduckgo',
    searchApiKey: settings.searchApiKey || '',
  });

  useEffect(() => {
    setSkills(loadSkills());
  }, []);

  function handleModelsUpdate(models, defaultModelId) {
    setDraft({ ...draft, models, defaultModelId });
  }

  // Handle Simulated CLI / URL Installs
  async function handleCliInstall(e) {
    e.preventDefault();
    const command = cliInput.trim();
    if (!command || isInstalling) return;

    setUploadError('');
    setUploadSuccess('');
    setIsInstalling(true);

    try {
      const parsedSkills = await downloadSkillFromRemote(command);
      
      // Handle both single skill and bulk install arrays
      if (Array.isArray(parsedSkills) && parsedSkills.length > 1) {
        saveCustomSkills(parsedSkills);
        setSkills(loadSkills());
        const names = parsedSkills.map(s => `/${s.command}`).join(', ');
        setUploadSuccess(`Successfully installed ${parsedSkills.length} skills: ${names}`);
      } else {
        const skill = Array.isArray(parsedSkills) ? parsedSkills[0] : parsedSkills;
        saveCustomSkill(skill);
        setSkills(loadSkills());
        setUploadSuccess(`Successfully installed skill: /${skill.command}`);
      }
      setCliInput('');
    } catch (err) {
      setUploadError(err.message || 'Failed to download remote skill package.');
    } finally {
      setIsInstalling(false);
    }
  }

  // Handle uploading and parsing local custom skills (.md or .zip)
  async function handleSkillFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploadSuccess('');

    try {
      const filename = file.name.toLowerCase();
      let parsedSkill = null;

      if (filename.endsWith('.md')) {
        const text = await file.text();
        parsedSkill = parseMarkdownSkill(text, file.name);
      } else if (filename.endsWith('.zip')) {
        const buffer = await file.arrayBuffer();
        parsedSkill = await parseZipFile(buffer);
      } else {
        throw new Error("Unsupported file format. Please upload a '.md' markdown file or a '.zip' configuration folder.");
      }

      const updated = saveCustomSkill(parsedSkill);
      setSkills(updated);
      setUploadSuccess(`Successfully installed skill: /${parsedSkill.command}`);
    } catch (err) {
      setUploadError(err.message || 'Failed to parse skill package.');
    } finally {
      e.target.value = '';
    }
  }

  function handleDeleteSkill(id) {
    const updated = deleteCustomSkill(id);
    setSkills(updated);
    setUploadSuccess('Skill uninstalled successfully.');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 flex flex-col"
        style={{
          background: 'var(--color-surface-alt)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Settings size={18} style={{ color: 'var(--color-text-faint)' }} />
            <h2 className="font-semibold text-lg">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-surface-hover)]"
            style={{ color: 'var(--color-text-faint)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="flex border-b mb-5 shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => setActiveTab('general')}
            className="px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition-all"
            style={{
              borderColor: activeTab === 'general' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'general' ? 'var(--color-text)' : 'var(--color-text-faint)',
            }}
          >
            General & Models
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className="px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition-all flex items-center gap-1.5"
            style={{
              borderColor: activeTab === 'skills' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'skills' ? 'var(--color-text)' : 'var(--color-text-faint)',
            }}
          >
            <Terminal size={14} /> Skills Center
          </button>
        </div>

        {/* Content Views */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {activeTab === 'general' ? (
            <>
              {/* General inputs */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
                  General Connection Configuration
                </h3>
                <label className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Base URL
                  <input
                    value={draft.baseUrl}
                    onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
                    placeholder="https://api.example.com/v1"
                    className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                    style={{
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                    }}
                  />
                </label>
                <label className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  API Key
                  <input
                    type="password"
                    value={draft.apiKey}
                    onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
                    className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                    style={{
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                    }}
                  />
                </label>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid var(--color-border)' }} />

              {/* Search API Configuration Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
                  Web Search Configuration
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Search Provider
                    <select
                      value={draft.searchProvider || 'duckduckgo'}
                      onChange={(e) => setDraft({ ...draft, searchProvider: e.target.value })}
                      className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                      style={{
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <option value="duckduckgo">Free DuckDuckGo (No Key)</option>
                      <option value="tavily">Tavily AI Search</option>
                      <option value="serper">Google Serper API</option>
                    </select>
                  </label>
                  
                  {draft.searchProvider !== 'duckduckgo' && (
                    <label className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Search API Key
                      <input
                        type="password"
                        value={draft.searchApiKey || ''}
                        onChange={(e) => setDraft({ ...draft, searchApiKey: e.target.value })}
                        placeholder="sk-..."
                        className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                        style={{
                          background: 'var(--color-surface)',
                          color: 'var(--color-text)',
                          border: '1px solid var(--color-border)',
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid var(--color-border)' }} />

              {/* Models sub-view */}
              <ModelManager
                models={draft.models}
                defaultModelId={draft.defaultModelId}
                onUpdate={handleModelsUpdate}
                baseUrl={draft.baseUrl}
                apiKey={draft.apiKey}
              />
            </>
          ) : (
            <div className="space-y-5">
              
              {/* Dynamic Simulated CLI Terminal Installer */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                  <Terminal size={14} className="text-[var(--color-accent)]" /> Remote CLI Installer
                </h3>
                <form onSubmit={handleCliInstall} className="flex gap-2">
                  <input
                    value={cliInput}
                    onChange={(e) => setCliInput(e.target.value)}
                    placeholder="npx skills add https://github.com/mattpocock/skills --skill grill-me"
                    className="flex-1 font-mono text-xs rounded-xl px-4 py-2.5 outline-none transition-colors"
                    style={{
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                    }}
                    disabled={isInstalling}
                  />
                  <button
                    type="submit"
                    className="rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 transition-all select-none active:scale-95 shrink-0"
                    style={{
                      background: 'var(--color-accent)',
                      color: 'white',
                    }}
                    disabled={isInstalling || !cliInput.trim()}
                  >
                    {isInstalling ? (
                      <><Loader2 size={12} className="animate-spin" /> Installing...</>
                    ) : (
                      <><Play size={10} className="fill-white" /> Run</>
                    )}
                  </button>
                </form>
                <p className="text-[10px]" style={{ color: 'var(--color-text-faint)' }}>
                  Supports simulated NPX instructions or raw GitHub Markdown file URLs.
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)' }} />

              <div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Install Custom Commands</h3>
                <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
                  Or select a local <strong>.md</strong> file or packaged <strong>.zip</strong> system bundle from your hard drive.
                </p>
              </div>

              {/* Local File Selector Dropzone */}
              <div className="relative">
                <label 
                  className="flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-5 cursor-pointer hover:bg-[var(--color-surface-hover)] transition-all"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <Upload size={20} className="mb-1.5" style={{ color: 'var(--color-accent)' }} />
                  <span className="text-xs font-semibold">Click to upload files (.md, .zip)</span>
                  <input 
                    type="file" 
                    accept=".md,.zip" 
                    onChange={handleSkillFileUpload} 
                    className="hidden" 
                    disabled={isInstalling}
                  />
                </label>
              </div>

              {/* Status Feedbacks */}
              {uploadError && (
                <div className="rounded-xl px-4 py-3 text-xs flex gap-2 items-start" style={{ background: 'var(--color-danger-muted)', color: '#fca5a5' }}>
                  <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}
              {uploadSuccess && (
                <div className="rounded-xl px-4 py-3 text-xs" style={{ background: 'rgba(34,197,94,0.15)', color: '#86efac' }}>
                  {uploadSuccess}
                </div>
              )}

              {/* List of installed skills */}
              <div className="space-y-2 mt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
                  Installed Commands List
                </h4>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {skills.map((skill) => (
                    <div 
                      key={skill.id}
                      className="flex items-center justify-between p-3 rounded-xl border"
                      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Terminal size={14} className="mt-0.5" style={{ color: 'var(--color-accent)' }} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-[var(--color-text)]">/{skill.command}</span>
                            <span className="text-[10px] px-1 py-0.2 rounded font-medium" style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text-faint)' }}>
                              {skill.name}
                            </span>
                          </div>
                          <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
                            {skill.description}
                          </p>
                        </div>
                      </div>

                      {skill.isCustom && (
                        <button
                          onClick={() => handleDeleteSkill(skill.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                          title="Uninstall Skill"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button Footer */}
        <div className="pt-4 shrink-0 border-t mt-4" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => {
              if (activeTab === 'general') {
                onSave(draft);
              }
              onClose();
            }}
            className="w-full rounded-xl py-2.5 text-sm font-semibold transition-colors shadow-md"
            style={{
              background: 'var(--color-accent)',
              color: 'white',
            }}
          >
            {activeTab === 'general' ? 'Save and apply configurations' : 'Close window'}
          </button>
        </div>
      </div>
    </div>
  );
}