import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from './sync-song-links.mjs';
import { ORIGIN, imageURL, readHead, routePath, attributes } from '../song-social.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 16);

// Read real raster dimensions, without an image-processing dependency or invented sizes.
export function imageDimensions(bytes) {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), imageType: 'image/png' };
  if (bytes.length > 12 && bytes[0] === 255 && bytes[1] === 216) {
    let at = 2;
    while (at + 4 < bytes.length) {
      if (bytes[at] !== 255) { at++; continue; }
      while (bytes[at] === 255) at++;
      const marker = bytes[at++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (at + 2 > bytes.length) break;
      const length = bytes.readUInt16BE(at);
      if (length < 2 || at + length > bytes.length) break;
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker) && length >= 7) return { width: bytes.readUInt16BE(at + 5), height: bytes.readUInt16BE(at + 3), imageType: 'image/jpeg' };
      at += length;
    }
  }
  if (bytes.length >= 30 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    const type = bytes.toString('ascii', 12, 16);
    if (type === 'VP8X') return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3), imageType: 'image/webp' };
    if (type === 'VP8L' && bytes[20] === 47) { const n = bytes.readUInt32LE(21); return { width: 1 + (n & 16383), height: 1 + ((n >>> 14) & 16383), imageType: 'image/webp' }; }
    if (type === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) return { width: bytes.readUInt16LE(26) & 16383, height: bytes.readUInt16LE(28) & 16383, imageType: 'image/webp' };
  }
  return {};
}
export function buildSongSocial({ catalog = loadCatalog(), write = true } = {}) {
  const assets = new Map();
  const artwork = value => {
    const original = imageURL(value);
    if (!original) return { image: '' };
    if (assets.has(original)) return assets.get(original);
    const url = new URL(original), info = { image: original };
    if (url.origin === ORIGIN) {
      const local = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (local.startsWith(root + path.sep) && fs.existsSync(local) && fs.statSync(local).isFile()) {
        const bytes = fs.readFileSync(local);
        Object.assign(info, imageDimensions(bytes));
        url.searchParams.set('art', hash(bytes));
        info.image = url.href;
      }
    }
    assets.set(original, info); return info;
  };
  const songs = Object.create(null), associations = new Map();
  const associate = (value, songId, version) => {
    if (!value) return;
    const url = new URL(value, ORIGIN);
    if (url.origin !== ORIGIN || ['/music/', '/now-playing/', '/'].includes(routePath(url.href))) return;
    const route = routePath(url.href);
    const rows = associations.get(route) || [];
    rows.push({ songId, version: url.searchParams.get('version') || version });
    associations.set(route, rows);
  };
  for (const song of catalog) {
    const variants = song.variants?.length ? song.variants : [{ id: 'main', label: '', audio: song.audio }];
    const defaultVersion = (variants.find(v => v.audio && v.audio === song.audio) || variants[0]).id;
    const versions = Object.create(null);
    for (const variant of variants) {
      const label = variant.label || '';
      const suffix = label && !/^(main(?: version)?|song|original)$/i.test(label) && !song.title.toLowerCase().includes(label.toLowerCase()) ? ` — ${label}` : '';
      const title = `${song.title}${suffix} — ${song.artist || 'MusicSubject × Call Me Daddy'}`;
      versions[variant.id] = { title, description: variant.description || song.description || `Listen to ${song.title}.`,
        ...artwork(variant.cover || song.cover), imageAlt: `${song.title}${suffix} artwork`, type: 'music.song' };
      associate(variant.experience, song.id, variant.id);
      associate(variant.shareUrl, song.id, variant.id);
    }
    songs[song.id] = { defaultVersion, versions };
    associate(song.experience, song.id, defaultVersion);
    associate(song.shareUrl, song.id, defaultVersion);
    associate(`/updates/release-${song.id}/`, song.id, defaultVersion);
  }
  const pages = Object.create(null);
  const skip = new Set(['node_modules', 'media', 'assets', 'content', 'scripts', 'tests', 'worker']);
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.') || skip.has(entry.name) || entry.isSymbolicLink()) continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(file); continue; }
      if (!/\.html$/i.test(entry.name)) continue;
      const html = fs.readFileSync(file, 'utf8'), raw = readHead(html);
      const route = routePath('/' + path.relative(root, file).split(path.sep).join('/'));
      let record = { ...raw, ...artwork(raw.image), canonical: new URL(route, ORIGIN).href };
      const candidates = associations.get(route) || [], ids = [...new Set(candidates.map(r => r.songId))];
      if (ids.length === 1) {
        const songId = ids[0], song = songs[songId];
        const sourcePath = value => { try { return new URL(value, ORIGIN).pathname; } catch { return ''; } };
        const matching = Object.entries(song.versions).filter(([, r]) => raw.image && sourcePath(r.image) === sourcePath(raw.image));
        // Older story pages can have no og:image but explicitly cue an earlier mix.
        // Their primary recording link is stronger evidence than today's catalog default.
        const primary = [...html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').matchAll(/<a\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)]
          .map(m => { try { return new URL(attributes(m[0]).href || '/', ORIGIN); } catch { return null; } })
          .find(url => url?.origin === ORIGIN && ['/music/', '/now-playing/'].includes(routePath(url.href)) && url.searchParams.get('song') === songId && Object.hasOwn(song.versions, url.searchParams.get('version')));
        const preferred = primary?.searchParams.get('version') || candidates.find(r => r.version === song.defaultVersion)?.version || candidates[0].version;
        const version = (matching.find(([id]) => id === preferred) || matching[0])?.[0] || preferred;
        const selected = song.versions[version] || song.versions[song.defaultVersion];
        // Keep a dedicated page's authored wording when its photo matches the recording.
        record = { ...selected, ...(matching.length ? record : !raw.image ? { title: raw.title || selected.title, description: raw.description || selected.description } : {}), canonical: new URL(route, ORIGIN).href, songId, version };
      }
      if (record.image) pages[route] = record;
    }
  }
  walk(root);
  const data = { schemaVersion: 1, origin: ORIGIN, songs, pages };
  data.revision = hash(JSON.stringify(data));
  if (write) fs.writeFileSync(path.join(root, 'data/song-social.json'), JSON.stringify(data) + '\n');
  return data;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = buildSongSocial();
  console.log(`Song artwork: ${Object.keys(data.songs).length} songs, ${Object.values(data.songs).reduce((n, s) => n + Object.keys(s.versions).length, 0)} recordings, ${Object.keys(data.pages).length} pages. Revision ${data.revision}`);
}
