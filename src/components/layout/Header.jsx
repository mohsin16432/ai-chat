import { Menu } from 'lucide-react';
import ModelPicker from '../chat/ModelPicker';

export default function Header({ settings, chats, activeChatId, onChangeModel, onMenuClick }) {
  const activeChat = chats.find((c) => c.id === activeChatId);

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 shrink-0"
      style={{
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-lg transition-colors md:hidden"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Menu size={20} />
        </button>
        <h2
          className="text-sm font-medium truncate"
          style={{ color: 'var(--color-text)' }}
        >
          {activeChat?.title || 'New conversation'}
        </h2>
      </div>

      {activeChatId && (
        <ModelPicker
          settings={settings}
          chats={chats}
          activeChatId={activeChatId}
          onChangeModel={onChangeModel}
        />
      )}
    </div>
  );
}