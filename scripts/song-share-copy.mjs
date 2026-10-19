import fs from 'node:fs';

const root = new URL('../', import.meta.url);
export function loadShareCopy(catalog) {
  const data = JSON.parse(fs.readFileSync(new URL('content/song-share-copy.json', root), 'utf8'));
  if (data.schemaVersion !== 1 || !data.songs) throw new Error('Invalid song share copy registry');
  for (const song of catalog) {
    const entry = data.songs[song.id];
    if (!entry) throw new Error(`Write reviewed share copy for ${song.id} before publishing`);
    const ids = new Set(song.variants?.map(v => v.id) || ['main']);
    for (const [id, copy] of [['default', entry], ...Object.entries(entry.variants || {})]) {
      if (id !== 'default' && !ids.has(id)) throw new Error(`Unknown share-copy version: ${song.id}/${id}`);
      const merged = { ...entry, ...copy };
      for (const [field, max] of [['headline', 110], ['text', 650], ['description', 240]]) {
        if (typeof merged[field] !== 'string' || !merged[field].trim() || merged[field].length > max || /https?:\/\//i.test(merged[field])) throw new Error(`Invalid ${field}: ${song.id}/${id}`);
      }
    }
    if (!entry.sources?.length || entry.sources.some(file => !fs.existsSync(new URL(file, root)))) throw new Error(`Missing evidence for share copy: ${song.id}`);
  }
  for (const id of Object.keys(data.songs)) if (!catalog.some(song => song.id === id)) throw new Error(`Unknown share-copy song: ${id}`);
  return data.songs;
}

export function shareCopyFor(copies, song, variant) {
  const entry = copies[song.id], copy = { ...entry, ...entry?.variants?.[variant.id] };
  if (!copy.text) throw new Error(`Missing share copy: ${song.id}/${variant.id}`);
  return { headline: copy.headline, text: copy.text, description: copy.description };
}

export function shareTitle(copy, song, variant) {
  const title = copy.headline.toLowerCase().includes(song.title.toLowerCase()) ? copy.headline : `${copy.headline} — ${song.title}`;
  const label = song.variants?.length > 1 && variant.label && !/^(main(?: version)?|original)$/i.test(variant.label) ? variant.label : '';
  return label && !title.toLowerCase().includes(label.toLowerCase()) ? `${title} · ${label}` : title;
}
