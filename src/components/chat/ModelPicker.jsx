import { ChevronDown } from 'lucide-react';
import { CAPABILITY_ICONS } from '../../lib/settings';
import { getModelById } from '../../lib/models';

export default function ModelPicker({ settings, chats, activeChatId, onChangeModel }) {
  const activeChat = chats.find((c) => c.id === activeChatId);
  const currentModelId = activeChat?.model || settings.defaultModelId;
  const currentModel = getModelById(settings, currentModelId);

  return (
    <div className="relative">
      <select
        value={currentModelId}
        onChange={(e) => onChangeModel(e.target.value)}
        className="appearance-none rounded-xl pl-3 pr-7 py-1.5 text-xs font-medium outline-none cursor-pointer transition-colors"
        style={{
          background: 'var(--color-surface-hover)',
          color: 'var(--color-text-muted)',
          border: '1px solid var(--color-border)',
        }}
        title="Select model for this chat"
      >
        {settings.models.map((m) => {
          const caps = Object.entries(m.capabilities)
            .filter(([_, v]) => v)
            .map(([k]) => CAPABILITY_ICONS[k] || k)
            .join(' ');

          return (
            <option key={m.id} value={m.id}>
              {m.name} {caps ? `· ${caps}` : ''}
            </option>
          );
        })}
      </select>
      <ChevronDown
        size={12}
        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--color-text-faint)' }}
      />
    </div>
  );
}