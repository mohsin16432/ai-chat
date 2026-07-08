import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

export default function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);

  const code = String(children).replace(/\n$/, '');

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

  return (
    <div
      className="relative rounded-xl overflow-hidden my-3"
      style={{ border: '1px solid var(--color-border)' }}
    >
      {/* Header bar — always visible on mobile */}
      <div
        className="flex items-center justify-between px-4 py-1.5"
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

      {/* Code content */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language || 'text'}
          style={oneDark}
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
          wrapLongLines={false}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}