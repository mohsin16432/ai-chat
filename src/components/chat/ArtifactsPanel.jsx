import { useState, useEffect, useRef } from 'react';
import { X, Play, Code2, Copy, Check, Maximize2 } from 'lucide-react';

export default function ArtifactsPanel({ artifact, onClose }) {
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'code'
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef(null);

  // Auto-switch to Code tab for raw javascript/css since they have no direct HTML shell
  useEffect(() => {
    if (artifact.language === 'javascript' || artifact.language === 'css') {
      setActiveTab('code');
    } else {
      setActiveTab('preview');
    }
  }, [artifact]);

  // Construct secure sandboxed HTML document injection
  const getIframeSrcDoc = () => {
    const rawCode = artifact.code;

    if (artifact.language === 'svg' || rawCode.trim().startsWith('<svg')) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                margin: 0;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: #0f172a;
              }
              svg {
                max-width: 90%;
                max-height: 90vh;
                height: auto;
              }
            </style>
          </head>
          <body>
            ${rawCode}
          </body>
        </html>
      `;
    }

    // Default HTML page wrapper with Tailwind CSS dynamic script compiler injected
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <script>
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    accent: '#6366f1',
                  }
                }
              }
            }
          </script>
          <style>
            body {
              margin: 0;
              padding: 1.5rem;
              font-family: ui-sans-serif, system-ui, sans-serif;
              background-color: #0f172a;
              color: #f1f5f9;
            }
            /* Custom Scrollbar */
            ::-webkit-scrollbar {
              width: 6px;
              height: 6px;
            }
            ::-webkit-scrollbar-track {
              background: #1e293b;
            }
            ::-webkit-scrollbar-thumb {
              background: #475569;
              border-radius: 9999px;
            }
          </style>
        </head>
        <body>
          ${rawCode}
        </body>
      </html>
    `;
  };

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(artifact.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div 
      className="w-full md:w-[50vw] xl:w-[45vw] h-full flex flex-col border-t md:border-t-0 md:border-l shrink-0 relative transition-all animate-fade-in"
      style={{
        background: 'var(--color-surface-alt)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Header bar */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-md bg-[var(--color-accent-muted)]">
            <Maximize2 size={14} className="text-[var(--color-accent-hover)]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-xs truncate" style={{ color: 'var(--color-text)' }}>
              Interactive Artifact Explorer
            </h3>
            <p className="text-[10px] font-mono tracking-wide uppercase mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
              Render context: {artifact.language}
            </p>
          </div>
        </div>

        {/* Action Controls right */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-faint)] hover:text-[var(--color-text)] transition-all"
            title="Copy source code"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-faint)] hover:text-red-400 transition-all"
            title="Close Panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tabs Selector Navigation (Visible if preview format is supported) */}
      {(artifact.language !== 'javascript' && artifact.language !== 'css') && (
        <div className="flex border-b shrink-0 px-4 py-1.5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <button
            onClick={() => setActiveTab('preview')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
            style={{
              background: activeTab === 'preview' ? 'var(--color-surface-hover)' : 'transparent',
              color: activeTab === 'preview' ? 'var(--color-text)' : 'var(--color-text-faint)',
            }}
          >
            <Play size={12} className="text-emerald-400" /> Preview Render
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
            style={{
              background: activeTab === 'code' ? 'var(--color-surface-hover)' : 'transparent',
              color: activeTab === 'code' ? 'var(--color-text)' : 'var(--color-text-faint)',
            }}
          >
            <Code2 size={12} className="text-[var(--color-accent)]" /> Raw Code
          </button>
        </div>
      )}

      {/* Core display Area */}
      <div className="flex-1 min-h-0 relative bg-[#0d0d0d]">
        {activeTab === 'preview' ? (
          <iframe
            ref={iframeRef}
            srcDoc={getIframeSrcDoc()}
            className="w-full h-full border-none bg-[#0f172a]"
            sandbox="allow-scripts"
            title="Artifact Preview Sandbox"
          />
        ) : (
          <div className="w-full h-full overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-300">
            <pre className="whitespace-pre-wrap select-text">{artifact.code}</pre>
          </div>
        )}
      </div>
    </div>
  );
}