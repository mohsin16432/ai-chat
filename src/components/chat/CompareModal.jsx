import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, SendHorizonal, Loader2, Copy, Check } from 'lucide-react';
import { streamChat } from '../../lib/llm';
import { normalizeMarkdownTables } from './MessageBubble';

export default function CompareModal({ settings, onClose }) {
  const models = settings.models || [];
  const [prompt, setPrompt] = useState('');
  const [selected, setSelected] = useState(() => models.slice(0, Math.min(2, models.length)).map((m) => m.id));
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState({}); // modelId -> { text, usage, error, done }
  const [copied, setCopied] = useState(null);

  function toggleModel(id) {
    if (selected.includes(id)) {
      if (selected.length > 1) setSelected((p) => p.filter((x) => x !== id));
    } else if (selected.length < 3) {
      setSelected((p) => [...p, id]);
    }
  }

  async function run() {
    if (!prompt.trim() || selected.length === 0 || running) return;
    setRunning(true);
    setResults({});

    const initial = {};
    selected.forEach((id) => { initial[id] = { text: '', usage: null, error: null, done: false }; });
    setResults(initial);

    await Promise.all(
      selected.map(async (id) => {
        const model = models.find((m) => m.id === id);
        try {
          const { text, usage } = await streamChat({
            baseUrl: settings.baseUrl,
            apiKey: settings.apiKey,
            model: id,
            messages: [{ role: 'user', content: prompt }],
            onToken: (t) => {
              setResults((prev) => ({ ...prev, [id]: { ...prev[id], text: t } }));
            },
            proxySettings: settings,
          });
          setResults((prev) => ({ ...prev, [id]: { text, usage: usage || null, error: null, done: true } }));
        } catch (e) {
          setResults((prev) => ({ ...prev, [id]: { ...prev[id], error: e.message, done: true } }));
        }
      })
    );
    setRunning(false);
  }

  function copy(id, text) {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-2xl flex flex-col"
        style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="font-semibold">Compare models</h2>
            <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Send one prompt to 2–3 models side-by-side.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-faint)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggleModel(m.id)}
                  className="rounded-full px-3 py-1 text-xs transition-colors"
                  style={{
                    background: selected.includes(m.id) ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: selected.includes(m.id) ? 'white' : 'var(--color-text-muted)',
                    border: `1px solid ${selected.includes(m.id) ? 'transparent' : 'var(--color-border)'}`,
                    opacity: !selected.includes(m.id) && selected.length >= 3 ? 0.45 : 1,
                  }}
                >
                  {m.name}
                </button>
              ))}
              {models.length === 0 && (
                <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Add models in Settings first.</span>
              )}
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Ask the same question to every selected model..."
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-y"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            />
            <button
              onClick={run}
              disabled={!prompt.trim() || selected.length === 0 || running}
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-40"
              style={{ background: 'var(--color-accent)', color: 'white', width: '100%' }}
            >
              {running ? <Loader2 className="animate-spin" size={16} /> : <SendHorizonal size={16} />}
              {running ? 'Running...' : 'Compare'}
            </button>
          </div>

          {(Object.keys(results).length > 0) && (
            <div className={`grid gap-3 ${selected.length === 1 ? 'grid-cols-1' : selected.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 lg:grid-cols-3'}`}>
              {selected.map((id) => {
                const model = models.find((m) => m.id === id);
                const r = results[id] || { text: '', usage: null, error: null, done: false };
                return (
                  <div key={id} className="rounded-xl overflow-hidden flex flex-col" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                      <span className="text-xs font-semibold truncate">{model?.name || id}</span>
                      <button onClick={() => copy(id, r.text)} className="p-1 rounded-lg" style={{ color: 'var(--color-text-faint)' }} title="Copy">
                        {copied === id ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                    <div className="p-3 text-sm leading-7 max-h-[40vh] overflow-y-auto prose prose-sm max-w-none" style={{ minHeight: '6rem' }}>
                      {r.error ? (
                        <span style={{ color: 'var(--color-danger-text)' }}>{r.error}</span>
                      ) : r.text ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code({ inline, className, children, ...props }) {
                          return <code className={className} {...props}>{children}</code>;
                        } }}>{normalizeMarkdownTables(r.text)}</ReactMarkdown>
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)' }}>{running ? 'Generating…' : 'No response yet.'}</span>
                      )}
                    </div>
                    {r.usage && (r.usage.prompt_tokens || r.usage.completion_tokens) && (
                      <div className="px-3 py-1.5 text-[10px] border-t" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-faint)' }}>
                        {(r.usage.prompt_tokens || 0) + (r.usage.completion_tokens || 0)} tokens
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
