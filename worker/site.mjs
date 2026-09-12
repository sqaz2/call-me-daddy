import { handleRequest } from './index.mjs';
import { resolveSocial, rewriteHead, readHead, SOCIAL_VERSION } from '../song-social.mjs';

// The asset binding is deployment-scoped. Never cache failed lookups or mix deployments.
const indexes = new WeakMap();
async function socialIndex(assets, request) {
  if (indexes.has(assets)) return indexes.get(assets);
  const response = await assets.fetch(new Request(new URL('/data/song-social.json', request.url)));
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Song social index unavailable');
  const data = await response.json();
  if (data.schemaVersion !== 1 || !data.songs || !data.pages) throw new Error('Invalid song social index');
  indexes.set(assets, data);
  return data;
}
export async function decorateSongHTML(request, response, env) {
  if (request.method !== 'GET' || response.status !== 200 || !/\btext\/html\b/i.test(response.headers.get('content-type') || '')) return response;
  let data = null;
  try { data = await socialIndex(env.ASSETS, request); }
  catch (error) { console.error('Song artwork metadata:', error.message); }
  const html = await response.text();
  const selected = resolveSocial(request.url, data);
  // Dedicated pages still receive artwork icons if a metadata asset is temporarily unavailable.
  const fallback = readHead(html);
  const record = selected || fallback;
  const body = rewriteHead(html, record);
  const headers = new Headers(response.headers);
  for (const name of ['content-length', 'content-encoding', 'etag', 'last-modified', 'content-md5']) headers.delete(name);
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  headers.set('x-song-social', SOCIAL_VERSION);
  if (data?.revision) headers.set('x-song-social-revision', data.revision);
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}
export default { async fetch(request, env) {
  return decorateSongHTML(request, await handleRequest(request, env), env);
} };
