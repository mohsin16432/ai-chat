/**
 * Executes a web search query across Tavily, Serper, or Free Multi-Channel APIs
 * (Google News RSS Feed & Wikipedia Factual Engines).
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
 * CHANNEL A: Google News RSS Feed Search Engine
 * Bypasses bot captchas by parsing Google's lightweight XML feed.
 * Provides live breaking headlines, source names, and verified reference URLs.
 */
async function searchGoogleNewsRSS(query) {
  console.log('%c📰 Fetching Live Headlines via Google News RSS Engine...', 'color: #3b82f6; font-weight: bold;');
  const targetUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  
  // Use AllOrigins with raw parsing to bypass CORS safely
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
  
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error('Google News RSS stream failed');
  const xmlText = await response.text();
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const items = xmlDoc.querySelectorAll('item');
  const results = [];
  
  items.forEach((item, idx) => {
    if (idx >= 4) return; // Keep top 4 live news items
    const title = item.querySelector('title')?.textContent || 'Headline';
    const rawUrl = item.querySelector('link')?.textContent || '';
    const pubDate = item.querySelector('pubDate')?.textContent || '';
    const source = item.querySelector('source')?.textContent || 'News';
    
    // Clean out timezone padding for compact prompts
    const cleanDate = pubDate.replace(/ \+0000| GMT/g, '');
    
    results.push({
      title: `${title} (${source})`,
      url: rawUrl,
      snippet: `Published: ${cleanDate} - Live News Report detailing: ${title}`
    });
  });
  
  return results;
}

/**
 * CHANNEL B: Wikipedia Organic Search API
 * 100% stable, supports CORS natively, and never rate-limits.
 * Provides deep context blocks for concepts, places, organizations, and historical events.
 */
async function searchWikipedia(query) {
  console.log('%c📖 Fetching Context via Wikipedia Factual Engine...', 'color: #10b981; font-weight: bold;');
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Wikipedia search failed');
  const data = await response.json();
  
  return (data.query?.search || []).slice(0, 3).map(item => ({
    title: `${item.title} (Wikipedia Background)`,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
    snippet: item.snippet.replace(/<\/?[^>]+(>|$)/g, "") // Strip HTML tags
  }));
}

/**
 * Aggregates real-time news and factual articles into a unified search context
 */
async function searchFreeMultiChannel(query) {
  const aggregatedResults = [];
  
  // Execute both channels in parallel to keep searches lightning-fast
  const outcomes = await Promise.allSettled([
    searchGoogleNewsRSS(query),
    searchWikipedia(query)
  ]);
  
  outcomes.forEach((outcome) => {
    if (outcome.status === 'fulfilled' && outcome.value) {
      aggregatedResults.push(...outcome.value);
    }
  });
  
  return aggregatedResults.slice(0, 6); // Limit to top 6 relevant results
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
    // Zero-Config Free Aggregator (Google News RSS + Wikipedia)
    return await searchFreeMultiChannel(trimmed);
  } catch (err) {
    console.warn('Configured search API failed, falling back to free search aggregator...', err);
    return await searchFreeMultiChannel(trimmed).catch(() => []);
  }
}