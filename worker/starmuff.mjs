import { STARMUFF_TRACKS } from '../data/starmuff-playlist.mjs';

const paths = new Map(STARMUFF_TRACKS.map(track => [track.audio, track.sourcePath]));
const permittedHeaders = ['content-type', 'content-length', 'content-range', 'etag', 'last-modified', 'accept-ranges', 'cache-control'];

export function starMuffSocial(value) {
  const url = new URL(value);
  if (!/^\/winhamp\/?$/.test(url.pathname)) return null;
  const track = STARMUFF_TRACKS.find(item => item.id === url.searchParams.get('song'));
  if (!track && (url.searchParams.get('song') || url.searchParams.get('playlist') !== 'starmuff')) return null;
  if (track && url.searchParams.has('version') && url.searchParams.get('version') !== 'main') return null;
  const canonical = new URL('/winhamp/', 'https://callmedaddy.musicsubject.com');
  canonical.searchParams.set('playlist', track && url.searchParams.get('playlist') === 'all' ? 'all' : 'starmuff');
  if (track) { canonical.searchParams.set('song', track.id); canonical.searchParams.set('version', 'main'); }
  return {
    title: track ? `${track.title} — StarMuff · WinHamp` : 'StarMuff playlist — WinHamp',
    description: track ? `Listen to ${track.title} from the original StarMuff soundtrack in WinHamp.` : `${STARMUFF_TRACKS.length} tracks from StarMuff: exploration, casino music, Iron Frontier and more. Press play in WinHamp.`,
    image: 'https://starmuff.com/og-image.png', imageType: 'image/png', imageAlt: 'StarMuff',
    type: track ? 'music.song' : 'music.playlist', canonical: canonical.href
  };
}

// Same-origin delivery keeps seeking and the Web Audio spectrum working on
// phones. Only the original catalogue's public audio paths can be requested.
export async function handleStarMuffMedia(request, env) {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith('/media/starmuff/')) return null;
  const source = paths.get(pathname);
  if (!source) return new Response('Unknown StarMuff recording', { status: 404 });
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { allow: 'GET, HEAD' } });
  if (!env.STARMUFF?.fetch) return new Response('StarMuff audio is temporarily unavailable', { status: 503, headers: { 'retry-after': '15' } });
  const headers = new Headers();
  for (const name of ['range', 'if-range', 'if-none-match', 'if-modified-since']) {
    if (request.headers.has(name)) headers.set(name, request.headers.get(name));
  }
  try {
    const upstream = await env.STARMUFF.fetch(new Request(new URL(source, 'https://starmuff.com'), {
      method: request.method, headers, redirect: 'error'
    }));
    const responseHeaders = new Headers({ 'x-content-type-options': 'nosniff', 'accept-ranges': 'bytes' });
    if (upstream.status === 416 || upstream.status === 304) {
      for (const name of permittedHeaders) if (upstream.headers.has(name)) responseHeaders.set(name, upstream.headers.get(name));
      return new Response(null, { status: upstream.status, headers: responseHeaders });
    }
    if (!upstream.ok || !/^(audio\/|application\/octet-stream\b)/i.test(upstream.headers.get('content-type') || '')) {
      await upstream.body?.cancel();
      return new Response('StarMuff recording unavailable', { status: 502 });
    }
    for (const name of permittedHeaders) if (upstream.headers.has(name)) responseHeaders.set(name, upstream.headers.get(name));
    // Pass the body through as a stream; do not buffer a soundtrack in memory.
    return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return new Response('StarMuff audio is temporarily unavailable', { status: 503, headers: { 'retry-after': '15' } });
  }
}
