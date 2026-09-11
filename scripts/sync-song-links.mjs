import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://callmedaddy.musicsubject.com';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const shareCategories = JSON.parse(read('content/song-share-categories.json'));
for (const [songId, category] of Object.entries(shareCategories)) {
  if (!['jokes', 'music'].includes(category)) throw new Error(`Invalid shareCategory: ${songId}`);
}
export function shareCategoryFor(song, variant) {
  const explicit = variant.shareCategory ?? song.shareCategory ?? shareCategories[song.id];
  if (explicit !== undefined) {
    if (!['jokes', 'music'].includes(explicit)) throw new Error(`Invalid shareCategory: ${song.id}`);
    return explicit;
  }
  // Editorial kind labels are deliberate; do not infer comedy from personal lyrics
  // or a variant title such as Will to Live's Namaste, Hamster Requiem.
  return /\b(satire|satirical|comedy|parody)\b/i.test(song.kind || '') ? 'jokes' : 'music';
}
export function loadCatalog() {
  const context = vm.createContext({ window: {}, location: { search: '' }, URLSearchParams });
  for (const file of ['data/songs.js', 'data/archive-catalog.js', 'data/radio-intents.js',
    'data/2026-08-25-uploads.js', 'data/2026-08-26-uploads.js', 'data/2026-08-27-uploads.js',
    'data/2026-08-29-uploads.js', 'catalog-cycle.js']) vm.runInContext(read(file), context, { filename: file });
  return JSON.parse(JSON.stringify(context.window.CMD_SONGS));
}
const variants = song => song.variants?.filter(v => v.audio).length
  ? song.variants.filter(v => v.audio) : [{ id: 'main', label: song.kind || 'Main version', audio: song.audio || '' }];

// Only explicit genre metadata/labels select a genre domain. Unknown music stays universal.
export function genreFor(song, variant) {
  const explicit = variant.shareGenre || song.shareGenre;
  if (explicit) {
    if (!['hiphop', 'dubstep', 'other'].includes(explicit)) throw new Error(`Invalid shareGenre: ${song.id}`);
    return explicit;
  }
  if (song.id === 'survival-mode' || song.id === 'cheap-to-inform') return 'hiphop';
  const label = `${variant.genre || ''} ${variant.label || ''}`;
  const text = variants(song).length > 1 ? label : `${label} ${song.genre || ''} ${song.title} ${song.kind || ''} ${song.description || ''}`;
  if (/\bdubstep\b/i.test(text)) return 'dubstep';
  if (/\bhip[ -]?hop\b|\brap\b/i.test(text)) return 'hiphop';
  return 'other';
}

export function allocate(catalog, previous = { schemaVersion: 1, songs: [] }) {
  const registry = structuredClone(previous);
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.songs)) throw new Error('Invalid song-link registry');
  const numbers = new Set(), ids = new Set();
  for (const row of registry.songs) {
    if (!Number.isSafeInteger(row.number) || row.number < 1 || numbers.has(row.number) || ids.has(row.songId)) throw new Error('Duplicate or invalid permanent song number');
    if (!row.versions?.length || new Set(row.versions).size !== row.versions.length) throw new Error(`Invalid version slots: ${row.songId}`);
    numbers.add(row.number); ids.add(row.songId);
  }
  let next = Math.max(0, ...numbers) + 1;
  // Bootstrap Survival Mode as /1; afterwards only append, never derive IDs from sorting.
  const ordered = [...catalog].sort((a, b) => (a.id === 'survival-mode' ? -1 : b.id === 'survival-mode' ? 1 : a.id.localeCompare(b.id)));
  for (const song of ordered) {
    let row = registry.songs.find(item => item.songId === song.id);
    if (!row) { row = { number: next++, songId: song.id, versions: [] }; registry.songs.push(row); }
    for (const version of variants(song)) if (!row.versions.includes(version.id)) row.versions.push(version.id);
  }
  return registry;
}

export function buildLinks(catalog, registry) {
  const rows = [];
  for (const saved of registry.songs) {
    const song = catalog.find(item => item.id === saved.songId);
    if (!song) continue; // Retired numbers stay reserved; they never resolve to another song.
    const available = variants(song);
    for (const [index, id] of saved.versions.entries()) {
      const variant = available.find(item => item.id === id);
      if (!variant) continue;
      const page = song.experience || '';
      const samePageSongs = catalog.filter(item => item.experience && new URL(item.experience, origin).pathname === new URL(page || '/music/', origin).pathname);
      const direct = page && !page.startsWith('/updates/') && available.length === 1 && samePageSongs.length === 1;
      let target = direct ? new URL(page, origin) : new URL('/music/', origin);
      if (!direct) {
        target.searchParams.set('song', song.id);
        target.searchParams.set('version', id);
        target.searchParams.set('share', '1');
      }
      const aliases = [song.experience, song.shareUrl, `/updates/release-${song.id}/`].filter(Boolean);
      rows.push({ number: saved.number, slot: index + 1, songId: song.id, version: id,
        title: song.title, label: variant.label || '', genre: genreFor(song, variant), shareCategory: shareCategoryFor(song, variant),
        audio: variant.audio || '', aliases, target: target.pathname + target.search + target.hash });
    }
  }
  const data = { schemaVersion: 1, origin, domains: { hiphop: 'hiphop.bid', dubstep: 'dubstep.bid', other: 'suno.fyi', jokes: 'jokes.win' }, rows };
  data.revision = createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16);
  return data;
}

export function syncSongLinks({ checkOnly = false } = {}) {
  const registryFile = 'content/song-links.json';
  const previous = fs.existsSync(path.join(root, registryFile)) ? JSON.parse(read(registryFile)) : undefined;
  const catalog = loadCatalog(), registry = allocate(catalog, previous), data = buildLinks(catalog, registry);
  const runtime = read('short-links/runtime.js').replace('/* SONG_LINK_DATA */', JSON.stringify(data));
  const start = '// SONG-LINKS:START', end = '// SONG-LINKS:END';
  const original = read('share.js');
  const rest = original.includes(end) ? original.slice(original.indexOf(end) + end.length).replace(/^\n/, '') : original;
  const outputs = [
    [registryFile, JSON.stringify(registry, null, 2) + '\n'],
    ['data/song-links.json', JSON.stringify(data) + '\n'],
    ['worker/song-links-data.mjs', '// Generated by scripts/sync-song-links.mjs.\nexport default ' + JSON.stringify(data) + ';\n'],
    ['share.js', `${start}\n${runtime}\n${end}\n${rest}`]
  ];
  for (const [file, content] of outputs) {
    if (fs.existsSync(path.join(root, file)) && read(file) === content) continue;
    if (checkOnly) throw new Error(`${file} is not synchronized; run node scripts/sync-releases.mjs`);
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  }
  return data;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = syncSongLinks({ checkOnly: process.argv.includes('--check') });
  console.log(`Song links: ${new Set(data.rows.map(row => row.number)).size} songs, ${data.rows.length} recordings.`);
}
