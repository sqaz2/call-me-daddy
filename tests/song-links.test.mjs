import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { allocate, buildLinks, genreFor, loadCatalog, shareCategoryFor } from '../scripts/sync-song-links.mjs';
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
  assert.ok(config.routes.some(route => route.pattern === new URL(data.origin).hostname && route.custom_domain));
  for (const host of Object.values(data.domains)) assert.ok(config.routes.some(route => route.pattern === host && route.custom_domain), `${host} is attached by the existing publisher`);
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

test('requested number audit keeps unique assignments and the correct destinations', () => {
  const registry = JSON.parse(fs.readFileSync(new URL('../content/song-links.json', import.meta.url), 'utf8'));
  assert.equal(new Set(registry.songs.map(song => song.number)).size, registry.songs.length);
  assert.equal(new Set(registry.songs.map(song => song.songId)).size, registry.songs.length);
  for (const [number, songId] of [[36, 'thirty-six'], [48, 'one-million-dollars'], [50, 'the-musician-police']]) {
    assert.equal(registry.songs.find(song => song.number === number).songId, songId);
    const row = data.rows.find(row => row.number === number);
    assert.equal(row.songId, songId);
    assert.equal(handleShortLink(new Request(`https://jokes.win/${number}`)).headers.get('location'), new URL(row.target, data.origin).href);
  }
});

