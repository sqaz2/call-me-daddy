const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const NOW = Date.parse('2026-09-08T08:00:00Z');
const SINCE = Date.parse('2026-09-06T20:00:00Z');
const KEY = 'cmd:site-visit:v1';
function env({ store = new Map(), now = NOW, blocked = false, elements = {} } = {}) {
  let time = now;
  const listeners = {}, docListeners = {};
  const window = { location: { origin: 'https://callmedaddy.musicsubject.com', href: 'https://callmedaddy.musicsubject.com/updates/' },
    localStorage: { getItem: k => { if (blocked) throw Error('Blocked'); return store.get(k) || null; },
      setItem: (k, v) => { if (blocked) throw Error('Blocked'); store.set(k, v); } },
    addEventListener: (name, fn) => { listeners[name] = fn; } };
  window.top = window; window.self = window;
  class Clock extends Date { static now() { return time; } }
  const document = { getElementById: id => elements[id] || null,
    addEventListener: (name, fn) => { docListeners[name] = fn; } };
  const context = vm.createContext({ window, document, location: window.location, URL, URLSearchParams, Intl, Date: Clock });
  const load = file => vm.runInContext(read(file), context, { filename: file });
  return { window, document, store, load, listeners, docListeners, clock: value => { time = value; } };
}
const song = (id, extra = {}) => ({ id, title: id, artist: 'MusicSubject', audio: `/audio/${id}.mp3`, cover: `/${id}.jpg`, ...extra });
const release = (id, published, extra = {}) => ({ id: `release-${id}`, songId: id, published, type: 'New release', ...extra });
const songs = [song('old', { year: 2026 }), song('new', { year: 2007 }), song('middle')];
const entries = [release('old', '2026-09-04'), release('new', '2026-09-07T20:00:00-06:00', { featuredOrder: 100 }), release('middle', '2026-09-06T12:00:00-06:00', { featuredOrder: 0 })];
function builder(e = env()) { e.load('latest-releases.js'); return options => e.window.CMDLatestReleases.build({ songs, entries, now: NOW, ...options }); }
const ids = result => Array.from(result.tracks, track => track.songId);

