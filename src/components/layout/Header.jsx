import { Menu, SlidersHorizontal, Sun, Moon } from 'lucide-react';
import ModelPicker from '../chat/ModelPicker';
import ExportButton from '../chat/ExportButton';

export default function Header({ settings, chats, activeChatId, messages, onChangeModel, onMenuClick, onChatSettings, onToggleTheme }) {
  const activeChat = chats.find((c) => c.id === activeChatId);
  const isLight = settings?.theme === 'light';

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 shrink-0"
      style={{ background: 'var(--color-surface)' }}
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
          style={{ color: 'var(--color-text-muted)' }}
        >
          {activeChat?.title || 'New conversation'}
        </h2>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          title={isLight ? 'Switch to dark' : 'Switch to light'}
        >
          {isLight ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        {activeChatId && (
          <>
            <ExportButton chat={activeChat} messages={messages} />
            <button
              onClick={onChatSettings}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              title="Chat settings"
            >
              <SlidersHorizontal size={16} />
            </button>
            <ModelPicker
              settings={settings}
              chats={chats}
              activeChatId={activeChatId}
              onChangeModel={onChangeModel}
            />
          </>
        )}
      </div>
    </div>
  );
}
