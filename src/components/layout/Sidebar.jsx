import ChatListItem from '../chat/ChatListItem';
import { Plus, Settings as SettingsIcon, LogOut, X, Search } from 'lucide-react';

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
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
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col transform transition-transform duration-250 ease-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* Top section */}
        <div className="flex items-center justify-between p-4 shrink-0">
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Chats
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onSearch}
              className="p-2 rounded-xl transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              title="Search (⌘K)"
            >
              <Search size={18} />
            </button>
            <button
              onClick={() => {
                onNewChat();
                onClose();
              }}
              className="p-2 rounded-xl transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              title="New chat (⌘N)"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl transition-colors md:hidden"
              style={{ color: 'var(--color-text-faint)' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {chats.length === 0 && (
            <p className="text-sm px-3 py-6 text-center" style={{ color: 'var(--color-text-faint)' }}>
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
            />
          ))}
        </div>

        {/* Bottom section — Upgraded with pb-safe wrapper alignment */}
        <div
          className="p-3 pb-safe flex items-center gap-2 shrink-0"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--color-text-faint)' }}
            title="Settings"
          >
            <SettingsIcon size={18} />
          </button>
          <span
            className="flex-1 truncate text-xs"
            style={{ color: 'var(--color-text-faint)' }}
          >
            {email}
          </span>
          <button
            onClick={onSignOut}
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--color-text-faint)' }}
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
}