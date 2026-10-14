const KEY = 'ai-chat-context-opts';

// Per-chat context management options. Stored in localStorage because the
// Supabase `chats` table cannot be altered from the client.
export function loadContextOpts() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function save(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function getContextOpts(chatId) {
  const map = loadContextOpts();
  return map[chatId] || { autoCompact: false, maxMessages: 20 };
}

export function setContextOpts(chatId, opts) {
  const map = loadContextOpts();
  map[chatId] = { ...getContextOpts(chatId), ...opts };
  save(map);
}

// Estimate tokens very roughly (4 chars ~= 1 token) for the window decision.
export function estimateTokens(messages) {
  return (messages || []).reduce((sum, m) => sum + Math.ceil((m.content || '').length / 4), 0);
}

// Returns the slice of history to actually send, applying the auto-compact
// window when enabled. Never deletes the user's stored messages.
export function compactHistory(messages, opts) {
  if (!opts?.autoCompact) return messages;
  const keep = Math.max(2, opts.maxMessages || 20);
  if (messages.length <= keep) return messages;
  // Always keep the first message (often the seed) and the most recent `keep`.
  const head = messages.slice(0, 1);
  const tail = messages.slice(messages.length - (keep - 1));
  return [...head, ...tail];
}
