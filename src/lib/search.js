/**
 * Executes a web search query across Tavily, Serper, or Free DuckDuckGo API.
 */

async function searchTavily(query, apiKey) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query: query,
      search_depth: 'basic',
      max_results: 5
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Tavily Search API failed');
  }
  const data = await response.json();
  return (data.results || []).map(r => ({
    title: r.title,
    url: r.url,
    snippet: r.content
  }));
}

async function searchSerper(query, apiKey) {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ q: query, num: 5 })
  });
  if (!response.ok) {
    throw new Error('Google Serper Search API failed');
  }
  const data = await response.json();
  return (data.organic || []).map(r => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet
  }));
}

/**
 * FAIL-SAFE: DuckDuckGo Native Instant Answer API with native CORS support.
 */
async function searchDuckDuckGoInstant(query) {
  console.log('%c🔍 Querying DuckDuckGo Native Instant Answers...', 'color: #f59e0b; font-weight: bold;');
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Instant Answer API offline');
  const data = await response.json();
  
  const results = [];
  if (data.AbstractText) {
    results.push({
      title: data.Heading || 'Abstract Information',
      url: data.AbstractURL || 'https://duckduckgo.com',
      snippet: data.AbstractText
    });
  }
  if (data.RelatedTopics && data.RelatedTopics.length > 0) {
    data.RelatedTopics.forEach((topic, idx) => {
      if (idx >= 4) return;
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.split(' - ')[0] || 'Related Source',
          url: topic.FirstURL,
          snippet: topic.Text
        });
      }
    });
  }
  return results;
}

export async function performWebSearch(query, provider, apiKey) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    if (provider === 'tavily' && apiKey) {
      return await searchTavily(trimmed, apiKey);
    }
    if (provider === 'serper' && apiKey) {
      return await searchSerper(trimmed, apiKey);
    }
    // Zero-configuration fallback: DuckDuckGo Native Instant Answers
    return await searchDuckDuckGoInstant(trimmed);
  } catch (err) {
    console.debug('Primary search failed, using DuckDuckGo Instant Answers...', err);
    return await searchDuckDuckGoInstant(trimmed);
  }
}