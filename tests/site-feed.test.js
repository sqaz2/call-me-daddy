const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'data/songs.js'), 'utf8'), sandbox, { filename: 'data/songs.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'data/radio-intents.js'), 'utf8'), sandbox, { filename: 'data/radio-intents.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'data/2026-08-25-uploads.js'), 'utf8'), sandbox, { filename: 'data/2026-08-25-uploads.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'data/briefing.js'), 'utf8'), sandbox, { filename: 'data/briefing.js' });

const songs = sandbox.window.CMD_SONGS;
const feed = sandbox.window.CMD_BRIEFING;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const safeId = /^[a-z0-9][a-z0-9-]*$/;
const acceptedDate = /^\d{4}-\d{2}(?:-\d{2}(?:T.*)?)?$/;

test('catalog and public feed load', () => {
  assert.ok(Array.isArray(songs) && songs.length > 0, 'CMD_SONGS must contain songs');
  assert.ok(feed && Array.isArray(feed.entries) && feed.entries.length > 0, 'CMD_BRIEFING must contain entries');
});

test('feed ids are unique and safe for share URLs', () => {
  const ids = feed.entries.map(entry => entry.id);
  assert.equal(new Set(ids).size, ids.length, 'feed entry ids must be unique');
  ids.forEach(id => assert.match(id, safeId));
});

test('feed dates preserve known precision', () => {
  feed.entries.forEach(entry => {
    assert.ok(entry.published, `${entry.id} needs a published value`);
    assert.match(entry.published, acceptedDate, `${entry.id} has an unsupported published value`);
  });
});

test('song-backed updates point at real catalog songs', () => {
  const songIds = new Set(songs.map(song => song.id));
  feed.entries.filter(entry => entry.songId).forEach(entry => {
    assert.ok(songIds.has(entry.songId), `${entry.id} points at missing song ${entry.songId}`);
  });
});

test('featured release order is explicit and collision-free', () => {
  const featured = feed.entries.filter(entry => entry.featured);
  const orders = featured.map(entry => entry.featuredOrder);
  assert.ok(featured.length > 0, 'at least one featured release is required');
  featured.forEach(entry => assert.ok(Number.isInteger(entry.featuredOrder) && entry.featuredOrder > 0, `${entry.id} needs a positive integer featuredOrder`));
  assert.equal(new Set(orders).size, orders.length, 'featuredOrder values must be unique');
});

test('song catalog ids are unique', () => {
  const ids = songs.map(song => song.id);
  assert.equal(new Set(ids).size, ids.length, 'song ids must be unique');
});

test('new upload batch resolves to two new song identities plus a Numbness version', () => {
  assert.ok(songs.some(song => song.id === 'side-chick-finder'));
  assert.equal(songs.find(song => song.id === 'one-brick')?.variants?.length, 2);
  assert.equal(songs.find(song => song.id === 'numbness-as-a-trap')?.variants?.length, 3);
});

test('every public feed entry has a static previewable update page', () => {
  feed.entries.forEach(entry => {
    const page = path.join(root, 'updates', entry.id, 'index.html');
    assert.ok(fs.existsSync(page), `${entry.id} needs updates/${entry.id}/index.html`);
    const html = fs.readFileSync(page, 'utf8');
    assert.match(html, /property="og:title"/, `${entry.id} needs an Open Graph title`);
    assert.match(html, /property="og:description"/, `${entry.id} needs an Open Graph description`);
    assert.match(html, /property="og:url"/, `${entry.id} needs an Open Graph URL`);
  });
});

test('update sharing uses real post URLs instead of fragment-only URLs', () => {
  const updates = read('updates/updates.js');
  const home = read('home-briefing.js');
  assert.ok(updates.includes("`/updates/${encodeURIComponent(entry.id)}/`"), 'updates page must build post URLs');
  assert.ok(home.includes("`/updates/${encodeURIComponent(entry.id)}/`"), 'homepage must build post URLs');
  assert.ok(!updates.includes("`/updates/#${encodeURIComponent(entry.id)}`"), 'updates sharing must not use fragment-only URLs');
});

test('homepage radio labels come from canonical radio configuration', () => {
  const home = read('home-briefing.js');
  const index = read('index.html');
  assert.match(home, /CMD_RADIO_CONFIG\?\.intents/, 'homepage must read the canonical intention config');
  assert.ok(index.indexOf('/data/radio-intents.js') < index.indexOf('/home-briefing.js'), 'radio config must load before homepage briefing');
});

test('mobile navigation remains available instead of disappearing', () => {
  const css = read('styles.css');
  assert.ok(css.includes('overflow-x: auto'), 'mobile nav should be horizontally scrollable');
  assert.ok(!/\.navlinks\s*\{\s*display:\s*none/.test(css), 'mobile nav must not be hidden');
});

test('sitemap includes updates, Armando, and all public update posts', () => {
  const sitemap = read('sitemap.xml');
  assert.ok(sitemap.includes('https://callmedaddy.musicsubject.com/updates/'), 'sitemap needs updates root');
  assert.ok(sitemap.includes('https://callmedaddy.musicsubject.com/power-pulse-uprising/'), 'sitemap needs Armando release');
  feed.entries.forEach(entry => {
    assert.ok(sitemap.includes(`https://callmedaddy.musicsubject.com/updates/${entry.id}/`), `sitemap needs update page for ${entry.id}`);
  });
});

test('key archive collections expose large-card social metadata', () => {
  ['old-files-new-tools/index.html', 'sad-music/index.html', 'sqaz/index.html'].forEach(file => {
    const html = read(file);
    assert.match(html, /property="og:image"/, `${file} needs og:image`);
    assert.match(html, /name="twitter:card" content="summary_large_image"/, `${file} needs a large Twitter/X card`);
    assert.match(html, /name="twitter:image"/, `${file} needs twitter:image`);
  });
});
