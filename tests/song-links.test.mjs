import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { allocate, buildLinks, genreFor, loadCatalog } from '../scripts/sync-song-links.mjs';
import data from '../worker/song-links-data.mjs';
import { handleShortLink, liveRegistry } from '../worker/short-links.mjs';
import mainWorker from '../worker/index.mjs';

const source = fs.readFileSync(new URL('../short-links/runtime.js', import.meta.url), 'utf8').replace('/* SONG_LINK_DATA */', JSON.stringify(data));

test('the existing music Worker routes short domains before assets and preserves ordinary pages', async () => {
  let assetRequests = 0;
  const env = { ASSETS: { fetch: async () => { assetRequests++; return new Response('existing song page'); } } };
  for (const host of Object.values(data.domains)) {
    const response = await mainWorker.fetch(new Request(`https://${host}/1`), env);
    assert.equal(response.status, 302);
    assert.equal(new URL(response.headers.get('location')).searchParams.get('song'), 'survival-mode');
    assert.equal((await mainWorker.fetch(new Request(`https://${host}/cheap-to-inform/`), env)).status, 404);
  }
  assert.equal(assetRequests, 0);
  assert.equal(await (await mainWorker.fetch(new Request(`${data.origin}/cheap-to-inform/`), env)).text(), 'existing song page');
  assert.equal(assetRequests, 1);
  const config = JSON.parse(fs.readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(config.assets.run_worker_first, true);
  assert.deepEqual(config.routes.map(route => route.pattern).sort(), [new URL(data.origin).hostname, ...Object.values(data.domains)].sort());
});
async function browser(active = Object.values(data.domains), stale = false) {
  const window = {};
  const context = vm.createContext({ window, location: { origin: data.origin }, URL, AbortSignal, Promise,
    fetch: async url => {
      if (!active.includes(new URL(url).hostname)) throw new Error('DNS not ready');
      return { ok: true, json: async () => ({ service: 'musicsubject-song-links', revision: stale ? 'old-deployment' : data.revision }) };
    }
  });
  vm.runInContext(source, context);
  await window.CMDShortLinks.ready;
  return window.CMDShortLinks;
}

test('Survival Mode V6 is /1 on every domain and the earlier mix is /1/2', () => {
  for (const domain of Object.values(data.domains)) {
    for (const [suffix, version] of [['/1', 'suno-v6-remix'], ['/1/2', 'celtic-north-remix']]) {
      const response = handleShortLink(new Request(`https://${domain}${suffix}`));
      const target = new URL(response.headers.get('location'));
      assert.equal(response.status, 302);
      assert.equal(target.origin, data.origin);
      assert.equal(target.searchParams.get('song'), 'survival-mode');
      assert.equal(target.searchParams.get('version'), version);
    }
  }
});

test('every generated link has a real page and preserves its recording through the catalog player', () => {
  const catalog = loadCatalog();
  for (const row of data.rows) {
    const target = new URL(row.target, data.origin);
    assert.ok(fs.existsSync(new URL(`..${target.pathname}index.html`, import.meta.url)), row.target);
    if (target.pathname === '/music/') {
      const context = vm.createContext({ window: { CMD_SONGS: catalog }, location: { search: target.search }, URLSearchParams });
      vm.runInContext(fs.readFileSync(new URL('../catalog-cycle.js', import.meta.url), 'utf8'), context);
      const queue = context.window.CMDCatalogCycle.build(catalog, { seed: 'short-links-test', ignoreHistory: true });
      assert.equal(queue[0].songId, row.songId, row.target);
      assert.equal(queue[0].variantId, row.version, row.target);
      assert.equal(queue[0].audio, row.audio, row.target);
    }
  }
});

test('numbers and version slots survive reorder, deletion, additions and default-version changes', () => {
  const a = { id: 'survival-mode', variants: [{ id: 'v6', audio: '/v6.mp3' }, { id: 'old', audio: '/old.mp3' }] };
  const b = { id: 'second', audio: '/second.mp3' };
  const initial = allocate([b, a]);
  const later = allocate([{ ...a, variants: [{ id: 'v7', audio: '/v7.mp3' }, ...a.variants].reverse() }, { id: 'new', audio: '/new.mp3' }], initial);
  assert.deepEqual(later.songs[0], { number: 1, songId: 'survival-mode', versions: ['v6', 'old', 'v7'] });
  assert.deepEqual(later.songs[1], initial.songs[1]);
  assert.equal(later.songs[2].number, 3);
  assert.throws(() => allocate([], { schemaVersion: 1, songs: [initial.songs[0], initial.songs[0]] }), /Duplicate/);
});

test('genre sharing respects the recording, while uncertain genres stay universal', async () => {
  const links = await browser();
  assert.equal(links.forTrack({ songId: 'survival-mode', variantId: 'suno-v6-remix' }), 'https://hiphop.bid/1');
  const dubstep = data.rows.find(row => row.songId === 'satans-loan');
  assert.equal(links.forTrack({ songId: dubstep.songId }), `https://dubstep.bid/${dubstep.number}`);
  const neutral = data.rows.find(row => row.genre === 'other');
  assert.match(links.forTrack({ songId: neutral.songId, variantId: neutral.version }), /^https:\/\/https\.fyi\//);
  assert.equal(genreFor({ id: 'unknown', variants: [{ id: 'a', audio: '/a' }, { id: 'b', audio: '/b' }], description: 'A dubstep remix exists' }, { label: 'Original' }), 'other');
  assert.equal(genreFor({ id: 'unknown', shareGenre: 'hiphop' }, { shareGenre: 'dubstep' }), 'dubstep');
});

test('actual audio overrides stale metadata, alternate mixes and rapid skips keep their own links', async () => {
  const links = await browser();
  const v6 = data.rows.find(row => row.number === 1 && row.slot === 1);
  const old = data.rows.find(row => row.number === 1 && row.slot === 2);
  const stale = { songId: 'cheap-to-inform', variantId: 'main' };
  for (const row of [old, v6, old, v6]) assert.equal(links.forTrack({ ...stale, audio: row.audio }), `https://hiphop.bid/1${row.slot === 1 ? '' : '/2'}`);
  assert.equal(links.forTrack({ ...stale, audio: '/unregistered.mp3' }), '');
});

test('page, catalog and version URLs share the same mapping without shortening unrelated projects', async () => {
  const links = await browser();
  assert.equal(links.forUrl(`${data.origin}/still-building/?song=survival-mode&version=suno-v6-remix`), 'https://hiphop.bid/1');
  assert.equal(links.forUrl(`${data.origin}/music/?song=survival-mode&version=celtic-north-remix`), 'https://hiphop.bid/1/2');
  assert.equal(links.forUrl(`${data.origin}/cheap-to-inform/`), 'https://hiphop.bid/9');
  for (const url of [`${data.origin}/still-building/`, `${data.origin}/music/?intent=heavy`, 'https://example.com/cheap-to-inform/']) assert.equal(links.forUrl(url), url);
});

test('inactive or stale domains preserve working links; universal domain is the fallback', async () => {
  const original = `${data.origin}/cheap-to-inform/`;
  for (const links of [await browser([]), await browser(Object.values(data.domains), true)]) assert.equal(links.forUrl(original), original);
  assert.equal((await browser(['https.fyi'])).forUrl(original), 'https://https.fyi/9');
});

test('invalid links, methods and injected destinations cannot redirect to an unrelated song/site', () => {
  for (const path of ['/0', '/01', '/999999', '/1/999', '/foo', '//evil.example']) assert.equal(handleShortLink(new Request(`https://hiphop.bid${path}`)).status, 404);
  assert.equal(handleShortLink(new Request('https://hiphop.bid/1', { method: 'POST' })).status, 405);
  const response = handleShortLink(new Request('https://hiphop.bid/1?url=https://evil.example&song=cheap-to-inform&version=main'));
  assert.equal(new URL(response.headers.get('location')).searchParams.get('song'), 'survival-mode');
  assert.equal(handleShortLink(new Request('https://hiphop.bid/1', { method: 'HEAD' })).body, null);
  assert.equal(handleShortLink(new Request('https://hiphop.bid/')).headers.get('location'), `${data.origin}/music/`);
});

test('readiness is public and revision-specific; new releases resolve without redeploying redirect Worker', async () => {
  const updated = { ...data, revision: 'next-release', rows: [...data.rows, { ...data.rows[0], number: 999 }] };
  const latest = await liveRegistry(async () => new Response(JSON.stringify(updated)));
  assert.equal(handleShortLink(new Request('https://https.fyi/999'), latest).status, 302);
  const status = handleShortLink(new Request('https://dubstep.bid/.well-known/music-links'), latest);
  assert.equal(status.headers.get('access-control-allow-origin'), '*');
  assert.equal((await status.json()).revision, 'next-release');
  assert.equal((await liveRegistry(async () => { throw new Error('offline'); })).revision, data.revision);
  assert.equal((await liveRegistry(async () => new Response(JSON.stringify({ ...updated, rows: [{ number: 1, slot: 1, target: '//evil.example/' }] })))).revision, data.revision);
});
