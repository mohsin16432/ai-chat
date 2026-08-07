import { Menu, SlidersHorizontal, Sun, Moon } from 'lucide-react';
import ModelPicker from '../chat/ModelPicker';
import ExportButton from '../chat/ExportButton';

export default function Header({ settings, chats, activeChatId, messages, onChangeModel, onMenuClick, onChatSettings, onToggleTheme }) {
  const activeChat = chats.find((c) => c.id === activeChatId);
  const isLight = settings?.theme === 'light';
  const activeChatTitle = activeChat?.title && activeChat.title.trim() && activeChat.title !== 'New chat'
    ? activeChat.title
    : activeChatId
      ? 'Untitled chat'
      : 'New chat';

  return (
    <>
      <div
        className="md:hidden shrink-0 px-4 pt-3 pb-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-full"
            style={{ color: 'var(--color-text)' }}
            title="Open history and menu"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h2
              className="text-[15px] font-semibold truncate"
              style={{ color: 'var(--color-text)' }}
            >
              {activeChatTitle}
            </h2>
            <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
              {activeChatId ? 'Conversation' : 'Ready'}
            </div>
          </div>
          <div className="min-w-0 shrink-0 flex items-center gap-1.5">
            <ModelPicker
              settings={settings}
              chats={chats}
              activeChatId={activeChatId}
              onChangeModel={onChangeModel}
            />
            {activeChatId && (
              <button
                onClick={onChatSettings}
                className="p-2 rounded-full"
                style={{ color: 'var(--color-text-muted)' }}
                title="Chat settings"
              >
                <SlidersHorizontal size={17} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        className="hidden md:block shrink-0 px-4 md:px-6 pt-3 pb-3"
        style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-border) 72%, transparent)' }}
      >
        <div className="poe-panel rounded-[22px] px-3 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-xl transition-colors poe-control"
              style={{ color: 'var(--color-text-muted)' }}
              title="Toggle sidebar"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-faint)' }}>
                Conversation
              </div>
              <h2
                className="text-sm md:text-[15px] font-semibold truncate mt-0.5"
                style={{ color: 'var(--color-text)' }}
              >
                {activeChatId ? activeChatTitle : 'New conversation'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl transition-colors poe-control"
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
                  className="p-2 rounded-xl transition-colors poe-control"
                  style={{ color: 'var(--color-text-muted)' }}
                  title="Chat settings"
                >
                  <SlidersHorizontal size={16} />
                </button>
              </>
            )}
            <ModelPicker
              settings={settings}
              chats={chats}
              activeChatId={activeChatId}
              onChangeModel={onChangeModel}
            />
          </div>
        </div>
      </div>
    </>
  );
}
