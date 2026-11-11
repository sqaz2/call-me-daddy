const { chromium } = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs');
const base = process.env.SITE_BASE || 'http://127.0.0.1:8765';
const links = require('../data/song-links.json');
(async () => {
  const { loadCatalog } = await import('./sync-song-links.mjs');
  const { hipHopBeats } = await import('../beats/model.mjs');
  const beat = hipHopBeats(loadCatalog())[0];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 17) AppleWebKit/537.36 Chrome/144.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/535.0]' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await context.route(url => Object.values(links.domains).includes(url.hostname), route => route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: JSON.stringify({ service: 'musicsubject-song-links', revision: links.revision }) }));
  await context.addInitScript(() => { window.__copies = []; Object.defineProperty(navigator, 'clipboard', { value: { writeText: text => { window.__copies.push(text); return Promise.resolve(); } } }); });
  try {
    await page.goto(base + (beat?.experience || '/beats/'), { waitUntil: 'networkidle' });
    if (!beat) {
      assert.equal(await page.locator('[data-beat-play]').count(), 0);
      assert.match(await page.locator('#beatGrid').innerText(), /No beats are published here yet/);
      assert.equal(await page.locator('#beatsAudio').getAttribute('src'), null);
      assert.equal(await page.locator('.beat-question').isVisible(), false);
      assert.deepEqual(errors, []);
      console.log('PASS Beats: no recording is invented when the intended upload has not been identified.');
      return;
    }
    assert.equal(await page.locator('#beatsAudio').getAttribute('src'), null);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const play = page.getByRole('button', { name: `Play ${beat.title} — ${beat.variantLabel}`, exact: true });
    await play.tap();
    await page.waitForFunction(({ id, version, audio }) => { const p = window.CMDUniversalPlayer, m = p?.getMedia?.(), t = p?.getTrack?.(); return t?.songId === id && t?.variantId === version && m && !m.paused && m.currentTime > .1 && new URL(m.src).pathname === audio; }, { id: beat.songId, version: beat.variantId, audio: beat.audio });
    assert.equal(await page.locator('#beatGrid [data-beat-play]').getAttribute('aria-pressed'), 'true');
    assert(await page.evaluate(() => window.CMDUniversalPlayer.getMedia().__cmdContinuousPlaybackController.getQueue().every(t => t.collection === 'hip-hop-beats')));
    await page.getByRole('button', { name: 'Copy post', exact: true }).tap();
    const row = links.rows.find(r => r.songId === beat.songId && r.version === beat.variantId);
    const short = `https://${links.domains.hiphop}/${row.number}/${row.slot}`;
    assert.equal(await page.locator('.cmd-share-link').inputValue(), short);
    assert.equal(await page.evaluate(() => window.__copies.at(-1)), row.share.text + '\n' + short);
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByRole('button', { name: `Pause ${beat.title} — ${beat.variantLabel}`, exact: true }).tap();
    await page.waitForFunction(() => window.CMDUniversalPlayer.getMedia().paused && document.getElementById('beatStatus').textContent.startsWith('Paused'));
    await page.getByRole('button', { name: `Play ${beat.title} — ${beat.variantLabel}`, exact: true }).tap();
    await page.waitForFunction(() => !window.CMDUniversalPlayer.getMedia().paused);
    await page.screenshot({ path: '/tmp/replay-qa/beats-390.png', fullPage: true });
    assert.deepEqual(errors, []);
    console.log('PASS Beats: silent load, phone/desktop layouts, first-tap audio, instrumental-only queue, exact engagement copy and pause/resume.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