test('newest release publication wins over source year, featured order and input ordering', () => {
  assert.deepEqual(ids(builder()()), ['new', 'middle', 'old']);
});
test('the previous visit counts new identities and keeps earlier releases in descending order', () => {
  const result = builder()({ since: SINCE });
  assert.equal(result.newReleaseCount, 1); assert.equal(result.releaseCount, 3);
  assert.deepEqual(Array.from(result.tracks, t => t.newSinceVisit), [true, false, false]);
  assert.deepEqual(ids(result), ['new', 'middle', 'old']);
});
test('first visits and no-new-music visits still have a playable chronological queue', () => {
  assert.equal(builder()().newReleaseCount, 0);
  const result = builder()({ since: NOW });
  assert.equal(result.newReleaseCount, 0); assert.equal(result.tracks.length, 3);
});
test('site updates cannot re-promote an old song and external or unknown songs are skipped', () => {
  const extras = [release('old', '2026-09-08T00:00:00-06:00', { type: 'Site update' }),
    release('unknown', '2026-09-08'), release('external', '2026-09-08')];
  assert.deepEqual(ids(builder()({ songs: [...songs, song('external', { audio: '', youtubeId: 'abc' })], entries: [...entries, ...extras] })), ['new', 'middle', 'old']);
});
test('invalid and future publications do not enter the playable queue', () => {
  for (const published of ['invalid', '2026-09-09', '2027-01', '2026-09-08T12:00:00-06:00']) {
    assert.equal(builder()({ entries: [release('new', published)] }).tracks.length, 0);
  }
});
test('day and month dates retain Edmonton calendar precision at UTC boundaries', () => {
  const now = Date.parse('2026-09-08T02:00:00Z');
  assert.equal(builder()({ now, entries: [release('new', '2026-09-08')] }).tracks.length, 0);
  const result = builder()({ now, since: Date.parse('2026-09-07T01:00:00Z'), entries: [release('new', '2026-09-07'), release('old', '2026-09')] });
  assert.equal(result.newReleaseCount, 1);
});
test('both supplied cuts keep exact recording, artwork and Suno metadata in declared order', () => {
  const variants = [{ id: 'main', audio: '/a.mp3', cover: '/a.jpg', sunoUrl: 'https://suno.com/song/a', label: 'Wedding cut' },
    { id: 'clone', audio: '/b.mp3', cover: '/b.jpg', sunoUrl: 'https://suno.com/song/b', label: 'Voice clone' }];
  const result = builder()({ songs: [song('new', { variants, title: 'Canonical title' })], entries: [release('new', '2026-09-07', { title: 'Announcement headline' })] });
  variants.forEach((variant, i) => {
    const track = result.tracks[i];
    assert.equal(track.audio, variant.audio); assert.equal(track.cover, variant.cover); assert.equal(track.sunoUrl, variant.sunoUrl);
    assert.equal(track.variantId, variant.id); assert.equal(track.title, 'Canonical title'); assert.equal(track.variantCount, 2);
  });
});
test('explicit new-version announcements queue that cut first and deduplicate older announcements', () => {
  const variants = [{ id: 'main', audio: '/a.mp3' }, { id: 'alt', audio: '/b.mp3' }];
  const base = release('new', '2026-09-05');
  for (const extra of [{ variantId: 'alt' }, { href: '/story/?version=alt' }]) {
    const result = builder()({ songs: [song('new', { variants })], entries: [base, release('new', '2026-09-07', { id: 'new-alt', type: 'New version', ...extra })] });
    assert.deepEqual(Array.from(result.tracks, t => t.variantId), ['alt', 'main']);
  }
});
test('the same audio or version is not repeated by duplicate release announcements', () => {
  const result = builder()({ songs: [song('new'), song('alias', { audio: '/audio/new.mp3' })], entries: [release('new', '2026-09-07'), release('new', '2026-09-06'), release('alias', '2026-09-05')] });
  assert.equal(result.tracks.length, 1);
});
test('parked versions and the existing heavy-lane preference are respected', () => {
  const e = env(); e.window.CMDListenerTaste = { isKilled: id => id === 'new' };
  e.window.CMDContentIntensity = { isAllowed: id => id !== 'middle' };
  assert.deepEqual(ids(builder(e)()), ['old']);
});
test('actual feed starts wedding → voice clone → Satan’s Loan → Superstore', () => {
  const e = env(); ['data/songs.js', 'data/archive-catalog.js', 'data/2026-08-25-uploads.js', 'data/2026-08-26-uploads.js', 'data/2026-08-27-uploads.js', 'data/2026-08-29-uploads.js', 'data/briefing.js'].forEach(e.load);
  const result = builder(e)({ songs: e.window.CMD_SONGS, entries: e.window.CMD_BRIEFING.entries, since: SINCE });
  assert.deepEqual(Array.from(result.tracks.slice(0, 4), t => [t.songId, t.variantId]), [
    ['set-a-table-for-two', 'main'], ['set-a-table-for-two', 'voice-clone'], ['satans-loan', 'main'], ['superstore-effect', 'main']]);
  assert.equal(result.newReleaseCount, 2);
});

test('first visit creates no fictitious prior visit', () => {
  const e = env(); e.load('visit-history.js');
  assert.equal(e.window.CMDVisitHistory.current().previousAt, null);
});
test('Homepage → Updates → reload preserves the old visit cutoff', () => {
  const store = new Map([[KEY, JSON.stringify({ version: 1, startedAt: SINCE - 1000, lastSeen: SINCE, previousAt: null })]]);
  const home = env({ store }); home.load('visit-history.js');
  const updates = env({ store, now: NOW + 5000 }); updates.load('visit-history.js');
  const reload = env({ store, now: NOW + 10000 }); reload.load('visit-history.js');
  assert.equal(home.window.CMDVisitHistory.current().previousAt, SINCE);
  assert.equal(updates.window.CMDVisitHistory.current().previousAt, SINCE);
  assert.equal(reload.window.CMDVisitHistory.current().previousAt, SINCE);
});
test('a new visit after inactivity uses the previous visit’s last activity, not its start', () => {
  const e = env(); e.load('visit-history.js');
  e.clock(NOW + 60000); e.window.CMDVisitHistory.touch();
  e.clock(NOW + 32 * 60000); e.window.CMDVisitHistory.touch();
  assert.equal(e.window.CMDVisitHistory.current().previousAt, NOW + 60000);
});
test('same-origin child pages and multiple tabs keep one browser visit boundary', () => {
  const store = new Map([[KEY, JSON.stringify({ version: 1, startedAt: SINCE, lastSeen: SINCE, previousAt: null })]]);
  const e = env({ store }); e.load('visit-history.js');
  const child = env({ store, now: NOW + 2000 }); child.window.top = e.window; child.load('visit-history.js');
  assert.equal(child.window.CMDVisitHistory, e.window.CMDVisitHistory);
  const tab = env({ store, now: NOW + 4000 }); tab.load('visit-history.js');
  assert.equal(tab.window.CMDVisitHistory.current().previousAt, SINCE);
});
test('blocked, corrupt, future or cleared storage safely falls back to first-visit memory', () => {
  for (const value of ['{', '[]', JSON.stringify({ version: 1, startedAt: NOW + 100, lastSeen: NOW + 100, previousAt: null })]) {
    const e = env({ store: new Map([[KEY, value]]) }); e.load('visit-history.js'); assert.equal(e.window.CMDVisitHistory.current().previousAt, null);
  }
  const e = env({ blocked: true }); e.load('visit-history.js'); e.clock(NOW + 10000);
  assert.doesNotThrow(() => e.window.CMDVisitHistory.touch());
  assert.equal(e.window.CMDVisitHistory.current().previousAt, null);
});

