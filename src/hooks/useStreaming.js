import { useState, useRef } from 'react';

export function useStreaming() {
  const [streamingText, setStreamingText] = useState(null);
  const [sending, setSending] = useState(false);
  const [streamStats, setStreamStats] = useState(null); // { ttftMs, tokensPerSec, elapsedMs, chars }
  const abortRef = useRef(null);
  const timingRef = useRef({ start: 0, firstToken: 0, lastText: '' });

  function startStreaming() {
    const controller = new AbortController();
    abortRef.current = controller;
    setStreamingText('');
    setStreamStats(null);
    timingRef.current = { start: performance.now(), firstToken: 0, lastText: '' };
    setSending(true);
    return controller.signal;
  }

  function onToken(text) {
    const t = timingRef.current;
    const now = performance.now();
    if (!t.firstToken && text.length > 0) {
      t.firstToken = now;
    }
    const elapsedSinceFirst = t.firstToken ? now - t.firstToken : 0;
    // Rough token estimate: ~4 chars per token (provider-agnostic; usage gives exact counts after completion).
    const approxTokens = Math.max(1, Math.round(text.length / 4));
    const tokensPerSec = elapsedSinceFirst > 0 ? (approxTokens / (elapsedSinceFirst / 1000)) : 0;
    setStreamStats({
      ttftMs: t.firstToken ? Math.round(t.firstToken - t.start) : null,
      tokensPerSec: Math.round(tokensPerSec),
      elapsedMs: Math.round(now - t.start),
      chars: text.length,
    });
    setStreamingText(text);
  }

  function stopStreaming() {
    abortRef.current = null;
    setStreamStats(null);
    setStreamingText(null);
    setSending(false);
  }

  function cancelStreaming() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStreamStats(null);
    setStreamingText(null);
    setSending(false);
  }

  return {
    streamingText,
    streamStats,
    sending,
    startStreaming,
    onToken,
    stopStreaming,
    cancelStreaming,
  };
}
