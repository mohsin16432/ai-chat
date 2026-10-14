import { useEffect, useState, useRef, lazy, Suspense } from 'react';
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
import { useFoldersState, usePersonasState } from './hooks/useOrgData';
import { createFolder } from './lib/folders';
import { getContextOpts, compactHistory } from './lib/contextMgmt';

// Core layout & view components
import AuthScreen from './components/auth/AuthScreen';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MessageList from './components/chat/MessageList';
import ChatInput from './components/chat/ChatInput';
import EmptyState from './components/chat/EmptyState';
import CapabilityWarning from './components/chat/CapabilityWarning';

// Heavy modals — lazy-loaded to reduce initial bundle
const SettingsModal = lazy(() => import('./components/settings/SettingsModal'));
const ChatSettings = lazy(() => import('./components/chat/ChatSettings'));
const SearchModal = lazy(() => import('./components/chat/SearchModal'));
const ArtifactsPanel = lazy(() => import('./components/chat/ArtifactsPanel'));
const PersonasModal = lazy(() => import('./components/settings/PersonasModal'));
const CompareModal = lazy(() => import('./components/chat/CompareModal'));
const ImportExportModal = lazy(() => import('./components/chat/ImportExportModal'));
const PresetsModal = lazy(() => import('./components/chat/PresetsModal'));

