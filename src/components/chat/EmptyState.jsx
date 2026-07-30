import { Sparkles, Code, PenLine, Lightbulb, FileSearch } from 'lucide-react';

const SUGGESTIONS = [
  { icon: Lightbulb, text: 'Brainstorm ideas for a project' },
  { icon: Code, text: 'Explain a code concept' },
  { icon: PenLine, text: 'Help me write something' },
  { icon: FileSearch, text: 'Research a topic' },
];

export default function EmptyState({ onSuggestion }) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="text-center space-y-6 w-full max-w-2xl">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mx-auto"
          style={{ background: 'var(--color-accent-muted)' }}
        >
          <Sparkles size={26} style={{ color: 'var(--color-accent-hover)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>
            What can I help with?
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-faint)' }}>
            Ask anything, attach files, or use a skill command
          </p>
        </div>
        {onSuggestion && (
          <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestion(s.text)}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-left transition-all hover:opacity-90"
                style={{
                  background: 'var(--color-surface-alt)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <s.icon size={16} style={{ color: 'var(--color-text-faint)' }} />
                <span className="truncate">{s.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
