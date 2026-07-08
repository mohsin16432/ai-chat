import { useState, useRef } from 'react';

export function useStreaming() {
  const [streamingText, setStreamingText] = useState(null);
  const [sending, setSending] = useState(false);
  const abortRef = useRef(null);

  function startStreaming() {
    const controller = new AbortController();
    abortRef.current = controller;
    setStreamingText('');
    setSending(true);
    return controller.signal;
  }

  function onToken(text) {
    setStreamingText(text);
  }

  function stopStreaming() {
    abortRef.current = null;
    setStreamingText(null);
    setSending(false);
  }

  function cancelStreaming() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStreamingText(null);
    setSending(false);
  }

  return {
    streamingText,
    sending,
    startStreaming,
    onToken,
    stopStreaming,
    cancelStreaming,
  };
}