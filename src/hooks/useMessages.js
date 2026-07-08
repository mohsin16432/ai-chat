import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

const SIGNED_URL_TTL = 60 * 60;

export function useMessages() {
  const [messages, setMessages] = useState([]);
  const messagesCache = useRef(new Map());
  const urlCache = useRef(new Map());
  const [urlMap, setUrlMap] = useState({});

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
    paths.forEach((p) => {
      map[p] = urlCache.current.get(p);
    });
    setUrlMap((prev) => ({ ...prev, ...map }));
    return map;
  }

  async function loadMessages(chatId, activeChatIdRef) {
    const cached = messagesCache.current.get(chatId);
    setMessages(cached || []);
    if (cached) {
      const paths = cached.flatMap((m) => m.attachments || []);
      if (paths.length) resolveUrls(paths);
    }

    // Fetch model from DB
    const { data: chatData } = await supabase
      .from('chats')
      .select('model')
      .eq('id', chatId)
      .single();

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

    return chatData;
  }

  function appendMessage(chatId, msg, activeChatIdRef) {
    const list = [...(messagesCache.current.get(chatId) || []), msg];
    messagesCache.current.set(chatId, list);
    if (activeChatIdRef.current === chatId) setMessages(list);
  }

  function initChatMessages(chatId) {
    messagesCache.current.set(chatId, []);
    setMessages([]);
  }

  function clearMessages() {
    setMessages([]);
  }

  function removeChatFromCache(chatId) {
    messagesCache.current.delete(chatId);
  }

   async function deleteMessagesAfter(chatId, messageId, activeChatIdRef) {
    const cached = messagesCache.current.get(chatId) || [];
    const idx = cached.findIndex((m) => m.id === messageId);
    if (idx === -1) return [];

    const toDelete = cached.slice(idx);
    const remaining = cached.slice(0, idx);

    // Delete from DB
    const ids = toDelete.map((m) => m.id);
    if (ids.length > 0) {
      await supabase.from('messages').delete().in('id', ids);
    }

    // Update cache
    messagesCache.current.set(chatId, remaining);
    if (activeChatIdRef.current === chatId) setMessages(remaining);

    return toDelete;
  }

   async function updateMessage(chatId, messageId, newContent, activeChatIdRef) {
    // Update DB
    await supabase.from('messages').update({ content: newContent }).eq('id', messageId);

    // Update cache
    const cached = messagesCache.current.get(chatId) || [];
    const updated = cached.map((m) =>
      m.id === messageId ? { ...m, content: newContent } : m
    );
    messagesCache.current.set(chatId, updated);
    if (activeChatIdRef.current === chatId) setMessages(updated);
  }

  

  return {
    messages,
    setMessages,
    messagesCache,
    urlCache,
    urlMap,
    setUrlMap,
    resolveUrls,
    loadMessages,
    appendMessage,
    initChatMessages,
    clearMessages,
    removeChatFromCache,
    deleteMessagesAfter,
    updateMessage,
  };
}