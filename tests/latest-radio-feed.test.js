const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const now = Date.parse('2026-09-08T08:00:00Z');
function setup() {
  const window = {};
  const context = vm.createContext({ window, URL, Date, Intl, location: { origin: 'https://callmedaddy.musicsubject.com' } });
  const load = name => vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), context);
  load('latest-releases.js');
  return { window, load, build: options => window.CMDLatestReleases.build({ now, ...options }) };
}

test('all supported historic musical announcement labels enter catch-up radio', () => {
  const e = setup();
  for (const type of ['New catalog entry', 'New catalog entry · remaster', 'Earlier file found', 'Earlier version found', 'Old file · three-version lineage', 'Satire', 'Two-version release', 'Latest version']) {
    const result = e.build({ songs: [{ id: 'x', title: 'Recording', audio: '/x.mp3' }],
      entries: [{ id: 'release-x', songId: 'x', type, published: '2026-08-29' }] });
    assert.equal(result.tracks.length, 1, type);
  }
});

test('editorial release labels are supported but a featured site change never re-promotes old audio', () => {
  const e = setup();
  for (const type of ['Site update', 'Sharing', 'Listening path']) {
    const result = e.build({ songs: [{ id: 'x', title: 'Recording', audio: '/x.mp3' }],
      entries: [{ id: 'feature-x', songId: 'x', type: 'Artist release', featured: true, published: '2026-08-29' },
        { id: 'site-x', songId: 'x', type, featured: true, published: '2026-09-07' }] });
    assert.equal(result.tracks.length, 1);
    assert.equal(result.tracks[0].releasePublished, '2026-08-29');
  }
});

test('fully extended canonical feed includes new catalog additions and rediscovered variants', () => {
  const e = setup();
  // Same order as the production Updates page: later upload modules extend the feed.
  ['data/songs.js', 'data/archive-catalog.js', 'data/radio-intents.js', 'data/2026-08-25-uploads.js',
    'data/briefing.js', 'data/2026-08-26-uploads.js', 'data/2026-08-27-uploads.js', 'data/2026-08-29-uploads.js'].forEach(e.load);
  const result = e.build({ songs: e.window.CMD_SONGS, entries: e.window.CMD_BRIEFING.entries });
  for (const id of ['power-moves-only', 'pull-me-like-that', 'fractured-face', 'wild-ways', 'one-million-dollars', 'where-the-bad-girls-at', 'ashes-in-eastwood'])
    assert.ok(result.tracks.some(track => track.songId === id), id);
  assert.ok(result.tracks.some(track => track.songId === 'make-me-an-animal' && track.variantId === 'may-2026-remastered'));
  const keys = result.tracks.map(track => track.audio);
  assert.equal(new Set(keys).size, keys.length);
  for (let i = 1; i < result.tracks.length; i++)
    assert.ok(Date.parse(result.tracks[i - 1].releasePublished) >= Date.parse(result.tracks[i].releasePublished));
});
