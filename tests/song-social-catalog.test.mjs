import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildSongSocial } from '../scripts/build-song-social.mjs';
import { ORIGIN, resolveSocial, readHead, attributes, imageURL } from '../song-social.mjs';
import { decorateSongHTML } from '../worker/site.mjs';
import links from '../worker/song-links-data.mjs';

const data = buildSongSocial();
const music = fs.readFileSync('music/index.html', 'utf8');
const binding = { async fetch() { return Response.json(data); } };
const source = html => new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', etag: '"before"', 'content-length': '99' } });
const icon = html => [...html.matchAll(/<link\b[^>]*>/gi)].map(m => attributes(m[0])).find(a => a.rel === 'icon')?.href;

test('Animal v6 is lion artwork; all three older Animal recordings remain distinct', async () => {
  const song = data.songs['make-me-an-animal'];
  assert.ok(song); assert.equal(Object.keys(song.versions).length, 4);
  const record = resolveSocial('/music/?song=make-me-an-animal&version=suno-v6&share=1', data);
  assert.match(record.image, /make-me-an-animal-v6\/cover\.png/);
  assert.ok(record.width > 0 && record.height > 0);
  assert.equal(data.pages['/make-me-an-animal-v6/'].image, record.image);
  const original = data.pages['/updates/release-make-me-an-animal/'];
  assert.equal(original.version, 'edm-switch-up-mix');
  assert.equal(original.image, song.versions['edm-switch-up-mix'].image);
  assert.match(original.title, /2025 Song Family/);
  for (const [id, earlier] of Object.entries(song.versions)) if (id !== 'suno-v6') assert.notEqual(earlier.image, record.image);
});
test('every numbered recording with artwork has correct raw HTML, canonical and favicon', async () => {
  let checked = 0;
  for (const row of links.rows) {
    const url = `${ORIGIN}/music/?song=${encodeURIComponent(row.songId)}&version=${encodeURIComponent(row.version)}&share=1`;
    const record = resolveSocial(url, data);
    assert.ok(record, `${row.songId}/${row.version} metadata missing`);
    if (!record.image) continue;
    const response = await decorateSongHTML(new Request(url, { headers: { 'user-agent': 'facebookexternalhit/1.1' } }), source(music), { ASSETS: binding });
    const html = await response.text(), parsed = readHead(html);
    assert.equal(parsed.image, record.image, row.songId); assert.equal(icon(html), record.image, row.songId);
    assert.equal(parsed.canonical, record.canonical); assert.equal(response.headers.get('etag'), null);
    assert.equal(html.split('</head>')[1], music.split('</head>')[1], 'player body must not change');
    checked++;
  }
  assert.ok(checked > 50); console.log(`Verified ${checked} recording previews against the complete numbered registry.`);
});
test('all indexed dedicated pages use their photo as the icon', async () => {
  for (const [route, record] of Object.entries(data.pages)) {
    const file = '.' + (route.endsWith('/') ? route + 'index.html' : route);
    if (!fs.existsSync(file)) continue;
    const response = await decorateSongHTML(new Request(ORIGIN + route), source(fs.readFileSync(file, 'utf8')), { ASSETS: binding });
    const html = await response.text();
    assert.equal(icon(html), record.image, route); assert.equal(readHead(html).image, record.image, route);
  }
});
test('local photos are real image files, not an HTML fallback', () => {
  const images = new Set([...Object.values(data.songs).flatMap(s => Object.values(s.versions)), ...Object.values(data.pages)].map(r => r.image).filter(Boolean));
  for (const value of images) {
    const url = new URL(imageURL(value)); if (url.origin !== ORIGIN) continue;
    const file = path.resolve('.' + decodeURIComponent(url.pathname));
    assert.ok(fs.existsSync(file), `Missing artwork ${url.pathname}`);
    const prefix = fs.readFileSync(file).subarray(0, 128).toString('utf8');
    assert.ok(!/<!doctype html|<html/i.test(prefix), `HTML returned as artwork ${url.pathname}`);
  }
});
test('HEAD, redirects, failures and non-HTML media pass through untouched', async () => {
  for (const [method, status, type] of [['HEAD',200,'text/html'],['GET',302,'text/html'],['GET',404,'text/html'],['GET',206,'audio/mpeg']]) {
    const response = new Response(null, { status, headers: { 'content-type': type } });
    assert.equal(await decorateSongHTML(new Request(ORIGIN, { method }), response, {}), response);
  }
});
