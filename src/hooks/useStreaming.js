import { useState } from 'react';

export function useStreaming() {
  const [streamingText, setStreamingText] = useState(null);
  const [sending, setSending] = useState(false);

  function startStreaming() {
    setStreamingText('');
    setSending(true);
  }

  function onToken(text) {
    setStreamingText(text);
  }

  function stopStreaming() {
    setStreamingText(null);
    setSending(false);
  }

  return {
    streamingText,
    sending,
    startStreaming,
    onToken,
    stopStreaming,
  };
}