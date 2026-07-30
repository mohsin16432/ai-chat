import { proxyFetch } from './proxy';

export async function streamChat({ baseUrl, apiKey, model, messages, onToken, signal, temperature, top_p, proxySettings }) {
  const payload = {
    model,
    stream: true,
    stream_options: { include_usage: true },
    messages: messages.map((m) => {
      if (!m.imageUrls || m.imageUrls.length === 0) {
        return { role: m.role, content: m.content };
      }
      return {
        role: m.role,
        content: [
          { type: 'text', text: m.content || '(image)' },
          ...m.imageUrls.map((url) => ({
            type: 'image_url',
            image_url: { url },
          })),
        ],
      };
    }),
  };

  // Only include if explicitly set (some APIs error on unexpected params)
  if (temperature !== undefined && temperature !== null) {
    payload.temperature = temperature;
  }
  if (top_p !== undefined && top_p !== null) {
    payload.top_p = top_p;
  }
  console.time("LLM");
  const start = performance.now();


  const res = await proxyFetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal,
  }, proxySettings);

  console.log(
  "Headers:",
  performance.now() - start
  );

  let firstTokenSeen = false;

  console.timeEnd("LLM");

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LLM error ${res.status}: ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let usage = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          if (!firstTokenSeen) {
          console.log(
            "First token:",
            performance.now() - start
          );
          firstTokenSeen = true;
  }
          full += delta;
          onToken(full);
        }
        if (json.usage) {
          usage = json.usage;
        }
      } catch {
        // ignore partial/keepalive lines
      }
    }
  }
  return { text: full, usage };
}
