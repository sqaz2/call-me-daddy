// Shared by the Worker and the browser: a URL must describe one recording.
export const ORIGIN = 'https://callmedaddy.musicsubject.com';
export const SOCIAL_VERSION = '20260912-song-art-1';
const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
export function routePath(value) {
  const path = new URL(value, ORIGIN).pathname.replace(/\/index\.html$/i, '/');
  return /\.[a-z0-9]+$/i.test(path) ? path : path.replace(/\/+$/, '') + '/';
}
export function imageURL(value) {
  if (!value) return '';
  try { const url = new URL(value, ORIGIN); return url.protocol === 'https:' ? url.href : ''; }
  catch { return ''; }
}
export function resolveSocial(value, data) {
  if (!data || data.schemaVersion !== 1) return null;
  const url = new URL(value, ORIGIN), path = routePath(url.href);
  const page = own(data.pages, path) ? data.pages[path] : null;
  const requestedSong = url.searchParams.get('song');
  const requestedVersion = url.searchParams.get('version');
  let id = requestedSong;
  if (!id && requestedVersion && page?.songId) id = page.songId;
  if (id) {
    // Do not let invalid IDs or prototype keys borrow another recording's cover.
    if (!own(data.songs, id)) return null;
    const song = data.songs[id];
    const version = requestedVersion || song.defaultVersion;
    if (!own(song.versions, version)) return null;
    const record = song.versions[version];
    const canonical = new URL(path, ORIGIN);
    canonical.searchParams.set('song', id);
    canonical.searchParams.set('version', version);
    return { ...record, canonical: canonical.href, songId: id, version };
  }
  return page || null;
}
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function decodeHTML(value) {
  return String(value ?? '').replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (all, code) => {
    if (code[0] !== '#') return ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' })[code.toLowerCase()] || all;
    const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : all;
  });
}
export function attributes(tag) {
  const result = Object.create(null);
  const body = tag.replace(/^<\/?[\w:-]+/, '').replace(/\/?\s*>$/, '');
  for (const match of body.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    result[match[1].toLowerCase()] = decodeHTML(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return result;
}
const tags = /<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<title\b[^>]*>[\s\S]*?<\/title\s*>|<(?:meta|link)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
export function readHead(html) {
  const head = /<head\b[^>]*>([\s\S]*?)<\/head\s*>/i.exec(html)?.[1] || '';
  const meta = {}, links = {};
  let title = '';
  for (const match of head.matchAll(tags)) {
    const tag = match[0];
    if (/^<title\b/i.test(tag)) title = decodeHTML(tag.replace(/^<title\b[^>]*>|<\/title\s*>$/gi, ''));
    else if (/^<meta\b/i.test(tag)) { const a = attributes(tag); meta[(a.property || a.name || '').toLowerCase()] ??= a.content || ''; }
    else if (/^<link\b/i.test(tag)) { const a = attributes(tag); links[(a.rel || '').toLowerCase()] ??= a.href || ''; }
  }
  return { title: meta['og:title'] || title, description: meta['og:description'] || meta.description || '',
    image: imageURL(meta['og:image']), imageAlt: meta['og:image:alt'] || '',
    canonical: links.canonical || meta['og:url'] || '', type: meta['og:type'] || 'website' };
}
export function rewriteHead(html, record, { client = true } = {}) {
  if (!record?.image) return html;
  const image = imageURL(record.image);
  if (!image) return html;
  return html.replace(/(<head\b[^>]*>)([\s\S]*?)(<\/head\s*>)/i, (_, open, head, close) => {
    const clean = head.replace(tags, tag => {
      if (/^<script\b[^>]*\bsrc=["']\/song-favicon\.mjs(?:[?"'])/i.test(tag)) return '';
      if (/^<title\b/i.test(tag)) return '';
      if (/^<meta\b/i.test(tag)) {
        const a = attributes(tag), key = (a.property || a.name || '').toLowerCase();
        if (key === 'description' || key === 'cmd:social-version' || /^(og:|twitter:)/.test(key)) return '';
      }
      if (/^<link\b/i.test(tag)) {
        const a = attributes(tag), rel = (a.rel || '').toLowerCase().split(/\s+/);
        if (rel.includes('canonical') || rel.includes('icon') || rel.includes('apple-touch-icon') || rel.includes('apple-touch-icon-precomposed')) return '';
      }
      return tag;
    });
    const meta = (key, value, attr = 'property') => `<meta ${attr}="${key}" content="${escapeHTML(value)}">`;
    let social = `<title>${escapeHTML(record.title)}</title>`;
    social += meta('description', record.description, 'name') + meta('og:type', record.type || 'music.song');
    social += meta('og:site_name', 'MusicSubject × Call Me Daddy') + meta('og:title', record.title);
    social += meta('og:description', record.description) + meta('og:url', record.canonical);
    social += meta('og:image', image) + meta('og:image:secure_url', image);
    social += meta('og:image:alt', record.imageAlt || `${record.title} artwork`);
    if (record.imageType) social += meta('og:image:type', record.imageType);
    if (record.width && record.height) social += meta('og:image:width', record.width) + meta('og:image:height', record.height);
    social += meta('twitter:card', 'summary_large_image', 'name') + meta('twitter:title', record.title, 'name');
    social += meta('twitter:description', record.description, 'name') + meta('twitter:image', image, 'name');
    social += meta('twitter:image:alt', record.imageAlt || `${record.title} artwork`, 'name');
    social += `<link rel="canonical" href="${escapeHTML(record.canonical)}"><link rel="icon" href="${escapeHTML(image)}"><link rel="apple-touch-icon" href="${escapeHTML(image)}">`;
    social += meta('cmd:social-version', SOCIAL_VERSION, 'name');
    if (client && !/\bsrc=["']\/song-favicon\.mjs(?:[?"'])/i.test(clean)) social += `<script type="module" src="/song-favicon.mjs?v=${SOCIAL_VERSION}"></script>`;
    return open + clean + social + close;
  });
}
