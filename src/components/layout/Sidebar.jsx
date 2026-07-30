import ChatListItem from '../chat/ChatListItem';
import { Plus, Settings as SettingsIcon, LogOut, X, Search, SquarePen } from 'lucide-react';

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  onTogglePin,
  onOpenSettings,
  onSignOut,
  email,
  isOpen,
  onClose,
  onSearch,
}) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transform transition-transform duration-250 ease-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* New Chat button — prominent, like ChatGPT */}
        <div className="p-3 shrink-0">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <SquarePen size={16} style={{ color: 'var(--color-text-muted)' }} />
            New chat
          </button>
        </div>

        {/* Search button */}
        <div className="px-3 pb-2 shrink-0">
          <button
            onClick={onSearch}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors"
            style={{ color: 'var(--color-text-faint)' }}
          >
            <Search size={15} />
            Search chats
            <span className="ml-auto text-[10px] opacity-60">⌘K</span>
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {chats.length === 0 && (
            <p className="text-xs px-3 py-6 text-center" style={{ color: 'var(--color-text-faint)' }}>
              No conversations yet
            </p>
          )}
          {chats.map((c) => (
            <ChatListItem
              key={c.id}
              chat={c}
              isActive={c.id === activeChatId}
              onSelect={(id) => {
                onSelectChat(id);
                onClose();
              }}
              onRename={onRenameChat}
              onDelete={onDeleteChat}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>

        {/* Bottom section */}
        <div
          className="p-3 pb-safe flex items-center gap-2 shrink-0"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-faint)' }}
            title="Settings"
          >
            <SettingsIcon size={16} />
          </button>
          <span
            className="flex-1 truncate text-xs"
            style={{ color: 'var(--color-text-faint)' }}
          >
            {email}
          </span>
          <button
            onClick={onSignOut}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-faint)' }}
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors md:hidden"
            style={{ color: 'var(--color-text-faint)' }}
          >
            <X size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
