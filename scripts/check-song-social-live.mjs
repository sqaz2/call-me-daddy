import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ORIGIN, SOCIAL_VERSION, readHead, resolveSocial, attributes } from '../song-social.mjs';
import links from '../worker/song-links-data.mjs';
const get = value => fetch(value, { headers: { 'user-agent': 'facebookexternalhit/1.1' }, signal: AbortSignal.timeout(25000) });
let ready = false;
for (let attempt = 0; attempt < 36; attempt++) {
  try {
    const response = await get(`${ORIGIN}/make-me-an-animal-v6/?metadata-check=${Date.now()}`);
    ready = response.ok && response.headers.get('x-song-social') === SOCIAL_VERSION;
    await response.body?.cancel();
    if (ready) break;
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 10000));
}
assert.ok(ready, 'Production has not served the new artwork Worker yet; no live-success claim.');
const indexResponse = await get(`${ORIGIN}/data/song-social.json`);
assert.ok(indexResponse.ok, 'Production artwork index unavailable');
const data = await indexResponse.json();
const cases = new Map();
for (const row of links.rows) {
  const expected = resolveSocial(row.target, data);
  if (expected?.image) cases.set(ORIGIN + row.target, expected);
}
for (const [route, record] of Object.entries(data.pages)) if (record.songId) cases.set(ORIGIN + route, record);
cases.set('https://suno.fyi/30/4', resolveSocial('/music/?song=make-me-an-animal&version=suno-v6', data));
const results = [], queue = [...cases];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const [url, expected] = queue.shift();
    try {
      const response = await get(url); assert.ok(response.ok, `HTTP ${response.status}`);
      const html = await response.text(), parsed = readHead(html);
      assert.equal(parsed.image, expected.image, 'Open Graph image');
      assert.equal(parsed.canonical, expected.canonical, 'canonical URL');
      const icon = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => attributes(m[0])).find(a => a.rel === 'icon');
      assert.equal(icon?.href, expected.image, 'favicon');
      results.push({ url, ok: true, image: parsed.image });
    } catch (error) { results.push({ url, ok: false, error: error.message }); }
  }
}));
const images = [...new Set(results.filter(r => r.ok).map(r => r.image))];
const imageResults = [];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (images.length) {
    const url = images.shift();
    try {
      const response = await fetch(url, { method: 'HEAD', headers: { 'user-agent': 'facebookexternalhit/1.1' }, signal: AbortSignal.timeout(25000) });
      assert.ok(response.ok && response.headers.get('content-type')?.startsWith('image/'), `HTTP ${response.status}, ${response.headers.get('content-type')}`);
      imageResults.push({ url, ok: true });
    } catch (error) { imageResults.push({ url, ok: false, error: error.message }); }
  }
}));
const report = { revision: data.revision, pages: results, images: imageResults };
fs.writeFileSync('/tmp/song-artwork-live.json', JSON.stringify(report, null, 2));
const failed = [...results, ...imageResults].filter(r => !r.ok);
for (const row of failed) console.error(`::error::${row.url} — ${row.error}`);
assert.equal(failed.length, 0, `${failed.length} production artwork checks failed`);
console.log(`Production verified: ${results.length} page/share URLs and ${imageResults.length} image URLs; revision ${data.revision}.`);
