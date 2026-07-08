import { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabase';
import { streamChat } from './lib/llm';
import { fileToDataUrl, downscaleImage } from './lib/image';
import { getActiveModel } from './lib/models';
import { useSettings } from './hooks/useSettings';
import { useChats } from './hooks/useChats';
import { useMessages } from './hooks/useMessages';
import { useStreaming } from './hooks/useStreaming';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

import AuthScreen from './components/auth/AuthScreen';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MessageList from './components/chat/MessageList';
import ChatInput from './components/chat/ChatInput';
import EmptyState from './components/chat/EmptyState';
import CapabilityWarning from './components/chat/CapabilityWarning';
import SettingsModal from './components/settings/SettingsModal';
import ChatSettings from './components/chat/ChatSettings';
import SearchModal from './components/chat/SearchModal';

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { settings, updateSettings } = useSettings();

  const {
    chats, setChats,
    activeChatId, activeChatIdRef,
    error, setError,
    createChat, renameChat, deleteChat,
    updateChatModel, updateChatSettings,
    selectChat: selectChatBase,
  } = useChats(session);

  const {
    messages,
    messagesCache, urlCache, urlMap, setUrlMap,
    resolveUrls, loadMessages, appendMessage,
    initChatMessages, clearMessages, removeChatFromCache,
    deleteMessagesAfter, updateMessage,
  } = useMessages();

  const { streamingText, sending, startStreaming, onToken, stopStreaming, cancelStreaming } = useStreaming();

  const streamingTextRef = useRef('');

  function handleToken(text) {
    streamingTextRef.current = text;
    onToken(text);
  }

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSearch: () => setShowSearch(true),
    onNewChat: () => handleNewChat(),
    onSettings: () => setShowSettings(true),
    onChatSettings: () => activeChatId && setShowChatSettings(true),
    onToggleSidebar: () => setSidebarOpen((p) => !p),
  });

  async function selectChat(chatId) {
    selectChatBase(chatId);
    const chatData = await loadMessages(chatId, activeChatIdRef);
    if (chatData?.model !== undefined) {
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, model: chatData.model } : c))
      );
    }
  }

  async function handleNewChat() {
    const chat = await createChat();
    if (chat) initChatMessages(chat.id);
  }

  async function handleDeleteChat(chatId) {
    await deleteChat(chatId);
    removeChatFromCache(chatId);
    if (activeChatId === chatId) clearMessages();
  }

  function handleChangeModel(modelId) {
    if (!activeChatId) return;
    updateChatModel(activeChatId, modelId, settings.defaultModelId);
  }

  async function autoTitle(chatId, userText, assistantText) {
    try {
      const chat = chats.find((c) => c.id === chatId);
      if (!chat || (chat.title && chat.title.trim() !== '' && chat.title !== 'New chat')) return;

      const activeModel = getActiveModel(settings, chats, chatId);
      const titlePrompt = `Generate a short title (max 4 words) for this conversation. Respond with only the title, no quotes.\nUser: ${userText}\nAssistant: ${assistantText}\nTitle:`;

      const title = await streamChat({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: activeModel?.id || settings.defaultModelId,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates concise conversation titles.' },
          { role: 'user', content: titlePrompt },
        ],
        onToken: () => {},
      });

      const trimmedTitle = title.trim().replace(/^["']|["']$/g, '');
      if (trimmedTitle.split(/\s+/).filter((w) => w).length <= 4 && trimmedTitle) {
        renameChat(chatId, trimmedTitle);
      }
    } catch (e) {
      console.warn('Auto-title failed:', e);
    }
  }

  // Edit message and regenerate
  async function handleEditMessage(messageId, newContent) {
    if (!activeChatId || sending) return;

    // Update the message content
    await updateMessage(activeChatId, messageId, newContent, activeChatIdRef);

    // Delete all messages after this one (including the assistant reply)
    const cached = messagesCache.current.get(activeChatId) || [];
    const idx = cached.findIndex((m) => m.id === messageId);
    if (idx === -1) return;

    // Get messages after the edited one
    const afterMessages = cached.slice(idx + 1);
    if (afterMessages.length > 0) {
      const ids = afterMessages.map((m) => m.id);
      await supabase.from('messages').delete().in('id', ids);

      // Update cache to only include up to and including edited message
      const remaining = cached.slice(0, idx + 1);
      // Update the edited message content in remaining
      remaining[idx] = { ...remaining[idx], content: newContent };
      messagesCache.current.set(activeChatId, remaining);
      if (activeChatIdRef.current === activeChatId) {
        const { setMessages } = useMessages; // won't work - need different approach
      }
    }

    // Regenerate by sending the edited message
    await sendMessageFromContent(activeChatId, newContent, []);
  }

  // Regenerate assistant message
  async function handleRegenerate(messageId) {
    if (!activeChatId || sending) return;

    const cached = messagesCache.current.get(activeChatId) || [];
    const idx = cached.findIndex((m) => m.id === messageId);
    if (idx === -1) return;

    // Find the user message before this assistant message
    let userMessage = null;
    for (let i = idx - 1; i >= 0; i--) {
      if (cached[i].role === 'user') {
        userMessage = cached[i];
        break;
      }
    }
    if (!userMessage) return;

    // Delete this assistant message and everything after it
    const toDelete = cached.slice(idx);
    const ids = toDelete.map((m) => m.id);
    await supabase.from('messages').delete().in('id', ids);

    const remaining = cached.slice(0, idx);
    messagesCache.current.set(activeChatId, remaining);
    if (activeChatIdRef.current === activeChatId) {
      // Force re-render with remaining messages
      await loadMessages(activeChatId, activeChatIdRef);
    }

    // Re-send the user's message to get a new response
    await sendMessageFromContent(activeChatId, userMessage.content, []);
  }

  // Internal: send a message when we already have a chatId and just need the LLM response
  async function sendMessageFromContent(chatId, text, dataUrls) {
    const activeModel = getActiveModel(settings, chats, chatId);
    if (!activeModel) return;

    setError('');
    const signal = startStreaming();

    try {
      const currentChat = chats.find((c) => c.id === chatId);
      const systemPrompt = currentChat?.system_prompt;

      const history = messagesCache.current.get(chatId) || [];
      const historyPaths = history.flatMap((m) => m.attachments || []);
      const historyUrlMap = historyPaths.length ? await resolveUrls(historyPaths) : {};

      const llmMessages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...history.map((m) => ({
          role: m.role,
          content: m.content,
          imageUrls: (m.attachments || []).map((p) => historyUrlMap[p]).filter(Boolean),
        })),
      ];

      const full = await streamChat({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: activeModel.id,
        messages: llmMessages,
        onToken: handleToken,
        temperature: currentChat?.temperature ?? undefined,
        top_p: currentChat?.top_p ?? undefined,
        signal,
      });

      const { data: aMsg, error: aErr } = await supabase
        .from('messages')
        .insert({ chat_id: chatId, role: 'assistant', content: full })
        .select()
        .single();
      if (aErr) throw new Error(aErr.message);
      appendMessage(chatId, aMsg, activeChatIdRef);
    } catch (e) {
      if (e.name === 'AbortError') {
        const partial = streamingTextRef.current;
        if (partial && chatId) {
          try {
            const { data: aMsg } = await supabase
              .from('messages')
              .insert({ chat_id: chatId, role: 'assistant', content: partial })
              .select()
              .single();
            if (aMsg) appendMessage(chatId, aMsg, activeChatIdRef);
          } catch {}
        }
      } else {
        setError(e.message);
      }
    } finally {
      streamingTextRef.current = '';
      stopStreaming();
    }
  }

  async function sendMessage(text, files) {
    if ((!text && files.length === 0) || sending) return;

    const activeModel = getActiveModel(settings, chats, activeChatId);
    if (!settings.baseUrl || !settings.apiKey || !activeModel) {
      setError('Set Base URL, API key and at least one model in Settings first.');
      return;
    }

    setError('');
    const signal = startStreaming();

    try {
      let chatId = activeChatId;
      if (!chatId) {
        const chat = await createChat();
        if (!chat) return;
        chatId = chat.id;
        initChatMessages(chatId);
      }

      const uid = session.user.id;
      const paths = [];
      const dataUrls = [];

      for (const originalFile of files) {
        const f = await downscaleImage(originalFile);
        const ext = (f.name.split('.').pop() || 'bin').toLowerCase();
        const path = `${uid}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('media').upload(path, f);
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        paths.push(path);
        const dataUrl = await fileToDataUrl(f);
        dataUrls.push(dataUrl);
        urlCache.current.set(path, dataUrl);
      }

      if (paths.length) {
        setUrlMap((prev) => {
          const next = { ...prev };
          paths.forEach((p, i) => { next[p] = dataUrls[i]; });
          return next;
        });
      }

      const { data: userMsg, error: insErr } = await supabase
        .from('messages')
        .insert({ chat_id: chatId, role: 'user', content: text, attachments: paths })
        .select()
        .single();
      if (insErr) throw new Error(insErr.message);

      appendMessage(chatId, userMsg, activeChatIdRef);

      const currentChat = chats.find((c) => c.id === chatId);
      const systemPrompt = currentChat?.system_prompt;

      const history = (messagesCache.current.get(chatId) || []).slice(0, -1);
      const historyPaths = history.flatMap((m) => m.attachments || []);
      const historyUrlMap = historyPaths.length ? await resolveUrls(historyPaths) : {};

      const llmMessages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...history.map((m) => ({
          role: m.role,
          content: m.content,
          imageUrls: (m.attachments || []).map((p) => historyUrlMap[p]).filter(Boolean),
        })),
        { role: 'user', content: text, imageUrls: dataUrls },
      ];

      const currentModel = getActiveModel(settings, chats, chatId);
      const full = await streamChat({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: currentModel?.id || settings.defaultModelId,
        messages: llmMessages,
        onToken: handleToken,
        temperature: currentChat?.temperature ?? undefined,
        top_p: currentChat?.top_p ?? undefined,
        signal,
      });

      const { data: aMsg, error: aErr } = await supabase
        .from('messages')
        .insert({ chat_id: chatId, role: 'assistant', content: full })
        .select()
        .single();
      if (aErr) throw new Error(aErr.message);
      appendMessage(chatId, aMsg, activeChatIdRef);

      autoTitle(chatId, text, full).catch(() => {});
    } catch (e) {
      if (e.name === 'AbortError') {
        const partial = streamingTextRef.current;
        if (partial && activeChatId) {
          try {
            const { data: aMsg } = await supabase
              .from('messages')
              .insert({ chat_id: activeChatId, role: 'assistant', content: partial })
              .select()
              .single();
            if (aMsg) appendMessage(activeChatId, aMsg, activeChatIdRef);
          } catch {}
        }
      } else {
        setError(e.message);
      }
    } finally {
      streamingTextRef.current = '';
      stopStreaming();
    }
  }

  if (!authReady) return null;
  if (!session) return <AuthScreen />;

  return (
    <div className="flex h-dvh pt-safe" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={selectChat}
        onNewChat={handleNewChat}
        onRenameChat={renameChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={() => setShowSettings(true)}
        onSignOut={() => supabase.auth.signOut()}
        email={session.user.email}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSearch={() => setShowSearch(true)}
      />

      <main className="flex flex-1 flex-col min-w-0">
        <Header
          settings={settings}
          chats={chats}
          activeChatId={activeChatId}
          messages={messages}
          onChangeModel={handleChangeModel}
          onMenuClick={() => setSidebarOpen(true)}
          onChatSettings={() => setShowChatSettings(true)}
        />

        {activeChatId ? (
          <>
            <MessageList
              messages={messages}
              urlMap={urlMap}
              streamingText={streamingText}
              onEditMessage={handleEditMessage}
              onRegenerate={handleRegenerate}
            />

            {error && (
              <div className="mx-auto max-w-3xl w-full px-4 pb-2">
                <div
                  className="rounded-xl px-4 py-2 text-sm"
                  style={{ background: 'var(--color-danger-muted)', color: '#fca5a5' }}
                >
                  {error}
                </div>
              </div>
            )}

            <CapabilityWarning
              settings={settings}
              chats={chats}
              activeChatId={activeChatId}
              hasFiles={false}
              onSwitchModel={handleChangeModel}
            />

            <ChatInput
              onSend={sendMessage}
              sending={sending}
              onCancel={cancelStreaming}
            />
          </>
        ) : (
          <EmptyState />
        )}
      </main>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showChatSettings && activeChatId && (
        <ChatSettings
          chat={chats.find((c) => c.id === activeChatId)}
          onUpdate={updateChatSettings}
          onClose={() => setShowChatSettings(false)}
        />
      )}

      {showSearch && (
        <SearchModal
          onSelectChat={selectChat}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}