test('share messages contain one correct short URL and preserve existing prose', async () => {
  const links = await browser();
  const original = `${data.origin}/the-musician-police/`;
  const message = links.prepareShare({ title: 'The Musician Police', text: 'WEE-OOO! Here comes the chorus.', url: original });
  assert.equal(message.text, 'WEE-OOO! Here comes the chorus.\nhttps://jokes.win/50');
  assert.equal(links.prepareShare(message).text, message.text);
  assert.equal(links.prepareShare({ text: `Listen here: ${original}`, url: original }).text, 'Listen here: https://jokes.win/50');
  const offline = await browser([]);
  assert.equal(offline.prepareShare({ text: 'Listen.', url: original }).text, `Listen.\n${original}`);
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
  const neutral = data.rows.find(row => row.genre === 'other' && row.shareCategory !== 'jokes');
  assert.match(links.forTrack({ songId: neutral.songId, variantId: neutral.version }), /^https:\/\/suno\.fyi\//);
  assert.equal(genreFor({ id: 'unknown', variants: [{ id: 'a', audio: '/a' }, { id: 'b', audio: '/b' }], description: 'A dubstep remix exists' }, { label: 'Original' }), 'other');
  assert.equal(genreFor({ id: 'unknown', shareGenre: 'hiphop' }, { shareGenre: 'dubstep' }), 'dubstep');
});

test('DnB labels and explicit overrides classify recordings without reclassifying sibling versions', () => {
  for (const label of ['DNB Folk Tale', 'DnB remix', 'D&B', 'Drum and Bass', 'drum & bass', 'drum-and-bass', "drum 'n' bass"]) {
    assert.equal(genreFor({ id: 'new' }, { label }), 'dnb', label);
  }
  assert.equal(genreFor({ id: 'new', shareGenre: 'dnb' }, {}), 'dnb');
  assert.equal(genreFor({ id: 'new', shareGenre: 'dubstep' }, { shareGenre: 'dnb' }), 'dnb');
  assert.equal(genreFor({ id: 'new', shareGenre: 'dnb' }, { shareGenre: 'other' }), 'other');
  const song = loadCatalog().find(song => song.id === 'where-monsters-are');
  assert.deepEqual(song.variants.map(variant => genreFor(song, variant)), ['dnb', 'other', 'other']);
  assert.equal(genreFor({ id: 'unknown', title: 'Bass drums in the rain' }, {}), 'other');
  assert.equal(genreFor({ id: 'unknown' }, { label: 'Deep Dark Dubstep Drop Mix' }), 'dubstep');
});

test('DnB sharing selects /54 for the actual recording, retains sibling links and falls back safely', async () => {
  const links = await browser();
  const row = data.rows.find(row => row.songId === 'where-monsters-are' && row.version === 'dnb-folk-tale');
  assert.equal(data.domains.dnb, 'dnb.fyi');
  assert.equal(row.number, 54); assert.equal(row.slot, 1); assert.equal(row.genre, 'dnb');
  const original = new URL(row.target, data.origin).href;
  const message = links.prepareShare({ text: 'Listen to Where Monsters Are — DNB Folk Tale.', url: original });
  assert.equal(message.url, 'https://dnb.fyi/54');
  assert.equal(message.text, 'Listen to Where Monsters Are — DNB Folk Tale.\nhttps://dnb.fyi/54');
  assert.equal(links.forTrack({ songId: 'satans-loan', variantId: 'main', audio: row.audio }), 'https://dnb.fyi/54');
  for (const [version, slot] of [['monster-and-maiden', 2], ['monster-and-maiden-alt', 3]]) {
    assert.equal(links.forTrack({ songId: row.songId, variantId: version }), `https://suno.fyi/54/${slot}`);
  }
  const fallback = await browser(Object.values(data.domains).filter(domain => domain !== 'dnb.fyi'));
  assert.equal(fallback.forUrl(original), 'https://suno.fyi/54');
  assert.equal((await browser([])).forUrl(original), original);
  const redirect = handleShortLink(new Request('https://dnb.fyi/54'));
  assert.equal(redirect.status, 302); assert.equal(redirect.headers.get('location'), original);
});

test('joke sharing wins over genre, preserves versions and falls back when unavailable', async () => {
  const links = await browser();
  const withoutJokes = await browser(Object.values(data.domains).filter(domain => domain !== 'jokes.win'));
  const onlyUniversal = await browser(['suno.fyi']);
  for (const row of data.rows.filter(row => row.shareCategory === 'jokes')) {
    const suffix = `/${row.number}${row.slot === 1 ? '' : `/${row.slot}`}`;
    const track = { audio: row.audio, songId: row.songId, variantId: row.version };
    assert.equal(links.forTrack(track), `https://jokes.win${suffix}`);
    assert.equal(withoutJokes.forTrack(track), `https://${data.domains[row.genre]}${suffix}`);
    assert.equal(onlyUniversal.forTrack(track), `https://suno.fyi${suffix}`);
    assert.equal(handleShortLink(new Request(`https://jokes.win${suffix}`)).headers.get('location'), new URL(row.target, data.origin).href);
  }
  for (const id of ['survival-mode', 'cheap-to-inform', 'everybody-else-less', 'will-to-live', 'satans-loan', 'stomp-clamp']) {
    assert.ok(data.rows.filter(row => row.songId === id).every(row => row.shareCategory === 'music'), id);
  }
  assert.equal(shareCategoryFor({ id: 'new', kind: 'Satirical civic ballad' }, {}), 'jokes');
  assert.equal(shareCategoryFor({ id: 'new', shareCategory: 'jokes' }, { shareCategory: 'music' }), 'music');
  assert.equal(shareCategoryFor({ id: 'new', kind: 'Personal song' }, { label: 'Namaste Hamster Requiem' }), 'music');
  assert.throws(() => shareCategoryFor({ id: 'new', shareCategory: 'typo' }, {}), /Invalid shareCategory/);
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
  assert.equal((await browser(['suno.fyi'])).forUrl(original), 'https://suno.fyi/9');
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
  assert.equal(handleShortLink(new Request('https://suno.fyi/999'), latest).status, 302);
  const status = handleShortLink(new Request('https://dubstep.bid/.well-known/music-links'), latest);
  assert.equal(status.headers.get('access-control-allow-origin'), '*');
  assert.equal((await status.json()).revision, 'next-release');
  assert.equal((await liveRegistry(async () => { throw new Error('offline'); })).revision, data.revision);
  assert.equal((await liveRegistry(async () => new Response(JSON.stringify({ ...updated, rows: [{ number: 1, slot: 1, target: '//evil.example/' }] })))).revision, data.revision);
});
