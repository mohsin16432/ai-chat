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
import { loadSkills } from './lib/skills';

// Core layout & view components
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
import ArtifactsPanel from './components/chat/ArtifactsPanel';

// Lucide Icons (Correctly Imported to prevent crashes)
import { Loader2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Phase 3 & Phase 5 States
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [searchingWeb, setSearchingWeb] = useState(false);

  const { settings, updateSettings } = useSettings();

  // --- PERSISTENCE & DEFAULT CLEANUP LOGIC ---
  // If your useSettings hook initializes with 2 default models, we intercept and sanitize them here.
  // We also ensure that settings are saved to localStorage whenever they change.
  useEffect(() => {
    if (settings) {
      const storedSettings = localStorage.getItem('app_settings');
      if (!storedSettings) {
        // First time initialization: force empty models instead of showing 2 default models
        updateSettings({
          ...settings,
          models: [],
          defaultModelId: ''
        });
        localStorage.setItem('app_settings', JSON.stringify({ ...settings, models: [], defaultModelId: '' }));
      } else {
        // If settings exist in localStorage, ensure they are synchronized
        try {
          const parsed = JSON.parse(storedSettings);
          // If the in-memory settings mismatch the stored settings, sync them
          if (JSON.stringify(parsed.models) !== JSON.stringify(settings.models)) {
            updateSettings(parsed);
          }
        } catch (e) {
          console.error("Failed to parse stored settings", e);
        }
      }
    }
  }, []);

  // Intercept updateSettings to write directly to localStorage for instant, bulletproof persistence
  const handleUpdateSettings = (newSettings) => {
    updateSettings(newSettings);
    localStorage.setItem('app_settings', JSON.stringify(newSettings));
  };

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

  // Auth Subscription
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

  // Subscribe to global View Artifact trigger events
  useEffect(() => {
    const handleOpenArtifact = (e) => {
      setActiveArtifact(e.detail);
    };
    
    window.addEventListener('view-artifact', handleOpenArtifact);
    return () => {
      window.removeEventListener('view-artifact', handleOpenArtifact);
    };
  }, []);

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

    await updateMessage(activeChatId, messageId, newContent, activeChatIdRef);

    const cached = messagesCache.current.get(activeChatId) || [];
    const idx = cached.findIndex((m) => m.id === messageId);
    if (idx === -1) return;

    const afterMessages = cached.slice(idx + 1);
    if (afterMessages.length > 0) {
      const ids = afterMessages.map((m) => m.id);
      await supabase.from('messages').delete().in('id', ids);

      const remaining = cached.slice(0, idx + 1);
      remaining[idx] = { ...remaining[idx], content: newContent };
      messagesCache.current.set(activeChatId, remaining);
    }

    await sendMessageFromContent(activeChatId, newContent, []);
  }

  // Regenerate assistant message
  async function handleRegenerate(messageId) {
    if (!activeChatId || sending) return;

    const cached = messagesCache.current.get(activeChatId) || [];
    const idx = cached.findIndex((m) => m.id === messageId);
    if (idx === -1) return;

    let userMessage = null;
    for (let i = idx - 1; i >= 0; i--) {
      if (cached[i].role === 'user') {
        userMessage = cached[i];
        break;
      }
    }
    if (!userMessage) return;

    const toDelete = cached.slice(idx);
    const ids = toDelete.map((m) => m.id);
    await supabase.from('messages').delete().in('id', ids);

    const remaining = cached.slice(0, idx);
    messagesCache.current.set(activeChatId, remaining);
    if (activeChatIdRef.current === activeChatId) {
      await loadMessages(activeChatId, activeChatIdRef);
    }

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
      let systemPrompt = currentChat?.system_prompt;

      const history = messagesCache.current.get(chatId) || [];
      const lastMessage = history[history.length - 1];
      let finalUserPrompt = lastMessage?.content || text;

      // Extract and re-apply commands during message regeneration loops
      if (lastMessage && lastMessage.role === 'user' && lastMessage.content.startsWith('[Skill Executed:')) {
        const match = lastMessage.content.match(/^\[Skill Executed:\s*\/([^\]]+)\]/);
        if (match) {
          const commandTrigger = match[1].trim();
          const activeSkill = loadSkills().find(s => s.command === commandTrigger);
          if (activeSkill) {
            const skillDirective = `[COMMAND DIRECTIVE: /${activeSkill.command} - ${activeSkill.name}]\n${activeSkill.systemPrompt}`;
            systemPrompt = systemPrompt ? `${systemPrompt}\n\n${skillDirective}` : skillDirective;

            const rawUserText = lastMessage.content.replace(/^\[Skill Executed:\s*\/[^\]]+\]\n?/, '');
            finalUserPrompt = `[SYSTEM INSTRUCTION: You must adopt the persona/rules of /${activeSkill.command} for your reply. Instructions: ${activeSkill.systemPrompt}]\n\nUser Message: ${rawUserText}`;
          }
        }
      }

      const historyPaths = history.flatMap((m) => m.attachments || []);
      const historyUrlMap = historyPaths.length ? await resolveUrls(historyPaths) : {};

      const messagesToConvert = history.slice(0, -1);

      const llmMessages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...messagesToConvert.map((m) => ({
          role: m.role,
          content: m.content,
          imageUrls: (m.attachments || []).map((p) => historyUrlMap[p]).filter(Boolean),
        })),
        { role: 'user', content: finalUserPrompt, imageUrls: (lastMessage?.attachments || []).map((p) => historyUrlMap[p]).filter(Boolean) },
      ];

      // Visual Console Diagnostics
      console.groupCollapsed(
        `%c🤖 LLM Regeneration Request Payload`, 
        'color: #ec4899; font-weight: bold; font-size: 11px;'
      );
      console.log('%cAPI Endpoint:', 'color: #a3a3a3;', settings.baseUrl);
      console.log('%cModel Assigned:', 'color: #a3a3a3;', activeModel.id);
      console.log('%cFormatted Message Payload Array:', 'color: #a3a3a3;', llmMessages);
      console.groupEnd();

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

  // Main message dispatch pipeline
  async function sendMessage(text, files, activeSkill = null, documents = [], webSearchActive = false) {
    if ((!text && files.length === 0 && documents.length === 0) || sending) return;

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

      // Web Search Execution Handler
      let searchContextText = '';
      if (webSearchActive) {
        setSearchingWeb(true);
        try {
          const { performWebSearch } = await import('./lib/search');
          const results = await performWebSearch(
            text, 
            settings.searchProvider || 'duckduckgo', 
            settings.searchApiKey
          );
          
          if (results && results.length > 0) {
            searchContextText = `[REAL-TIME WEB SEARCH RESULTS FOR: "${text}"]\n` +
              `===================================\n` +
              results.map((r, idx) => 
                `Result [${idx + 1}]: ${r.title}\n` +
                `URL: ${r.url}\n` +
                `Snippet: ${r.snippet}\n`
              ).join('\n') +
              `===================================\n` +
              `Instructions: Synthesize the web search results above to provide an accurate, up-to-date reply. Cite URLs using [index] markers.\n\n`;
          }
        } catch (searchErr) {
          console.warn('Web search failed:', searchErr);
        } finally {
          setSearchingWeb(false);
        }
      }

      const uid = session.user.id;
      const paths = [];
      const dataUrls = [];

      // Safe fallback for WebViews that do not support crypto.randomUUID natively
      const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      for (const originalFile of files) {
        const f = await downscaleImage(originalFile);
        const ext = (f.name.split('.').pop() || 'bin').toLowerCase();
        const path = `${uid}/${generateUUID()}.${ext}`;
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

      // Structuring user records
      let dbContent = text;
      if (activeSkill) {
        dbContent = `[Skill Executed: /${activeSkill.command}]\n${dbContent}`;
      }
      if (documents.length > 0) {
        const docNames = documents.map(doc => `📎 ${doc.name}`).join(', ');
        dbContent = `[Attached Files: ${docNames}]\n${dbContent}`;
      }
      if (webSearchActive && searchContextText) {
        dbContent = `🔍 [Web Search Triggered]\n${dbContent}`;
      }

      const { data: userMsg, error: insErr } = await supabase
        .from('messages')
        .insert({ chat_id: chatId, role: 'user', content: dbContent, attachments: paths })
        .select()
        .single();
      if (insErr) throw new Error(insErr.message);

      appendMessage(chatId, userMsg, activeChatIdRef);

      const currentChat = chats.find((c) => c.id === chatId);
      let systemPrompt = currentChat?.system_prompt;

      if (activeSkill) {
        const skillDirective = `[COMMAND DIRECTIVE: /${activeSkill.command} - ${activeSkill.name}]\n${activeSkill.systemPrompt}`;
        systemPrompt = systemPrompt ? `${systemPrompt}\n\n${skillDirective}` : skillDirective;
      }

      const history = (messagesCache.current.get(chatId) || []).slice(0, -1);
      const historyPaths = history.flatMap((m) => m.attachments || []);
      const historyUrlMap = historyPaths.length ? await resolveUrls(historyPaths) : {};

      // Parse inline document payload blocks
      let documentContextText = '';
      if (documents.length > 0) {
        documentContextText = documents.map(doc => 
          `[ATTACHED FILE REFERENCE: ${doc.name}]\n` +
          `===================================\n` +
          `${doc.content}\n` +
          `===================================`
        ).join('\n\n') + '\n\n';
      }

      // Context Assembly
      let finalUserPrompt = text;
      if (activeSkill) {
        finalUserPrompt = `[SYSTEM INSTRUCTION: You must adopt the persona/rules of /${activeSkill.command} for your reply. Instructions: ${activeSkill.systemPrompt}]\n\nUser Message: ${finalUserPrompt}`;
      }
      if (documentContextText) {
        finalUserPrompt = `${documentContextText}User Query: ${finalUserPrompt}`;
      }
      if (searchContextText) {
        finalUserPrompt = `${searchContextText}User Query: ${finalUserPrompt}`;
      }

      const llmMessages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...history.map((m) => ({
          role: m.role,
          content: m.content,
          imageUrls: (m.attachments || []).map((p) => historyUrlMap[p]).filter(Boolean),
        })),
        { role: 'user', content: finalUserPrompt, imageUrls: dataUrls },
      ];

      const currentModel = getActiveModel(settings, chats, chatId);

      // Visual Console Diagnostics
      console.groupCollapsed(
        `%c🤖 LLM Request Payload [Docs: ${documents.length} | Search: ${webSearchActive}]`, 
        'color: #3b82f6; font-weight: bold; font-size: 11px;'
      );
      console.log('%cAPI Endpoint:', 'color: #a3a3a3;', settings.baseUrl);
      console.log('%cModel Assigned:', 'color: #a3a3a3;', currentModel?.id || settings.defaultModelId);
      console.log('%cFormatted Messages Payload Array:', 'color: #a3a3a3;', llmMessages);
      console.groupEnd();

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
      setSearchingWeb(false);
      stopStreaming();
    }
  }

  if (!authReady) return null;
  if (!session) return <AuthScreen />;

  return (
    <div className="flex h-dvh pt-safe overflow-hidden" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>
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

      {/* Main split-pane wrapper context with safe height boundaries */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-w-0 h-full relative">
        <main className="flex flex-1 flex-col h-full min-w-0 overflow-hidden">
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
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              
              <MessageList
                messages={messages}
                urlMap={urlMap}
                streamingText={streamingText}
                onEditMessage={handleEditMessage}
                onRegenerate={handleRegenerate}
              />

              {error && (
                <div className="mx-auto max-w-3xl w-full px-4 pb-2 shrink-0">
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

              {/* Web search progress loader element */}
              {searchingWeb && (
                <div className="mx-auto max-w-3xl w-full px-4 pb-2 shrink-0">
                  <div 
                    className="rounded-xl px-4 py-3 text-xs flex items-center gap-2"
                    style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-accent-hover)', border: '1px solid var(--color-accent)' }}
                  >
                    <Loader2 className="animate-spin" size={14} />
                    <span>Searching the web for live resources and citing facts...</span>
                  </div>
                </div>
              )}

              <ChatInput
                onSend={sendMessage}
                sending={sending}
                onCancel={cancelStreaming}
              />
            </div>
          ) : (
            <EmptyState />
          )}
        </main>

        {/* Dynamic Slide-out Artifact Preview Panel */}
        {activeArtifact && (
          <ArtifactsPanel
            artifact={activeArtifact}
            onClose={() => setActiveArtifact(null)}
          />
        )}
      </div>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleUpdateSettings}
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