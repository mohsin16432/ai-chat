import { useState, lazy, Suspense } from 'react';
import { Copy, Check, Play } from 'lucide-react';

const LazyHighlighter = lazy(() => 
  Promise.all([
    import('react-syntax-highlighter'),
    import('react-syntax-highlighter/dist/esm/styles/prism')
  ]).then(([highlighterModule, styleIndex]) => ({
    default: ({ language, showLineNumbers, code, customStyle, lineNumberStyle }) => (
      <highlighterModule.Prism
        language={language}
        style={styleIndex.oneDark}
        showLineNumbers={showLineNumbers}
        customStyle={customStyle}
        lineNumberStyle={lineNumberStyle}
        wrapLongLines={false}
      >
        {code}
      </highlighterModule.Prism>
    )
  }))
);

function CodeFallback({ code }) {
  return (
    <pre 
      className="overflow-x-auto font-mono text-[0.8rem]"
      style={{
        margin: 0,
        padding: '1rem',
        background: '#0d0d0d',
        lineHeight: '1.5',
        color: 'var(--color-text-muted)',
      }}
    >
      <code>{code}</code>
    </pre>
  );
}

export default function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);

  const code = String(children).replace(/\n$/, '');

  // 1. Broaden compatible language identifiers
  const cleanLang = (language || '').toLowerCase().trim();
  const isArtifactCompatible = [
    'html', 'htm', 'xhtml', 'svg', 'xml', 'css', 
    'javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx'
  ].includes(cleanLang);

  // --- VISUAL CONSOLE DIAGNOSTIC ---
  console.groupCollapsed(
    `%c💻 CodeBlock Diagnostic [${cleanLang || 'plaintext'}]`, 
    'color: #06b6d4; font-weight: bold; font-size: 10px;'
  );
  console.log('%cRaw Language Prop Received:', 'color: #a3a3a3;', language);
  console.log('%cIs Artifact Compatible?:', isArtifactCompatible ? 'color: #10b981; font-weight: bold;' : 'color: #ef4444;', isArtifactCompatible);
  console.log('%cCode Snippet (First 60 chars):', 'color: #a3a3a3;', code.substring(0, 60) + '...');
  console.groupEnd();
  // ----------------------------------

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // Fire global Custom Event to trigger the Artifact panel
  function handleOpenArtifact() {
    console.log('%c🚀 Dispatching view-artifact event for:', 'color: #6366f1; font-weight: bold;', cleanLang);
    window.dispatchEvent(new CustomEvent('view-artifact', {
      detail: {
        language: cleanLang === 'xml' ? 'svg' : cleanLang,
        code: code
      }
    }));
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden my-3"
      style={{ border: '1px solid var(--color-border)' }}
    >
      {/* Header bar — always visible */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          background: 'var(--color-surface-hover)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span
          className="text-xs font-mono"
          style={{ color: 'var(--color-text-faint)' }}
        >
          {language || 'code'}
        </span>

        <div className="flex items-center gap-2">
          {/* View Artifact Trigger Button */}
          {isArtifactCompatible && (
            <button
              onClick={handleOpenArtifact}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all border font-semibold active:scale-95"
              style={{ 
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--color-accent-hover)',
                borderColor: 'var(--color-accent)'
              }}
            >
              <Play size={10} className="fill-[var(--color-accent-hover)] text-[var(--color-accent-hover)]" /> 
              <span>View Artifact</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors active:scale-95"
            style={{
              color: copied ? 'var(--color-success)' : 'var(--color-text-faint)',
              background: copied ? 'var(--color-success)15' : 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            {copied ? (
              <><Check size={12} /> Copied</>
            ) : (
              <><Copy size={12} /> Copy</>
            )}
          </button>
        </div>
      </div>

      {/* Code content container with Suspense Fallback */}
      <div className="overflow-x-auto bg-[#0d0d0d]">
        <Suspense fallback={<CodeFallback code={code} />}>
          <LazyHighlighter
            language={language || 'text'}
            code={code}
            showLineNumbers={code.split('\n').length > 3}
            customStyle={{
              margin: 0,
              padding: '1rem',
              background: '#0d0d0d',
              fontSize: '0.8rem',
              lineHeight: '1.5',
              borderRadius: 0,
              minWidth: 'fit-content',
            }}
            lineNumberStyle={{
              color: '#4a4a4a',
              fontSize: '0.75rem',
              paddingRight: '1rem',
              minWidth: '2rem',
              userSelect: 'none',
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}