import { useEffect, useState } from 'react';
import ChatListItem from '../chat/ChatListItem';
import { Settings as SettingsIcon, LogOut, X, Search, SquarePen, MessageSquare, ArrowRight } from 'lucide-react';
import { ArrowLeft, House, History } from 'lucide-react';
import { useChatSearch } from '../../hooks/useChatSearch';

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
  const [mobileSection, setMobileSection] = useState('history');
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const { results: mobileSearchResults, searching: mobileSearching } = useChatSearch(mobileSearchQuery, {
    enabled: isOpen && mobileSection === 'history',
  });

  useEffect(() => {
    if (isOpen) {
      setMobileSection('history');
      setMobileSearchQuery('');
    }
  }, [isOpen]);

  const closeIfMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      onClose();
    }
  };

  const mobileShowingSearch = mobileSearchQuery.trim().length > 0;

  const getChatTitle = (title) => (
    title && title.trim() && title !== 'New chat' ? title : 'Untitled chat'
  );

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'var(--color-overlay)' }}
          onClick={onClose}
        />
      )}

      <div
        className={`fixed inset-0 z-50 flex flex-col transition-transform duration-250 ease-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#0a0b10' }}
      >
        <div
          className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button
            onClick={onClose}
            className="p-2 rounded-full"
            style={{ color: '#f5f7fb' }}
            title="Close"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-lg font-semibold" style={{ color: '#f5f7fb' }}>
            {mobileSection === 'history' ? 'History' : 'Home'}
          </div>
          <div className="w-9" />
        </div>

        <div
          className="flex-1 overflow-y-auto px-0 pb-[8.5rem]"
          style={{ background: 'linear-gradient(180deg, #0a0b10 0%, #111318 100%)' }}
        >
          {mobileSection === 'history' ? (
            <div>
              <div
                className="sticky top-0 z-10 px-4 pt-3 pb-3"
                style={{
                  background: 'linear-gradient(180deg, rgba(10,11,16,0.98) 0%, rgba(10,11,16,0.92) 100%)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                <div
                  className="flex items-center gap-3 rounded-[22px] px-4 py-3"
                  style={{
                    background: 'rgba(36,39,49,0.82)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Search size={18} style={{ color: 'rgba(245,247,251,0.64)' }} />
                  <input
                    value={mobileSearchQuery}
                    onChange={(e) => setMobileSearchQuery(e.target.value)}
                    placeholder="Search chats and messages..."
                    className="flex-1 bg-transparent text-[15px] outline-none"
                    style={{ color: '#f5f7fb' }}
                  />
                  {mobileSearchQuery && (
                    <button
                      onClick={() => setMobileSearchQuery('')}
                      className="text-[12px]"
                      style={{ color: 'rgba(245,247,251,0.64)' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {!mobileShowingSearch && chats.length === 0 ? (
                <div className="px-5 py-8 text-center" style={{ color: 'rgba(245,247,251,0.7)' }}>
                  No conversations yet
                </div>
              ) : null}

              {mobileShowingSearch ? (
                <div>
                  {!mobileSearching && mobileSearchResults.length === 0 && (
                    <div className="px-5 py-8 text-center text-sm" style={{ color: 'rgba(245,247,251,0.62)' }}>
                      No results found
                    </div>
                  )}

                  {mobileSearchResults.map((result, index) => (
                    <button
                      key={`${result.type}-${result.chatId}-${index}`}
                      onClick={() => {
                        onSelectChat(result.chatId);
                        closeIfMobile();
                      }}
                      className="w-full flex items-start gap-3 px-4 py-4 text-left"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <MessageSquare size={18} style={{ color: '#f5f7fb' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[16px] font-medium" style={{ color: '#f5f7fb' }}>
                          {getChatTitle(result.chatTitle)}
                        </div>
                        {result.type === 'message' ? (
                          <div className="mt-1 line-clamp-2 text-[13px]" style={{ color: 'rgba(245,247,251,0.62)' }}>
                            {result.preview}
                          </div>
                        ) : (
                          <div className="mt-1 text-[13px]" style={{ color: 'rgba(245,247,251,0.62)' }}>
                            Matching conversation title
                          </div>
                        )}
                      </div>
                      <ArrowRight size={16} className="mt-1 shrink-0" style={{ color: 'rgba(245,247,251,0.52)' }} />
                    </button>
                  ))}
                </div>
              ) : (
                chats.map((c) => (
                  <ChatListItem
                    key={c.id}
                    chat={c}
                    isActive={c.id === activeChatId}
                    onSelect={(id) => {
                      onSelectChat(id);
                      closeIfMobile();
                    }}
                    onRename={onRenameChat}
                    onDelete={onDeleteChat}
                    onTogglePin={onTogglePin}
                    mobile
                  />
                ))
              )}
            </div>
          ) : (
            <div className="px-4 py-5 space-y-4">
              <div className="rounded-[24px] p-4 space-y-2" style={{ background: '#0d0f16', border: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={() => {
                    onNewChat();
                    closeIfMobile();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left"
                  style={{ color: '#f5f7fb' }}
                >
                  <SquarePen size={18} />
                  <span className="text-base">New chat</span>
                </button>
              </div>

              <div className="rounded-[24px] p-4 space-y-2" style={{ background: '#0d0f16', border: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={() => {
                    onOpenSettings();
                    closeIfMobile();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left"
                  style={{ color: '#f5f7fb' }}
                >
                  <SettingsIcon size={18} />
                  <span className="text-base">Settings</span>
                </button>
                <button
                  onClick={() => {
                    onSignOut();
                    closeIfMobile();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left"
                  style={{ color: '#f5f7fb' }}
                >
                  <LogOut size={18} />
                  <span className="text-base">Sign out</span>
                </button>
              </div>

              <div className="rounded-[24px] p-4" style={{ background: '#0d0f16', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'rgba(245,247,251,0.45)' }}>
                  Signed in
                </div>
                <div className="text-sm mt-2 break-all" style={{ color: '#f5f7fb' }}>
                  {email}
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 px-3 pt-3"
          style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
            background: 'linear-gradient(180deg, rgba(10,11,16,0) 0%, #0a0b10 32%)',
          }}
        >
          <div
            className="grid grid-cols-2 items-center gap-1 rounded-[28px] px-2 py-2"
            style={{ background: 'rgba(36,39,49,0.92)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <button
              onClick={() => setMobileSection('history')}
              className="flex flex-col items-center gap-1 rounded-[20px] py-2 text-[11px]"
              style={{
                color: mobileSection === 'history' ? '#ffffff' : 'rgba(245,247,251,0.72)',
                background: mobileSection === 'history' ? 'rgba(255,255,255,0.12)' : 'transparent',
              }}
            >
              <History size={18} />
              <span>History</span>
            </button>
            <button
              onClick={() => setMobileSection('home')}
              className="flex flex-col items-center gap-1 rounded-[20px] py-2 text-[11px]"
              style={{
                color: mobileSection === 'home' ? '#ffffff' : 'rgba(245,247,251,0.72)',
                background: mobileSection === 'home' ? 'rgba(255,255,255,0.12)' : 'transparent',
              }}
            >
              <House size={18} />
              <span>Home</span>
            </button>
          </div>
        </div>
      </div>

      <div
        className={`hidden md:block fixed inset-y-0 left-0 z-50 overflow-hidden transition-[width,transform] duration-250 ease-out md:relative md:inset-y-auto md:left-auto md:z-auto md:h-full md:shrink-0 ${
          isOpen ? 'translate-x-0 w-[17.5rem] md:w-[17.5rem]' : '-translate-x-full w-[17.5rem] md:translate-x-0 md:w-0'
        }`}
      >
        <aside
          className="flex h-full w-[17.5rem] flex-col"
          style={{
            background: 'color-mix(in srgb, var(--color-rail) 94%, transparent)',
            borderRight: '1px solid color-mix(in srgb, var(--color-border) 82%, transparent)',
          }}
        >
          <div className="px-4 pt-3 pb-3 shrink-0">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-faint)' }}>
                  Workspace
                </div>
                <div className="text-sm font-semibold mt-1" style={{ color: 'var(--color-text)' }}>
                  AI Chat
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl transition-colors poe-control"
                style={{ color: 'var(--color-text-faint)' }}
                title="Collapse sidebar"
              >
                <X size={16} />
              </button>
            </div>

            <button
              onClick={() => {
                onNewChat();
                closeIfMobile();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-sm font-medium transition-all"
              style={{
                background: 'var(--color-surface-alt)',
                color: 'var(--color-text)',
                border: '1px solid color-mix(in srgb, var(--color-border-light) 86%, transparent)',
                boxShadow: 'inset 0 1px 0 color-mix(in srgb, white 6%, transparent)',
              }}
            >
              <SquarePen size={16} style={{ color: 'var(--color-accent-hover)' }} />
              New chat
            </button>

            <button
              onClick={() => {
                onSearch();
              }}
              className="w-full mt-2 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-sm transition-colors poe-control"
              style={{
                color: 'var(--color-text-muted)',
                borderColor: 'color-mix(in srgb, var(--color-border) 60%, transparent)',
              }}
            >
              <Search size={15} />
              Search chats
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'var(--color-surface)', color: 'var(--color-text-faint)' }}>
                ⌘K
              </span>
            </button>
          </div>

          {/* Chat list */}
          <div className="px-4 pb-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-faint)' }}>
              Conversations
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
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
                  closeIfMobile();
                }}
                onRename={onRenameChat}
                onDelete={onDeleteChat}
                onTogglePin={onTogglePin}
              />
            ))}
          </div>

          {/* Bottom section */}
          <div
            className="px-3 pt-3 shrink-0"
            style={{
              borderTop: '1px solid color-mix(in srgb, var(--color-border) 82%, transparent)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
            }}
          >
            <div
              className="poe-panel rounded-2xl p-2.5"
              style={{ background: 'color-mix(in srgb, var(--color-surface) 72%, transparent)' }}
            >
              <div className="flex items-center gap-2 px-1 pb-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold"
                  style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text)' }}
                >
                  {(email || '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-faint)' }}>
                    Signed in
                  </div>
                  <div className="truncate text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenSettings}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-colors poe-control"
                  style={{ color: 'var(--color-text-muted)' }}
                  title="Settings"
                >
                  <SettingsIcon size={15} />
                  <span className="text-xs font-medium">Settings</span>
                </button>
                <button
                  onClick={onSignOut}
                  className="p-2.5 rounded-xl transition-colors poe-control"
                  style={{ color: 'var(--color-text-faint)' }}
                  title="Sign out"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