// Lucide Icons (Correctly Imported to prevent crashes)
import { Loader2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPersonas, setShowPersonas] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [syncState, setSyncState] = useState({ busy: false, msg: '' });
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 768;
  });
  const messageListRef = useRef(null);

  const [folderFilter, setFolderFilter] = useState(null); // null = all
  
  // Phase 3 & Phase 5 States
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [searchingWeb, setSearchingWeb] = useState(false);

  const { settings, updateSettings } = useSettings();
  const folders = useFoldersState();
  const personas = usePersonasState();

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

  // Apply theme to <html>
  useEffect(() => {
    const theme = settings?.theme || 'dark';
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#ffffff' : '#18181b');
  }, [settings?.theme]);

  function handleToggleTheme() {
    handleUpdateSettings({ ...settings, theme: settings?.theme === 'light' ? 'dark' : 'light' });
  }

  const {
    chats, setChats,
    activeChatId, activeChatIdRef,
    error, setError,
    createChat, renameChat, deleteChat, togglePin,
    updateChatModel, updateChatSettings,
    selectChat: selectChatBase,
  } = useChats(session);

  const {
    messages,
    messagesCache, urlCache, urlMap, setUrlMap,
    resolveUrls, loadMessages, appendMessage,
    initChatMessages, clearMessages, removeChatFromCache,
    deleteMessagesAfter, updateMessage, updateMessageFeedback,
  } = useMessages();

  const { streamingText, sending, startStreaming, onToken, stopStreaming, cancelStreaming } = useStreaming();

  const streamingTextRef = useRef('');
  const genStartRef = useRef(0);

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
    onExport: () => {
      setShowImportExport(true);
    },
    onPresets: () => setShowPresets(true),
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

  // Jump from search results to a specific message: ensure the chat is loaded,
  // then scroll to the message anchor in the list.
  async function handleJumpToMessage(chatId, messageId) {
    if (chatId !== activeChatId) {
      await selectChat(chatId);
    }
    // Wait a tick for messages to load/scroll, then scroll to the anchor.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        messageListRef.current?.scrollToMessage(messageId);
      });
    });
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

  // Duplicate a chat: copy its settings + messages into a new chat.
  async function handleDuplicateChat(chatId) {
    if (!session) return;
    try {
      const src = chats.find((c) => c.id === chatId);
      if (!src) return;

      const { data: newChat, error: chatErr } = await supabase
        .from('chats')
        .insert({
          user_id: session.user.id,
          title: (src.title || 'Untitled chat') + ' (copy)',
          model: src.model ?? null,
          system_prompt: src.system_prompt ?? null,
          temperature: src.temperature ?? null,
          top_p: src.top_p ?? null,
        })
        .select()
        .single();
      if (chatErr) throw chatErr;

      const { data: srcMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (srcMessages && srcMessages.length > 0) {
        const copies = srcMessages.map((m) => ({
          chat_id: newChat.id,
          role: m.role,
          content: m.content,
          attachments: m.attachments ?? null,
          model: m.model ?? null,
          usage: m.usage ?? null,
        }));
        const { error: msgErr } = await supabase.from('messages').insert(copies);
        if (msgErr) throw msgErr;
      }

      setChats((prev) => [newChat, ...prev]);
    } catch (err) {
      console.error('Duplicate chat failed:', err);
      setError(err.message || 'Failed to duplicate chat');
    }
  }

  // Start a new chat seeded with a persona's system prompt + settings.
  async function handleStartWithPersona(persona) {
    setShowPersonas(false);
    const chat = await createChat();
    if (!chat) return;
    initChatMessages(chat.id);
    const patch = {
      system_prompt: persona.systemPrompt || null,
      temperature: persona.temperature ?? 0.7,
      top_p: persona.top_p ?? 1.0,
    };
    if (persona.model) patch.model = persona.model;
    await updateChatSettings(chat.id, patch);
    setChats((prev) =>
      prev.map((c) => (c.id === chat.id ? { ...c, ...patch } : c))
    );
  }

  function handleChangeModel(modelId) {
    if (!activeChatId) {
      handleUpdateSettings({ ...settings, defaultModelId: modelId });
      return;
    }
    updateChatModel(activeChatId, modelId, settings.defaultModelId);
  }

  // Local-first cloud mirror for personas + folders via Supabase Storage.
  async function handleSync() {
    if (!session) return;
    setSyncState({ busy: true, msg: 'Backing up…' });
    try {
      const push = await import('./lib/orgSync').then((m) => m.pushOrgData(session));
      if (!push.ok) {
        setSyncState({ busy: false, msg: `Backup failed: ${push.reason}` });
        return;
      }
      setSyncState({ busy: true, msg: 'Restoring…' });
      const pull = await import('./lib/orgSync').then((m) => m.pullOrgData(session));
      if (!pull.ok) {
        setSyncState({ busy: false, msg: `Restore failed: ${pull.reason}` });
        return;
      }
      setSyncState({ busy: false, msg: `Synced (${pull.applied} item${pull.applied === 1 ? '' : 's'} restored)` });
    } catch (err) {
      setSyncState({ busy: false, msg: `Sync error: ${err.message || 'unknown'}` });
    } finally {
      setTimeout(() => setSyncState({ busy: false, msg: '' }), 3500);
    }
  }

  async function autoTitle(chatId, userText, assistantText) {
    try {
      const chat = chats.find((c) => c.id === chatId);
      if (!chat || (chat.title && chat.title.trim() !== '' && chat.title !== 'New chat')) return;

      const activeModel = getActiveModel(settings, chats, chatId);
      const titlePrompt = `Generate a short title (max 4 words) for this conversation. Respond with only the title, no quotes.\nUser: ${userText}\nAssistant: ${assistantText}\nTitle:`;

      const titleResult = await streamChat({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: activeModel?.id || settings.defaultModelId,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates concise conversation titles.' },
          { role: 'user', content: titlePrompt },
        ],
        onToken: () => {},
        proxySettings: settings,
      });

      const trimmedTitle = (titleResult?.text || '').trim().replace(/^["']|["']$/g, '');
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

  // Persist thumbs up/down feedback on assistant messages
  function handleFeedback(messageId, feedback) {
    if (!activeChatId) return;
    updateMessageFeedback(activeChatId, messageId, feedback, activeChatIdRef);
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
    genStartRef.current = performance.now();
    genStartRef.current = performance.now();

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

      const compactedHistory = compactHistory(history, getContextOpts(chatId));
      const messagesToConvert = compactedHistory.slice(0, -1);

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

      const { text: full, usage } = await streamChat({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: activeModel.id,
        messages: llmMessages,
        onToken: handleToken,
        temperature: currentChat?.temperature ?? undefined,
        top_p: currentChat?.top_p ?? undefined,
        signal,
        proxySettings: settings,
      });

      const { data: aMsg, error: aErr } = await supabase
        .from('messages')
        .insert({ chat_id: chatId, role: 'assistant', content: full, model: activeModel.id, usage: usage ? { ...usage, gen_ms: Math.round(performance.now() - genStartRef.current) } : null })
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
              .insert({ chat_id: chatId, role: 'assistant', content: partial, model: activeModel.id })
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
            settings.searchApiKey,
            settings
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

      const history = compactHistory(messagesCache.current.get(chatId) || [], getContextOpts(chatId)).slice(0, -1);
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

      const sentModelId = currentModel?.id || settings.defaultModelId;

      const { text: full, usage } = await streamChat({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: sentModelId,
        messages: llmMessages,
        onToken: handleToken,
        temperature: currentChat?.temperature ?? undefined,
        top_p: currentChat?.top_p ?? undefined,
        signal,
        proxySettings: settings,
      });

      const { data: aMsg, error: aErr } = await supabase
        .from('messages')
        .insert({ chat_id: chatId, role: 'assistant', content: full, model: sentModelId, usage: usage ? { ...usage, gen_ms: Math.round(performance.now() - genStartRef.current) } : null })
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
              .insert({ chat_id: activeChatId, role: 'assistant', content: partial, model: sentModelId })
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

  if (!authReady) return (
    <div className="flex h-dvh items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-text-faint)' }} />
    </div>
  );
  if (!session) return <AuthScreen />;

  return (
    <div className="app-stage flex h-dvh overflow-hidden pt-safe" style={{ color: 'var(--color-text)' }}>
      <div className="app-shell flex h-full w-full overflow-hidden">
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={selectChat}
          onNewChat={handleNewChat}
          onRenameChat={renameChat}
          onDeleteChat={handleDeleteChat}
          onTogglePin={togglePin}
          onDuplicate={handleDuplicateChat}
          folders={folders.folders}
          assignments={folders.assignments}
          onAssignFolder={folders.setFolder}
          onNewFolder={() => {
            const name = window.prompt('Folder name');
            if (name && name.trim()) createFolder(name, null);
          }}
          onOpenPersonas={() => setShowPersonas(true)}
          onOpenSettings={() => setShowSettings(true)}
          onSignOut={() => supabase.auth.signOut()}
          email={session.user.email}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSearch={() => setShowSearch(true)}
          folderFilter={folderFilter}
          onFilterFolder={setFolderFilter}
          onSync={handleSync}
          syncState={syncState}
        />

        {/* Main split-pane wrapper context with safe height boundaries */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-w-0 h-full relative">
          <main
            className="app-main-surface flex flex-1 flex-col h-full min-w-0 overflow-hidden"
          >
            <Header
              settings={settings}
              chats={chats}
              activeChatId={activeChatId}
              messages={messages}
              onChangeModel={handleChangeModel}
              onMenuClick={() => setSidebarOpen((prev) => !prev)}
              onChatSettings={() => setShowChatSettings(true)}
              onToggleTheme={handleToggleTheme}
            onCompare={() => setShowCompare(true)}
            onImportExport={() => setShowImportExport(true)}
            onPresets={() => setShowPresets(true)}
            />

            {activeChatId ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              
                <MessageList
                  ref={messageListRef}
                  messages={messages}
                  urlMap={urlMap}
                  streamingText={streamingText}
                  streamStats={streamStats}
                  onEditMessage={handleEditMessage}
                  onRegenerate={handleRegenerate}
                  onFeedback={handleFeedback}
                  settings={settings}
                  chats={chats}
                  activeChatId={activeChatId}
                />

                {error && (
                  <div className="mx-auto max-w-4xl w-full px-4 pb-2 shrink-0">
                    <div
                      className="rounded-2xl px-4 py-2.5 text-sm"
                      style={{
                        background: 'var(--color-danger-muted)',
                        color: 'var(--color-danger-text)',
                        border: '1px solid color-mix(in srgb, var(--color-danger) 22%, transparent)',
                      }}
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
                  <div className="mx-auto max-w-4xl w-full px-4 pb-2 shrink-0">
                    <div
                      className="rounded-2xl px-4 py-3 text-xs flex items-center gap-2"
                      style={{
                        background: 'var(--color-accent-muted)',
                        color: 'var(--color-accent-hover)',
                        border: '1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)',
                      }}
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
            <Suspense fallback={null}>
              <ArtifactsPanel
                artifact={activeArtifact}
                onClose={() => setActiveArtifact(null)}
              />
            </Suspense>
          )}
        </div>
      </div>

      {showSettings && (
        <Suspense fallback={null}>
          <SettingsModal
            settings={settings}
            onSave={handleUpdateSettings}
            onClose={() => setShowSettings(false)}
          />
        </Suspense>
      )}

      {showChatSettings && activeChatId && (
        <Suspense fallback={null}>
          <ChatSettings
            chat={chats.find((c) => c.id === activeChatId)}
            settings={settings}
            messages={messages}
            onUpdate={updateChatSettings}
            onClose={() => setShowChatSettings(false)}
          />
        </Suspense>
      )}

      {showSearch && (
        <Suspense fallback={null}>
          <SearchModal
            activeChatId={activeChatId}
            onJumpToMessage={handleJumpToMessage}
            onSelectChat={selectChat}
            onClose={() => setShowSearch(false)}
          />
        </Suspense>
      )}

      {showPersonas && (
        <Suspense fallback={null}>
          <PersonasModal
            models={settings.models || []}
            defaultModelId={settings.defaultModelId}
            onClose={() => setShowPersonas(false)}
            onUse={handleStartWithPersona}
          />
        </Suspense>
      )}

      {showCompare && (
        <Suspense fallback={null}>
          <CompareModal
            settings={settings}
            onClose={() => setShowCompare(false)}
          />
        </Suspense>
      )}

      {showImportExport && (
        <Suspense fallback={null}>
          <ImportExportModal
            chat={activeChatId ? chats.find((c) => c.id === activeChatId) : null}
            messages={messages}
            session={session}
            onCreateRestored={(id) => selectChat(id)}
            onClose={() => setShowImportExport(false)}
          />
        </Suspense>
      )}

      {showPresets && (
        <Suspense fallback={null}>
          <PresetsModal
            onClose={() => setShowPresets(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
