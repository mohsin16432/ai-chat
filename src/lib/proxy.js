export const DEFAULT_PROXY_URL =
  'https://super-heart-b9af.mohsin-mustafa.workers.dev';

function normalizeProxyUrl(proxyUrl = DEFAULT_PROXY_URL) {
  return proxyUrl.trim().replace(/\/+$/, '');
}

export function getProxySettings(settings = {}) {
  return {
    proxyEnabled: Boolean(settings.proxyEnabled),
    proxyUrl: normalizeProxyUrl(settings.proxyUrl || DEFAULT_PROXY_URL),
  };
}

export function proxyFetch(url, options = {}, settings = {}) {
  const targetUrl = typeof url === 'string' ? url : String(url);
  const { proxyEnabled, proxyUrl } = getProxySettings(settings);

  // Direct request (no proxy)
  if (!proxyEnabled) {
    return fetch(targetUrl, options);
  }

  const headers = new Headers(options.headers || {});

  // Tell the worker where to forward the request
  headers.set('x-target-url', targetUrl);

  return fetch(proxyUrl, {
    ...options,
    headers,
  });
}