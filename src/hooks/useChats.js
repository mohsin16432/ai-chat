import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useChats(session) {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const activeChatIdRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) return;
    supabase
      .from('chats')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setChats(data || []));
  }, [session]);

  async function createChat() {
    const { data, error: err } = await supabase
      .from('chats')
      .insert({
        user_id: session.user.id,
        title: 'New chat',
        model: null,
      })
      .select()
      .single();
    if (err) {
      setError(err.message);
      return null;
    }
    setChats((prev) => [data, ...prev]);
    setActiveChatId(data.id);
    activeChatIdRef.current = data.id;
    return data;
  }

  async function renameChat(chatId, newTitle) {
    const title = newTitle.trim();
    if (!title) return;
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title } : c)));
    const { error: err } = await supabase.from('chats').update({ title }).eq('id', chatId);
    if (err) setError(`Rename failed: ${err.message}`);
  }

  async function deleteChat(chatId) {
    try {
      const { data: messagesWithFiles, error: fetchErr } = await supabase
        .from('messages')
        .select('attachments')
        .eq('chat_id', chatId)
        .not('attachments', 'is', null);

      if (fetchErr) throw fetchErr;

      const filesToDelete = new Set();
      (messagesWithFiles || []).forEach((m) => {
        if (Array.isArray(m.attachments)) {
          m.attachments.forEach((path) => {
            if (path && typeof path === 'string') filesToDelete.add(path);
          });
        }
      });

      const { error: deleteChatErr } = await supabase.from('chats').delete().eq('id', chatId);
      if (deleteChatErr) throw deleteChatErr;

      if (filesToDelete.size > 0) {
        supabase.storage
          .from('media')
          .remove([...filesToDelete])
          .then(({ error: storageErr }) => {
            if (storageErr) console.warn('Failed to clean up storage files:', storageErr);
          });
      }

      setChats((prev) => prev.filter((c) => c.id !== chatId));

      if (activeChatId === chatId) {
        setActiveChatId(null);
        activeChatIdRef.current = null;
      }
    } catch (err) {
      console.error('Delete chat failed:', err);
      setError(err.message || 'Failed to delete chat');
    }
  }

  function updateChatModel(chatId, modelId, defaultModelId) {
    const value = modelId === defaultModelId ? null : modelId;
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, model: value } : c)));
    supabase
      .from('chats')
      .update({ model: value })
      .eq('id', chatId)
      .then(() => {})
      .catch(console.error);
  }

  function selectChat(chatId) {
    setActiveChatId(chatId);
    activeChatIdRef.current = chatId;
    setError('');
  }

  async function updateChatSettings(chatId, settings) {
    // Update locally
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, ...settings } : c))
    );

    // Persist to Supabase
    const { error: err } = await supabase
      .from('chats')
      .update(settings)
      .eq('id', chatId);

    if (err) setError(`Failed to save chat settings: ${err.message}`);
  }

  return {
    chats,
    setChats,
    activeChatId,
    setActiveChatId,
    activeChatIdRef,
    error,
    setError,
    createChat,
    renameChat,
    deleteChat,
    updateChatModel,
    selectChat,
    updateChatSettings
  };
}