import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseRoot = path.join(root, 'content', 'releases');
const checkOnly = process.argv.includes('--check');
const problems = [];

const markers = {
  songs: ['  // RELEASE-MANIFEST:SONGS:START', '  // RELEASE-MANIFEST:SONGS:END'],
  updates: ['    // RELEASE-MANIFEST:UPDATES:START', '    // RELEASE-MANIFEST:UPDATES:END'],
  radio: ['/* RELEASE-MANIFEST:RADIO:START */', '/* RELEASE-MANIFEST:RADIO:END */'],
  sitemap: ['<!-- RELEASE-MANIFEST:SITEMAP:START -->', '<!-- RELEASE-MANIFEST:SITEMAP:END -->']
};

const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const report = message => problems.push(message);
const safeId = /^[a-z0-9][a-z0-9-]*$/;
const validDate = /^\d{4}-\d{2}(?:-\d{2}(?:T.*)?)?$/;
const intentIds = ['surprise', 'laugh', 'think', 'level-up', 'heavy', 'old-files'];

function replaceBlock(source, [start, end], body) {
  const startAt = source.indexOf(start);
  const endAt = source.indexOf(end, startAt + start.length);
  if (startAt < 0 || endAt < 0) throw new Error(`Missing generated block markers: ${start}`);
  const prefix = source.slice(0, startAt + start.length);
  const suffix = source.slice(endAt);
  return `${prefix}\n${body ? `${body}\n` : ''}${suffix}`;
}

function withoutBlock(source, pair) {
  return replaceBlock(source, pair, '');
}

function indentedJson(value, spaces = 2) {
  const pad = ' '.repeat(spaces);
  return JSON.stringify(value, null, 2).split('\n').map(line => `${pad}${line}`).join('\n');
}