function playerEnv(options = {}) {
  let handler, audioCount = 0, creates = 0, pauses = 0;
  const loads = [], audios = [];
  const button = { addEventListener: (name, fn) => { handler = fn; } }, status = {};
  const e = env({ elements: { latestRadioPlay: button, latestRadioStatus: status } });
  e.document.createElement = () => { audioCount++; const audio = { remove() {} }; audios.push(audio); return audio; };
  e.document.body = { appendChild() {} };
  e.window.CMD_SONGS = songs; e.window.CMD_BRIEFING = { entries };
  e.window.CMDVisitHistory = { current: () => ({ previousAt: options.since ?? SINCE }), touch() {} };
  e.window.CMDPlaylistRadio = { create() {} };
  e.window.CMDUniversalPlayer = { getMedia: () => ({}), control: action => { if (action === 'pause') pauses++; } };
  e.window.CMDContinuousPlayback = { create: config => { creates++; return { load: (index, settings) => loads.push({ index, settings, config }), pause() {}, destroy() {} }; } };
  e.load('latest-releases.js'); e.load('updates/latest-player.js');
  return { e, button, status, click: () => handler(), state: () => ({ audioCount, creates, pauses, loads }) };
}
test('browsing Updates initializes no audio and never pauses the real owner', () => {
  const e = playerEnv(); assert.deepEqual(e.state(), { audioCount: 0, creates: 0, pauses: 0, loads: [] });
  assert.equal(e.button.disabled, false); assert.match(e.status.textContent, /1 release.*since your last visit/);
});
test('the first tap starts the sorted shared-controller queue synchronously and carries exclusions to its tail', () => {
  const e = playerEnv(); e.click(); const state = e.state();
  assert.equal(state.pauses, 1); assert.equal(state.creates, 1); assert.equal(state.audioCount, 1);
  assert.equal(state.loads[0].index, 0); assert.equal(state.loads[0].settings.autoplay, true);
  assert.deepEqual(ids(state.loads[0].config), ['new', 'middle', 'old']);
  assert.deepEqual(Array.from(state.loads[0].config.excludeIds), ['new', 'middle', 'old']);
});
test('repeat taps reuse the same audio and queue rather than adding players', () => {
  const e = playerEnv(); e.click(); e.click();
  assert.equal(e.state().creates, 1); assert.equal(e.state().audioCount, 1); assert.equal(e.state().loads.length, 2);
});
test('empty queues are disabled and an up-to-date visit still offers latest releases', () => {
  const e = playerEnv({ since: NOW }); assert.match(e.status.textContent, /up to date/); assert.equal(e.button.disabled, false);
  e.e.window.CMD_BRIEFING.entries = []; e.click(); assert.match(e.status.textContent, /No playable releases/);
});
test('entry points record the visit and Updates loads shared dependencies before its player', () => {
  for (const page of ['index.html', 'music/index.html', 'updates/index.html']) assert.ok(read(page).includes('/visit-history.js'));
  const html = read('updates/index.html');
  assert.ok(html.includes('id="latestRadioPlay"')); assert.ok(!html.includes('href="/music/?intent=surprise">Start the radio'));
  for (const dependency of ['/data/songs.js', '/data/briefing.js', '/catalog-cycle.js', '/playlist-radio.js', '/persistent-site-browser.js', '/universal-player.js', '/continuous-playback.js', '/latest-releases.js'])
    assert.ok(html.indexOf(dependency) < html.indexOf('/updates/latest-player.js'), dependency);
  assert.ok(!read('updates/latest-player.js').includes("addEventListener('ended'"));
  assert.ok(read('persistent-site-browser.js').includes('/visit-history.js'));
});
