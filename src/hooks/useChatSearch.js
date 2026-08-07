import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useChatSearch(query, { enabled = true, delay = 300 } = {}) {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!enabled || !query.trim()) {
      setResults([]);
      setSearching(false);
      return undefined;
    }

    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);

      try {
        const trimmedQuery = query.trim();

        const { data: chatResults } = await supabase
          .from('chats')
          .select('id, title, updated_at')
          .ilike('title', `%${trimmedQuery}%`)
          .order('updated_at', { ascending: false })
          .limit(10);

        const { data: msgResults } = await supabase
          .from('messages')
          .select('id, chat_id, content, role, created_at')
          .ilike('content', `%${trimmedQuery}%`)
          .order('created_at', { ascending: false })
          .limit(20);

        const chatIds = [...new Set((msgResults || []).map((message) => message.chat_id))];
        const chatMap = {};

        if (chatIds.length > 0) {
          const { data: chatData } = await supabase
            .from('chats')
            .select('id, title')
            .in('id', chatIds);

          (chatData || []).forEach((chat) => {
            chatMap[chat.id] = chat.title;
          });
        }

        const combined = [];
        const titleChatIds = new Set((chatResults || []).map((chat) => chat.id));

        (chatResults || []).forEach((chat) => {
          combined.push({
            type: 'chat',
            chatId: chat.id,
            chatTitle: chat.title,
            preview: chat.title,
            date: chat.updated_at,
          });
        });

        (msgResults || []).forEach((message) => {
          combined.push({
            type: 'message',
            chatId: message.chat_id,
            chatTitle: chatMap[message.chat_id] || '',
            preview: message.content.substring(0, 150),
            role: message.role,
            date: message.created_at,
            alsoInTitles: titleChatIds.has(message.chat_id),
          });
        });

        setResults(combined);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearching(false);
      }
    }, delay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [delay, enabled, query]);

  return { results, searching };
}
