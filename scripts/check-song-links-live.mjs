import assert from 'node:assert/strict';
import data from '../worker/song-links-data.mjs';

const get = url => fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(12000) });
const failures = [];
for (const domain of Object.values(data.domains)) {
  try {
    const status = await get(`https://${domain}/.well-known/music-links`);
    assert.equal(status.status, 200, `${domain} readiness HTTP ${status.status}`);
    const marker = await status.json();
    assert.equal(marker.service, 'musicsubject-song-links');
    assert.equal(marker.revision, data.revision, `${domain} has a different song map`);
    for (const path of ['/1', '/1/2', '/9']) {
      const [number, slot = '1'] = path.slice(1).split('/');
      const row = data.rows.find(row => row.number === Number(number) && row.slot === Number(slot));
      const response = await get(`https://${domain}${path}`);
      assert.equal(response.status, 302, `${domain}${path} HTTP ${response.status}`);
      assert.equal(response.headers.get('location'), new URL(row.target, data.origin).href);
    }
    assert.equal((await get(`https://${domain}/999999`)).status, 404);
    console.log(`PASS https://${domain}: current registry, V6, earlier mix, Cheap to Inform, unknown-link 404`);
  } catch (error) { failures.push(`${domain}: ${error.message}`); }
}
for (const path of ['/music/?song=survival-mode&version=suno-v6-remix&share=1', '/cheap-to-inform/']) {
  try { assert.equal((await get(`${data.origin}${path}`)).status, 200, `Destination ${path}`); }
  catch (error) { failures.push(error.message); }
}
if (failures.length) { failures.forEach(error => console.error(error)); process.exitCode = 1; }
