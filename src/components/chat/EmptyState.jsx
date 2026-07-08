import { Sparkles } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mx-auto"
          style={{ background: 'var(--color-accent-muted)' }}
        >
          <Sparkles size={28} style={{ color: 'var(--color-accent-hover)' }} />
        </div>
        <div>
          <h2 className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>
            Start a conversation
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-faint)' }}>
            Select a chat from the sidebar or create a new one
          </p>
        </div>
      </div>
    </div>
  );
}