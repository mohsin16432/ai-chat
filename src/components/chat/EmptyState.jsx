import { Sparkles, Code, PenLine, Lightbulb, FileSearch } from 'lucide-react';

const SUGGESTIONS = [
  { icon: Lightbulb, text: 'Brainstorm ideas for a project' },
  { icon: Code, text: 'Explain a code concept' },
  { icon: PenLine, text: 'Help me write something' },
  { icon: FileSearch, text: 'Research a topic' },
];

export default function EmptyState({ onSuggestion }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8 md:px-6">
      <div className="text-center space-y-7 w-full max-w-3xl">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-[22px] mx-auto"
          style={{
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 24%, transparent), color-mix(in srgb, var(--color-accent) 10%, transparent))',
            border: '1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)',
          }}
        >
          <Sparkles size={26} style={{ color: 'var(--color-accent-hover)' }} />
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-faint)' }}>
            Start here
          </div>
          <h1 className="text-[2rem] md:text-[2.5rem] font-semibold tracking-[-0.04em] mt-3" style={{ color: 'var(--color-text)' }}>
            Ask clearly. Read calmly.
          </h1>
          <p className="text-sm md:text-[15px] mt-3 max-w-xl mx-auto leading-7" style={{ color: 'var(--color-text-muted)' }}>
            A cleaner workspace for long chats, file-grounded prompts, and focused replies.
          </p>
        </div>
        {onSuggestion && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestion(s.text)}
                className="poe-panel flex items-center gap-3 px-4 py-4 rounded-[22px] text-sm text-left transition-all hover:-translate-y-0.5"
                style={{
                  color: 'var(--color-text-muted)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--color-surface-hover)', color: 'var(--color-accent-hover)' }}
                >
                  <s.icon size={16} />
                </div>
                <span className="truncate">{s.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
