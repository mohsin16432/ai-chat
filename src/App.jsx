import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from './lib/supabase';
import { streamChat } from './lib/llm';
import {
  Pencil, Plus, SendHorizonal, Paperclip, Settings as SettingsIcon,
  LogOut, X, Loader2, Trash2,
} from 'lucide-react';

const SETTINGS_KEY = 'llm-settings';
const SIGNED_URL_TTL = 60 * 60;

const CAPABILITY_KEYS = ['text', 'vision', 'imageGen', 'speech'];

const CAPABILITY_LABELS = {
  text: 'Text',
  vision: 'Vision (images in)',
  imageGen: 'Image generation',
  speech: 'Speech',
};

const CAPABILITY_ICONS = {
  text: '📝',
  vision: '👁️',
  imageGen: '🎨',
  speech: '🔊',
};

function makeModel(id, name, capabilities = {}) {
  return {
    id: id.trim(),
    name: (name || id).trim(),
    capabilities: {
      text: true,
      vision: false,
      imageGen: false,
      speech: false,
      ...capabilities,
    },
  };
}

function loadSettings() {
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    raw = {};
  }

  const settings = {
    baseUrl: raw.baseUrl || '',
    apiKey: raw.apiKey || '',
    models: Array.isArray(raw.models) ? raw.models.map((m) => makeModel(m.id, m.name, m.capabilities)) : [],
    defaultModelId: raw.defaultModelId || '',
  };

  // Migration: old shape had a single `model` string
  if (raw.model && settings.models.length === 0) {
    settings.models = [makeModel(raw.model, raw.model, { text: true })];
    settings.defaultModelId = raw.model;
  }

  // Ensure defaultModelId points to something that exists
  if (settings.models.length > 0 && !settings.models.find((m) => m.id === settings.defaultModelId)) {
    settings.defaultModelId = settings.models[0].id;
  }

  return settings;
}