function localFile(urlPath) {
  if (typeof urlPath !== 'string' || !urlPath.startsWith('/') || urlPath.startsWith('//')) return null;
  const clean = urlPath.split(/[?#]/, 1)[0].replace(/^\/+/, '');
  return clean ? path.join(root, clean) : root;
}

function requireLocalAsset(value, label) {
  if (!value) return;
  if (/^https?:\/\//i.test(value)) return;
  if (!value.startsWith('/media/')) report(`${label} must use the dated /media/ structure: ${value}`);
  const file = localFile(value);
  if (!file || !fs.existsSync(file)) report(`${label} does not exist: ${value}`);
}

function requireLocalPage(value, label) {
  if (!value || /^https?:\/\//i.test(value) || value.startsWith('/music/?')) return;
  const file = localFile(value);
  if (!file) return report(`${label} is not a valid local route: ${value}`);
  const target = path.extname(file) ? file : path.join(file, 'index.html');
  if (!fs.existsSync(target)) report(`${label} does not exist: ${value}`);
}

function isExactCatalogRoute(value, songId) {
  try {
    const url = new URL(value, 'https://callmedaddy.musicsubject.com');
    return url.pathname === '/music/' && url.searchParams.get('song') === songId;
  } catch {
    return false;
  }
}

function parseManifest(file) {
  const relative = path.relative(root, file);
  try {
    return { relative, value: JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch (error) {
    report(`${relative} is not valid JSON: ${error.message}`);
    return null;
  }
}

function validateManifest(manifest, relative) {
  const { song, radio, update } = manifest || {};
  if (manifest?.schemaVersion !== 1) report(`${relative} needs schemaVersion 1`);
  if (!song || typeof song !== 'object') return report(`${relative} needs a song object`);
  if (!safeId.test(song.id || '')) report(`${relative} has an invalid song.id`);
  for (const field of ['title', 'artist', 'description', 'cover']) {
    if (!String(song[field] || '').trim()) report(`${relative} needs song.${field}`);
  }
  if (!validDate.test(String(song.date || `${song.year || ''}-${String(song.month || '').padStart(2, '0')}`))) {
    report(`${relative} needs a supported song date`);
  }
  if (!song.audio && !song.youtubeUrl) report(`${relative} needs song.audio or song.youtubeUrl`);
  requireLocalAsset(song.audio, `${relative} song.audio`);
  requireLocalAsset(song.cover, `${relative} song.cover`);
  for (const variant of song.variants || []) requireLocalAsset(variant?.audio, `${relative} variant ${variant?.id || '(missing id)'}`);
  requireLocalPage(song.experience, `${relative} song.experience`);
  requireLocalPage(song.shareUrl, `${relative} song.shareUrl`);

  if (!radio || typeof radio !== 'object') {
    report(`${relative} needs a radio profile`);
  } else {
    for (const intent of intentIds) {
      const score = radio[intent];
      if (!Number.isFinite(score) || score < 0 || score > 100) report(`${relative} radio.${intent} must be from 0 to 100`);
    }
  }

  if (!update || typeof update !== 'object') return report(`${relative} needs an update object`);
  if (!safeId.test(update.id || '')) report(`${relative} has an invalid update.id`);
  if (update.songId !== song.id) report(`${relative} update.songId must equal song.id`);
  if (!validDate.test(String(update.published || ''))) report(`${relative} has an unsupported update.published value`);
  if (!String(update.summary || '').trim()) report(`${relative} needs update.summary`);
  if (!String(update.href || '').trim()) report(`${relative} needs update.href`);
  requireLocalPage(update.href, `${relative} update.href`);
  const expectedSharePath = `/updates/${update.id}/`;
  if (update.sharePath !== expectedSharePath) report(`${relative} update.sharePath must be ${expectedSharePath}`);
  if (update.featured !== true) report(`${relative} must set update.featured to true so new music reaches the homepage`);
  if (!Array.isArray(update.cardLines) || !update.cardLines.length) report(`${relative} needs update.cardLines for the homepage card`);
  if (!song.experience && song.audio) {
    if (!isExactCatalogRoute(song.shareUrl, song.id)) report(`${relative} song.shareUrl must target /music/?song=${song.id} until its story exists`);
    if (!isExactCatalogRoute(update.href, song.id)) report(`${relative} update.href must target /music/?song=${song.id} until its story exists`);
  }
}

const files = fs.readdirSync(releaseRoot)
  .filter(name => name.endsWith('.json') && !name.startsWith('_'))
  .sort()
  .map(name => path.join(releaseRoot, name));

const parsed = files.map(parseManifest).filter(Boolean);
for (const item of parsed) validateManifest(item.value, item.relative);

const releases = parsed.map(item => item.value).sort((a, b) => {
  const left = Date.parse(a.update.published) || 0;
  const right = Date.parse(b.update.published) || 0;
  return right - left || a.song.id.localeCompare(b.song.id);
});

const songIds = releases.map(item => item.song.id);
const updateIds = releases.map(item => item.update.id);
if (new Set(songIds).size !== songIds.length) report('Release manifests contain duplicate song ids');
if (new Set(updateIds).size !== updateIds.length) report('Release manifests contain duplicate update ids');

if (problems.length) {
  problems.forEach(problem => console.error(`- ${problem}`));
  process.exit(1);
}

const songsOriginal = read('data/songs.js');
const briefingOriginal = read('data/briefing.js');
const radioOriginal = read('data/radio-intents.js');
const sitemapOriginal = read('sitemap.xml');

const baseBriefing = withoutBlock(briefingOriginal, markers.updates);
const baseOrders = [...baseBriefing.matchAll(/featuredOrder\s*:\s*(\d+)/g)].map(match => Number(match[1]));
let nextFeaturedOrder = Math.max(0, ...baseOrders) + 1;
const updates = releases.map(release => {
  const update = { ...release.update };
  delete update.featuredOrder;
  if (update.featured) update.featuredOrder = nextFeaturedOrder++;
  return update;
});

const songsBody = releases.map(release => `${indentedJson(release.song)},`).join('\n');
const updatesBody = updates.map(update => `${indentedJson(update, 4)},`).join('\n');
const profiles = Object.fromEntries(releases.map(release => [release.song.id, release.radio]));
const radioBody = `Object.assign(window.CMD_RADIO_CONFIG.profiles, ${JSON.stringify(profiles, null, 2)});`;

let songsExpected = replaceBlock(songsOriginal, markers.songs, songsBody);
let briefingExpected = replaceBlock(briefingOriginal, markers.updates, updatesBody);
let radioExpected = replaceBlock(radioOriginal, markers.radio, radioBody);

const latestPublished = releases[0]?.update?.published;
if (latestPublished) briefingExpected = briefingExpected.replace(/updated:\s*"[^"]*"/, `updated: ${JSON.stringify(latestPublished)}`);

const origin = 'https://callmedaddy.musicsubject.com';
const sitemapBase = withoutBlock(sitemapOriginal, markers.sitemap);
const existingUrls = new Set([...sitemapBase.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]));
const generatedUrls = [];
for (const release of releases) {
  for (const route of [release.update.sharePath, release.song.experience]) {
    if (!route || !route.startsWith('/') || route.includes('#') || route.includes('?')) continue;
    const url = `${origin}${route}`;
    if (!existingUrls.has(url) && !generatedUrls.includes(url)) generatedUrls.push(url);
  }
}
const sitemapBody = generatedUrls.map(url => `<url><loc>${url}</loc></url>`).join('\n');
const sitemapExpected = replaceBlock(sitemapOriginal, markers.sitemap, sitemapBody);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function absoluteUrl(value) {
  if (/^https?:\/\//i.test(value || '')) return value;
  return `${origin}${value || ''}`;
}

function prettyDate(value) {
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'America/Edmonton' })
      .format(new Date(Date.UTC(year, month - 1, 1)));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Edmonton'
  }).format(parsed);
}

function renderUpdatePage(release, update) {
  const song = release.song;
  const title = update.title || song.title;
  const summary = update.summary || song.description;
  const cover = update.cover || song.cover;
  const version = song.variants?.[0]?.id || 'main';
  const player = `/music/?song=${encodeURIComponent(song.id)}&version=${encodeURIComponent(version)}&intent=${encodeURIComponent(update.intent || 'surprise')}&share=1`;
  const note = song.lineage || song.description;
  const canonical = absoluteUrl(update.sharePath);
  const image = absoluteUrl(cover);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#080808">
  <title>${escapeHtml(title)} — Call Me Daddy</title>
  <meta name="description" content="${escapeHtml(summary)}">
  <meta property="og:type" content="music.song">
  <meta property="og:site_name" content="MusicSubject × Call Me Daddy">
  <meta property="og:title" content="${escapeHtml(title)} — Call Me Daddy">
  <meta property="og:description" content="${escapeHtml(summary)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)} — Call Me Daddy">
  <meta name="twitter:description" content="${escapeHtml(summary)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/share.css?v=20260823-2">
  <link rel="stylesheet" href="/updates/post.css?v=20260825-1">
</head>
<body class="update-post-page">
  <!-- Generated by scripts/sync-releases.mjs from content/releases. -->
  <header class="topbar"><div class="shell nav"><a class="brand" href="/"><span class="brand-parent">MUSICSUBJECT</span><span class="brand-slash">×</span><span>CALL ME DADDY</span></a><nav class="navlinks"><a href="/">Home</a><a href="/music/">Music</a><a href="/updates/">Updates</a></nav></div></header>
  <main class="update-post">
    <a class="back" href="/updates/">← All updates</a>
    <div class="update-post-meta"><span>${escapeHtml(prettyDate(update.published))}</span><span>${escapeHtml(update.type || 'New release')}</span></div>
    <h1>${escapeHtml(title)}</h1>
    <p class="lede">${escapeHtml(summary)}</p>
    <div class="update-post-actions"><a class="btn primary" href="${escapeHtml(update.href || song.experience || player)}">${escapeHtml(update.cta || (song.experience ? 'Open the song' : 'Play this song'))}</a><a class="btn" href="${escapeHtml(player)}">Play and share</a><a class="btn" href="/music/">Browse music</a></div>
    <div data-share data-share-label="Share this release" data-share-title="${escapeHtml(title)} — Call Me Daddy" data-share-text="${escapeHtml(summary)}"></div>
    <p class="update-post-note">${escapeHtml(note)}</p>
  </main>
  <script src="/share.js?v=20260823-2"></script>
</body>
</html>
`;
}

const planned = [
  ['data/songs.js', songsExpected],
  ['data/briefing.js', briefingExpected],
  ['data/radio-intents.js', radioExpected],
  ['sitemap.xml', sitemapExpected]
];
for (let index = 0; index < releases.length; index += 1) {
  planned.push([`updates/${releases[index].update.id}/index.html`, renderUpdatePage(releases[index], updates[index])]);
}

for (const [relative, expected] of planned) {
  const file = path.join(root, relative);
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (current === expected) continue;
  if (checkOnly) {
    report(`${relative} is not synchronized with content/releases`);
    continue;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, expected);
  console.log(`Updated ${relative}`);
}

const entryContracts = [
  ['index.html', ['/data/songs.js', '/data/briefing.js', '/home-briefing.js']],
  ['music/index.html', ['/data/songs.js', '/music/music.js']],
  ['updates/index.html', ['/data/songs.js', '/data/briefing.js', '/updates/updates.js']]
];
for (const [relative, dependencies] of entryContracts) {
  const source = read(relative);
  let previous = -1;
  for (const dependency of dependencies) {
    const at = source.indexOf(dependency);
    if (at < 0) report(`${relative} must load ${dependency}`);
    else if (at <= previous) report(`${relative} loads ${dependency} in the wrong order`);
    previous = at;
  }
}

if (problems.length) {
  problems.forEach(problem => console.error(`- ${problem}`));
  process.exit(1);
}

console.log(`${checkOnly ? 'Checked' : 'Synchronized'} ${releases.length} release manifest${releases.length === 1 ? '' : 's'}.`);
