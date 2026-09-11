import data from './song-links-data.mjs';

export function handleShortLink(request, links = data) {
  const url = new URL(request.url);
  const shortHost = Object.values(data.domains).includes(url.hostname);
  const numeric = /^\/[0-9]+(?:\/[0-9]+)?\/?$/.test(url.pathname);
  if (!shortHost && !numeric && url.pathname !== '/.well-known/music-links') return null;
  const headers = { 'cache-control': 'public, max-age=60', 'x-content-type-options': 'nosniff' };
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { ...headers, allow: 'GET, HEAD' } });
  if (url.pathname === '/.well-known/music-links') return new Response(request.method === 'HEAD' ? null : JSON.stringify({ service: 'musicsubject-song-links', revision: links.revision }), { headers: { ...headers, 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
  if (shortHost && url.pathname === '/') return new Response(null, { status: 302, headers: { ...headers, location: `${data.origin}/music/` } });
  const match = /^\/([1-9]\d*)(?:\/([1-9]\d*))?\/?$/.exec(url.pathname);
  const row = match && links.rows.find(item => item.number === Number(match[1]) && item.slot === Number(match[2] || 1));
  if (!row) return new Response(request.method === 'HEAD' ? null : 'This song link was not found. Browse the music at ' + data.origin + '/music/', { status: 404, headers: { ...headers, 'content-type': 'text/plain; charset=utf-8' } });
  // Targets are generated from the catalog, never from caller-supplied query parameters.
  const target = new URL(row.target, data.origin);
  if (target.origin !== data.origin) return new Response(null, { status: 502 });
  return new Response(null, { status: 302, headers: { ...headers, location: target.href } });
}

export async function liveRegistry(fetcher = fetch) {
  try {
    // The main site's normal publication updates this file, so adding a song does
    // not need another DNS change or a redeployment of this redirect Worker.
    const response = await fetcher(`${data.origin}/data/song-links.json`, {
      cf: { cacheEverything: true, cacheTtl: 60 }, signal: AbortSignal.timeout(4000)
    });
    if (!response.ok) return data;
    const latest = await response.json();
    if (latest.schemaVersion !== 1 || latest.origin !== data.origin || !Array.isArray(latest.rows) || typeof latest.revision !== 'string') return data;
    if (!latest.rows.every(row => Number.isSafeInteger(row.number) && row.number > 0 && Number.isSafeInteger(row.slot) && row.slot > 0 && typeof row.target === 'string' && row.target.startsWith('/') && new URL(row.target, data.origin).origin === data.origin)) return data;
    return latest;
  } catch { return data; }
}

export default { async fetch(request) {
  return handleShortLink(request, await liveRegistry()) || new Response('Not found', { status: 404 });
} };