function saveSettings(s) {
  setSettings(s);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function downscaleImage(file, maxDim = 1568) {
  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    if (width <= maxDim && height <= maxDim) {
      bitmap.close();
      return file;
    }

    const scale = Math.min(maxDim / width, maxDim / height);
    const newWidth = Math.round(width * scale);
    const newHeight = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
    bitmap.close();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );

    if (!blob) return file;

    const originalName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${originalName}.jpg`, { type: 'image/jpeg' });
  } catch (e) {
    console.warn('Downscale failed, using original:', e);
    return file;
  }
}

/* ---------------- Auth ---------------- */

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const fn =
      mode === 'signin'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    if (error) setError(error.message);
    setBusy(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-zinc-100 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 bg-zinc-800 p-6 rounded-xl">
        <h1 className="text-lg font-semibold">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>
        <input
          type="email" required placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded bg-zinc-900 px-3 py-2 text-sm outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
        />
        <input
          type="password" required placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded bg-zinc-900 px-3 py-2 text-sm outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded bg-zinc-100 text-zinc-900 py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="w-full text-xs text-zinc-400 hover:text-zinc-200"
        >
          {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}

/* ---------------- Settings modal ---------------- */

function SettingsModal({ settings, onSave, onClose }) {
  const [draft, setDraft] = useState({
    baseUrl: settings.baseUrl || '',
    apiKey: settings.apiKey || '',
    defaultModelId: settings.defaultModelId || '',
    models: settings.models || [],
  });

  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');

  function addModel() {
    const id = newModelId.trim();
    if (!id) return;
    if (draft.models.find((m) => m.id === id)) return;
    const next = [...draft.models, makeModel(id, newModelName || id)];
    setDraft({
      ...draft,
      models: next,
      defaultModelId: draft.defaultModelId || id,
    });
    setNewModelId('');
    setNewModelName('');
  }

  function removeModel(id) {
    const next = draft.models.filter((m) => m.id !== id);
    setDraft({
      ...draft,
      models: next,
      defaultModelId: draft.defaultModelId === id ? (next[0]?.id || '') : draft.defaultModelId,
    });
  }

  function toggleCap(id, cap) {
    setDraft({
      ...draft,
      models: draft.models.map((m) =>
        m.id === id ? { ...m, capabilities: { ...m.capabilities, [cap]: !m.capabilities[cap] } } : m
      ),
    });
  }

  function updateModelName(id, name) {
    setDraft({
      ...draft,
      models: draft.models.map((m) => (m.id === id ? { ...m, name } : m)),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-zinc-800 p-5 space-y-4 text-zinc-100">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Settings</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100"><X size={18} /></button>
        </div>

        <label className="block text-xs text-zinc-400">Base URL
          <input
            value={draft.baseUrl}
            onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
            placeholder="https://api.example.com/v1"
            className="mt-1 w-full rounded bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
          />
        </label>

        <label className="block text-xs text-zinc-400">API key
          <input
            type="password" value={draft.apiKey}
            onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
            className="mt-1 w-full rounded bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
          />
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Models</h3>
            <span className="text-xs text-zinc-500">{draft.models.length} configured</span>
          </div>

          {draft.models.length === 0 && (
            <p className="text-xs text-zinc-500 italic">No models yet. Add one below.</p>
          )}

          <div className="space-y-2">
            {draft.models.map((m) => (
              <div key={m.id} className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="defaultModel"
                    checked={draft.defaultModelId === m.id}
                    onChange={() => setDraft({ ...draft, defaultModelId: m.id })}
                    title="Set as default"
                    className="shrink-0"
                  />
                  <input
                    value={m.name}
                    onChange={(e) => updateModelName(m.id, e.target.value)}
                    className="flex-1 rounded bg-zinc-900 px-2 py-1 text-sm outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
                    placeholder="Display name"
                  />
                  <code className="text-xs text-zinc-500 truncate max-w-[140px]" title={m.id}>{m.id}</code>
                  <button
                    onClick={() => removeModel(m.id)}
                    className="p-1 rounded text-zinc-400 hover:text-red-400"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pl-6">
                  {CAPABILITY_KEYS.map((cap) => (
                    <label key={cap} className="flex items-center gap-1 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!m.capabilities[cap]}
                        onChange={() => toggleCap(m.id, cap)}
                      />
                      {CAPABILITY_LABELS[cap]}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              value={newModelId}
              onChange={(e) => setNewModelId(e.target.value)}
              placeholder="Model ID (e.g. gpt-4o)"
              className="flex-1 rounded bg-zinc-900 px-2 py-1.5 text-sm outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
            />
            <input
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              placeholder="Display name (optional)"
              className="flex-1 rounded bg-zinc-900 px-2 py-1.5 text-sm outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
            />
            <button
              onClick={addModel}
              disabled={!newModelId.trim()}
              className="rounded bg-zinc-100 px-3 text-xs font-medium text-zinc-900 disabled:opacity-40"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Tip: radio button selects the <strong>default</strong> model used for new chats.
          </p>
        </div>

        <button
          onClick={() => { onSave(draft); onClose(); }}
          className="w-full rounded bg-zinc-100 py-2 text-sm font-medium text-zinc-900"
        >
          Save
        </button>
      </div>
    </div>
  );
}

/* ---------------- Sidebar chat item (with rename) ---------------- */

function ChatListItem({ chat, isActive, onSelect, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.title);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => setDraft(chat.title), [chat.title]);

  useEffect(() => {
    if (!isConfirmingDelete) return;
    const timer = setTimeout(() => setIsConfirmingDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [isConfirmingDelete]);

  function commit() {
    setEditing(false);
    if (draft.trim() && draft.trim() !== chat.title) onRename(chat.id, draft);
    else setDraft(chat.title);
  }

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (isConfirmingDelete) {
      onDelete(chat.id);
      setIsConfirmingDelete(false);
    } else {
      setIsConfirmingDelete(true);
    }
  };

  return (
    <div
      onClick={() => !editing && onSelect(chat.id)}
      className={`group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer ${
        isActive ? 'bg-zinc-700' : 'hover:bg-zinc-800'
      }`}
    >
      {editing ? (
        <input
          autoFocus value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setDraft(chat.title); setEditing(false); }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded bg-zinc-900 px-1 py-0.5 text-sm text-zinc-100 outline-none ring-1 ring-zinc-500"
        />
      ) : (
        <>
          <span className="flex-1 truncate text-sm">{chat.title || 'New chat'}</span>
          <div className={`flex items-center gap-1 ${isActive || isConfirmingDelete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="p-1 rounded text-zinc-400 hover:text-zinc-100"
              title="Rename"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={handleDeleteClick}
              className={`p-1 rounded transition-colors ${
                isConfirmingDelete
                  ? 'bg-red-900/50 text-red-400 hover:bg-red-900/70'
                  : 'text-zinc-400 hover:text-red-400'
              }`}
              title={isConfirmingDelete ? "Click again to confirm delete" : "Delete chat"}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Main app ---------------- */

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const activeChatIdRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const messagesCache = useRef(new Map());
  const urlCache = useRef(new Map());
  const [urlMap, setUrlMap] = useState({});

  const [input, setInput] = useState('');
  const [files, setFiles] = useState([]);
  const [streamingText, setStreamingText] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [settings, setSettings] = useState(loadSettings());
  const [showSettings, setShowSettings] = useState(false);

  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  // Model registry helpers (must be inside component to access state)
  function getModelById(id) {
    return settings.models.find((m) => m.id === id) || null;
  }

  function getActiveModel(chatId) {
    const chat = chats.find((c) => c.id === chatId);
    if (chat?.model) {
      return getModelById(chat.model);
    }
    return getModelById(settings.defaultModelId);
  }

  function modelSupports(model, capability) {
    if (!model) return false;
    return !!model.capabilities[capability];
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('chats')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setChats(data || []));
  }, [session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  function saveSettings(s) {
    setSettings(s);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }

  async function resolveUrls(paths) {
    const missing = paths.filter((p) => !urlCache.current.has(p));
    if (missing.length > 0) {
      const { data } = await supabase.storage
        .from('media')
        .createSignedUrls(missing, SIGNED_URL_TTL);
      (data || []).forEach((d, i) => {
        if (d.signedUrl) urlCache.current.set(missing[i], d.signedUrl);
      });
    }
    const map = {};
    paths.forEach((p) => { map[p] = urlCache.current.get(p); });
    setUrlMap((prev) => ({ ...prev, ...map }));
    return map;
  }

  async function selectChat(chatId) {
    setActiveChatId(chatId);
    activeChatIdRef.current = chatId;
    setError('');

    // Fetch chat's model override from DB
    const { data: chatData } = await supabase
      .from('chats')
      .select('model')
      .eq('id', chatId)
      .single();

    if (chatData?.model !== undefined) {
      setChats(prev => prev.map(c =>
        c.id === chatId ? { ...c, model: chatData.model } : c
      ));
    }

    const cached = messagesCache.current.get(chatId);
    setMessages(cached || []);
    if (cached) {
      const paths = cached.flatMap((m) => m.attachments || []);
      if (paths.length) resolveUrls(paths);
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      messagesCache.current.set(chatId, data);
      if (activeChatIdRef.current === chatId) {
        setMessages(data);
        const paths = data.flatMap((m) => m.attachments || []);
        if (paths.length) resolveUrls(paths);
      }
    }
  }

  async function createChat() {
    const { data, error } = await supabase
      .from('chats')
      .insert({
        user_id: session.user.id,
        title: 'New chat',
        model: null,
      })
      .select()
      .single();
    if (error) { setError(error.message); return null; }
    setChats((prev) => [data, ...prev]);
    messagesCache.current.set(data.id, []);
    setActiveChatId(data.id);
    activeChatIdRef.current = data.id;
    setMessages([]);
    return data.id;
  }

  async function renameChat(chatId, newTitle) {
    const title = newTitle.trim();
    if (!title) return;
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title } : c)));
    const { error } = await supabase.from('chats').update({ title }).eq('id', chatId);
    if (error) setError(`Rename failed: ${error.message}`);
  }

  async function autoTitle(chatId, userText, assistantText) {
    try {
      const chat = chats.find(c => c.id === chatId);
      if (!chat || (chat.title && chat.title.trim() !== '' && chat.title !== 'New chat')) {
        return;
      }

      const titlePrompt = `Generate a short title (max 4 words) for this conversation. Respond with only the title, no quotes.
User: ${userText}
Assistant: ${assistantText}
Title:`;

      const title = await streamChat({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: getActiveModel(chatId)?.id || settings.defaultModelId,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates concise conversation titles.' },
          { role: 'user', content: titlePrompt }
        ],
        onToken: () => {},
      });

      const trimmedTitle = title.trim().replace(/^["']|["']$/g, '');
      const wordCount = trimmedTitle.split(/\s+/).filter(w => w).length;

      if (wordCount <= 4 && trimmedTitle) {
        renameChat(chatId, trimmedTitle);
      }
    } catch (e) {
      console.warn('Auto-title failed:', e);
    }
  }

  const deleteChat = async (chatId) => {
    try {
      const { data: messagesWithFiles, error: fetchErr } = await supabase
        .from('messages')
        .select('attachments')
        .eq('chat_id', chatId)
        .not('attachments', 'is', null);

      if (fetchErr) throw fetchErr;

      const filesToDelete = new Set();
      (messagesWithFiles || []).forEach(m => {
        if (Array.isArray(m.attachments)) {
          m.attachments.forEach(path => {
            if (path && typeof path === 'string') filesToDelete.add(path);
          });
        }
      });

      const { error: deleteChatErr } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (deleteChatErr) throw deleteChatErr;

      if (filesToDelete.size > 0) {
        supabase.storage
          .from('media')
          .remove([...filesToDelete])
          .then(({ error: storageErr }) => {
            if (storageErr) console.warn('Failed to clean up storage files:', storageErr);
          });
      }

      setChats(prev => prev.filter(c => c.id !== chatId));
      messagesCache.current.delete(chatId);

      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Delete chat failed:', err);
      setError(err.message || 'Failed to delete chat');
    }
  };

  function appendMessage(chatId, msg) {
    const list = [...(messagesCache.current.get(chatId) || []), msg];
    messagesCache.current.set(chatId, list);
    if (activeChatIdRef.current === chatId) setMessages(list);
  }

  async function sendMessage() {
    const text = input.trim();
    if ((!text && files.length === 0) || sending) return;

    const activeModel = getActiveModel(activeChatId);
    if (!settings.baseUrl || !settings.apiKey || !activeModel) {
      setError('Set Base URL, API key and at least one model in Settings first.');
      return;
    }

    setSending(true);
    setError('');

    try {
      let chatId = activeChatId;
      if (!chatId) chatId = await createChat();
      if (!chatId) return;

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

      appendMessage(chatId, userMsg);
      setInput('');
      setFiles([]);

      const history = (messagesCache.current.get(chatId) || []).slice(0, -1);
      const historyPaths = history.flatMap((m) => m.attachments || []);
      const historyUrlMap = historyPaths.length ? await resolveUrls(historyPaths) : {};

      const llmMessages = [
        ...history.map((m) => ({
          role: m.role,
          content: m.content,
          imageUrls: (m.attachments || []).map((p) => historyUrlMap[p]).filter(Boolean),
        })),
        { role: 'user', content: text, imageUrls: dataUrls },
      ];

      setStreamingText('');
      const full = await streamChat({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: activeModel.id,
        messages: llmMessages,
        onToken: (t) => setStreamingText(t),
      });

      const { data: aMsg, error: aErr } = await supabase
        .from('messages')
        .insert({ chat_id: chatId, role: 'assistant', content: full })
        .select()
        .single();
      if (aErr) throw new Error(aErr.message);
      appendMessage(chatId, aMsg);

      autoTitle(chatId, text, full).catch(() => {});
    } catch (e) {
      setError(e.message);
    } finally {
      setStreamingText(null);
      setSending(false);
    }
  }

  if (!authReady) return null;
  if (!session) return <AuthScreen />;

  return (
    <div className="flex h-screen bg-zinc-900 text-zinc-100">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800 p-3">
        <button
          onClick={createChat}
          className="mb-3 flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
        >
          <Plus size={16} /> New chat
        </button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {chats.map((c) => (
            <ChatListItem
              key={c.id} chat={c} isActive={c.id === activeChatId}
              onSelect={selectChat} onRename={renameChat} onDelete={deleteChat}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
          <button onClick={() => setShowSettings(true)} className="text-zinc-400 hover:text-zinc-100" title="Settings">
            <SettingsIcon size={18} />
          </button>
          <span className="truncate px-2 text-xs text-zinc-500">{session.user.email}</span>
          <button onClick={() => supabase.auth.signOut()} className="text-zinc-400 hover:text-zinc-100" title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Chat area */}
      <main className="flex flex-1 flex-col">
        {/* Chat header with model picker */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-zinc-300 truncate max-w-[200px]">
              {activeChatId ? chats.find(c => c.id === activeChatId)?.title || 'New chat' : 'No chat selected'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={activeChatId ? (chats.find(c => c.id === activeChatId)?.model || settings.defaultModelId) : settings.defaultModelId}
              onChange={(e) => {
                const modelId = e.target.value;
                if (!activeChatId) return;

                setChats(prev => prev.map(c =>
                  c.id === activeChatId ? { ...c, model: modelId === settings.defaultModelId ? null : modelId } : c
                ));

                supabase
                  .from('chats')
                  .update({
                    model: modelId === settings.defaultModelId ? null : modelId,
                  })
                  .eq('id', activeChatId)
                  .then(() => {})
                  .catch(console.error);
              }}
              className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500 max-w-[200px] truncate"
              title="Select model for this chat"
            >
              <option value={settings.defaultModelId}>
                Default ({getModelById(settings.defaultModelId)?.name || settings.defaultModelId})
              </option>

              {settings.models.map((m) => {
                const caps = Object.entries(m.capabilities)
                  .filter(([_, v]) => v)
                  .map(([k]) => CAPABILITY_ICONS[k] || k)
                  .join(' ');

                return (
                  <option key={m.id} value={m.id}>
                    {m.name} {caps ? `(${caps})` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl overflow-x-auto rounded-2xl px-4 py-2 text-sm ${
                m.role === 'user' ? 'bg-blue-600' : 'bg-zinc-800'
              }`}>
                {(m.attachments || []).map((p) =>
                  urlMap[p] ? (
                    <img key={p} src={urlMap[p]} alt="" className="mb-2 max-h-64 rounded-lg" />
                  ) : (
                    <div key={p} className="mb-2 flex h-24 w-32 items-center justify-center rounded-lg bg-zinc-700">
                      <Loader2 className="animate-spin text-zinc-400" size={18} />
                    </div>
                  )
                )}
                {m.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {streamingText !== null && (
            <div className="flex justify-start">
              <div className="max-w-2xl overflow-x-auto rounded-2xl bg-zinc-800 px-4 py-2 text-sm">
                {!streamingText ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{streamingText}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {error && <div className="px-4 pb-2 text-sm text-red-400">{error}</div>}

        {files.length > 0 && (
          <div className="flex gap-2 px-4 pb-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs">
                {f.name}
                <button onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Capability warning: images attached but model doesn't support vision */}
        {files.length > 0 && activeChatId && !modelSupports(getActiveModel(activeChatId), 'vision') && (
          <div className="mx-4 mb-2 flex items-start gap-2 rounded bg-yellow-500/20 px-3 py-2 text-xs text-yellow-200 border border-yellow-500/30">
            <span className="mt-0.5">⚠️</span>
            <div className="flex-1">
              <p className="font-medium">
                {getActiveModel(activeChatId)?.name || 'Current model'} doesn't support images
              </p>
              <p className="text-yellow-300/70 mt-1">
                Your {files.length} image{files.length > 1 ? 's will' : ' will'} be sent as text description only.
                <button
                  onClick={() => {
                    const visModel = settings.models.find(m => m.capabilities.vision);
                    if (visModel && activeChatId) {
                      setChats(prev => prev.map(c =>
                        c.id === activeChatId ? { ...c, model: visModel.id } : c
                      ));
                      supabase.from('chats').update({ model: visModel.id }).eq('id', activeChatId).then(() => {});
                    }
                  }}
                  className="ml-2 underline hover:no-underline font-medium"
                >
                  Switch to {settings.models.find(m => m.capabilities.vision)?.name || 'a vision model'}
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Capability warning: model selected doesn't support text */}
        {activeChatId && !modelSupports(getActiveModel(activeChatId), 'text') && (
          <div className="mx-4 mb-2 rounded bg-red-500/20 px-3 py-2 text-xs text-red-200 border border-red-500/30">
            ⚠️ Selected model doesn't support text chat. Please choose a different model.
          </div>
        )}

        <div className="flex items-end gap-2 border-t border-zinc-800 p-3 pb-safe">
          <input
            ref={fileInputRef} type="file" accept="image/*" multiple hidden
            onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            title="Attach image"
          >
            <Paperclip size={18} />
          </button>
          <textarea
            rows={1} value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            placeholder="Message…"
            className="max-h-40 flex-1 resize-none rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
          />
          <button
            onClick={sendMessage} disabled={sending}
            className="rounded-lg bg-zinc-100 p-2 text-zinc-900 disabled:opacity-50"
            title="Send"
          >
            {sending ? <Loader2 className="animate-spin" size={18} /> : <SendHorizonal size={18} />}
          </button>
        </div>
      </main>

      {showSettings && (
        <SettingsModal settings={settings} onSave={saveSettings} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}