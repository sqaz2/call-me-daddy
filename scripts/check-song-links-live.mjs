import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import data from '../worker/song-links-data.mjs';

const get = url => fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(12000) });
const failures = [];
const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
const configured = new Set(config.routes.filter(route => route.custom_domain).map(route => route.pattern));
const domains = Object.values(data.domains).filter(domain => process.argv.includes('--all') || configured.has(domain));
assert.ok(domains.length, 'No short domains are configured for deployment');
for (const domain of Object.values(data.domains).filter(domain => !domains.includes(domain))) {
  console.log(`PENDING ${domain}: not configured for attachment yet`);
}
for (const domain of domains) {
  try {
    const status = await get(`https://${domain}/.well-known/music-links`);
    assert.equal(status.status, 200, `${domain} readiness HTTP ${status.status}${status.headers.has('location') ? ` redirect to ${status.headers.get('location')}` : ''}`);
    const marker = await status.json();
    assert.equal(marker.service, 'musicsubject-song-links');
    assert.equal(marker.revision, data.revision, `${domain} has a different song map`);
    const joke = data.rows.find(row => row.shareCategory === 'jokes' && row.slot === 1);
    const jokeVersion = data.rows.find(row => row.shareCategory === 'jokes' && row.slot > 1);
    const paths = new Set(['/1', '/1/2', '/9', ...[joke, jokeVersion].filter(Boolean).map(row => `/${row.number}${row.slot === 1 ? '' : `/${row.slot}`}`)]);
    for (const path of paths) {
      const [number, slot = '1'] = path.slice(1).split('/');
      const row = data.rows.find(row => row.number === Number(number) && row.slot === Number(slot));
      const response = await get(`https://${domain}${path}`);
      assert.equal(response.status, 302, `${domain}${path} HTTP ${response.status}`);
      assert.equal(response.headers.get('location'), new URL(row.target, data.origin).href);
    }
    assert.equal((await get(`https://${domain}/999999`)).status, 404);
    console.log(`PASS https://${domain}: current registry, V6, earlier mix, Cheap to Inform, satire and alternate joke recording, unknown-link 404`);
  } catch (error) { failures.push(`${domain}: ${error.message}${error.cause?.code ? ` (${error.cause.code})` : ''}`); }
}
for (const path of ['/music/?song=survival-mode&version=suno-v6-remix&share=1', '/cheap-to-inform/']) {
  try { assert.equal((await get(`${data.origin}${path}`)).status, 200, `Destination ${path}`); }
  catch (error) { failures.push(error.message); }
}
if (failures.length) { failures.forEach(error => console.error(error)); process.exitCode = 1; }
