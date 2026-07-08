import { AlertTriangle, ArrowRight } from 'lucide-react';
import { getActiveModel, modelSupports } from '../../lib/models';

export default function CapabilityWarning({ settings, chats, activeChatId, hasFiles, onSwitchModel }) {
  const activeModel = getActiveModel(settings, chats, activeChatId);

  const showVisionWarning = hasFiles && activeChatId && !modelSupports(activeModel, 'vision');
  const showTextWarning = activeChatId && !modelSupports(activeModel, 'text');
  const visionModel = settings.models.find((m) => m.capabilities.vision);

  if (!showVisionWarning && !showTextWarning) return null;

  return (
    <div className="mx-auto max-w-3xl px-4">
      {showVisionWarning && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3 mb-2 text-sm"
          style={{
            background: 'var(--color-warning-muted)',
            border: '1px solid #f59e0b30',
            color: '#fbbf24',
          }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-medium text-xs">
              {activeModel?.name || 'Current model'} doesn't support images
            </p>
            {visionModel && (
              <button
                onClick={() => onSwitchModel(visionModel.id)}
                className="flex items-center gap-1 text-xs font-medium transition-colors"
                style={{ color: '#fcd34d' }}
              >
                Switch to {visionModel.name} <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {showTextWarning && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 mb-2 text-xs"
          style={{
            background: 'var(--color-danger-muted)',
            border: '1px solid #ef444430',
            color: '#fca5a5',
          }}
        >
          <AlertTriangle size={16} className="shrink-0" />
          <p>Selected model doesn't support text chat. Choose a different model.</p>
        </div>
      )}
    </div>
  );
}