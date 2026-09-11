/** Actual touch-browser decoding and visit-boundary regression; use serve-release-test.mjs. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const base = process.env.SITE_BASE || 'http://127.0.0.1:8765';
const out = process.env.LATEST_QA_OUTPUT || '/tmp/latest-radio-qa';
fs.mkdirSync(out, { recursive: true });
const report = { base, checks: [], errors: [] };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const since = Date.parse('2026-09-06T20:00:00Z');
await context.addInitScript(({ since }) => {
  // This is an as-of release fixture. Media decoding and browser timers stay real.
  Date.now = () => Date.parse('2026-09-08T08:00:00Z');
  if (!localStorage.getItem('qa:latest-seeded')) {
    localStorage.setItem('cmd:site-visit:v1', JSON.stringify({ version: 1, startedAt: since - 1000, lastSeen: since, previousAt: null }));
    localStorage.setItem('qa:latest-seeded', '1');
  }
}, { since });
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(String(error)));
const check = name => report.checks.push(name);
const state = () => page.evaluate(() => {
  const p = window.CMDUniversalPlayer, m = p?.getMedia();
  return { track: p?.getTrack(), src: m?.src, time: m?.currentTime, paused: m?.paused, href: location.href };
});
async function playing(songId, variantId) {
  await page.waitForFunction(({ songId, variantId }) => {
    const p = window.CMDUniversalPlayer, m = p?.getMedia(), t = p?.getTrack();
    return t?.songId === songId && t.variantId === variantId && m && !m.paused && m.currentTime > .1;
  }, { songId, variantId }, { timeout: 20000 });
  const before = await state(); await page.waitForTimeout(350); const after = await state();
  assert.ok(after.time > before.time + .1, 'Decoded playback must advance');
  assert.equal(new URL(after.track.audio, base).href, after.src);
  return after;
}
async function shown(selector) {
  for (const frame of [...page.frames()].reverse()) {
    const element = frame.locator(selector).first();
    if (await element.count() && await element.isVisible()) return element;
  }
  throw Error('Missing visible control: ' + selector);
}
try {
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => window.CMDVisitHistory.current().previousAt), since);
  await page.locator('.navlinks a[href="#latest"]').tap();
  await page.getByRole('link', { name: 'All releases →', exact: true }).tap();
  await page.locator('#latestRadioPlay').waitFor();
  assert.match(await page.locator('#latestRadioStatus').textContent(), /2 releases.*since your last visit/);
  assert.equal(await page.evaluate(() => window.CMDVisitHistory.current().previousAt), since);
  assert.equal(await page.locator('#latestRadioAudio').count(), 0);
  check('Home → Latest → All releases preserves the previous visit and opening the feed is silent');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => window.CMDVisitHistory.current().previousAt), since);
  check('Reload does not erase the new-since-last-visit boundary');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(out, 'updates-newest-mobile.png'), fullPage: true });
  check('The catch-up button and status fit 320px, 390px and desktop widths');
  await page.locator('#latestRadioPlay').tap();
  let first = await playing('set-a-table-for-two', 'main');
  assert.ok(decodeURI(first.src).endsWith('/Set A Table For Two.mp3'));
  assert.ok(first.track.cover.endsWith('grok_image_1788830947264.jpg'));
  assert.equal(first.track.sunoUrl, 'https://suno.com/song/8d3d14bd-65fb-4b04-95ae-fc46ef1a039b');
  await page.waitForFunction(() => location.pathname === '/set-a-table-for-two/');
  check('One tap plays the newest wedding recording through the shared dock and follows its page');
  await page.evaluate(() => { const m = window.CMDUniversalPlayer.getMedia(); m.currentTime = m.duration - 4.3; });
  await page.waitForFunction(() => document.querySelector('.cmd-universal-detail')?.textContent.includes('Up next in'));
  await playing('set-a-table-for-two', 'voice-clone');
  const clone = await state();
  assert.ok(decodeURI(clone.src).endsWith('/fuck everybody but you.mp3'));
  assert.ok(clone.track.cover.endsWith('Screenshot_20260907-194633.png'));
  assert.equal(clone.track.sunoUrl, 'https://suno.com/song/de2f1819-86af-48c8-8f2b-32e7cb559f9f');
  check('Five-second Up next and natural advance retain the corrected alternate audio/artwork/Suno pairing');
  await page.evaluate(() => { const m = window.CMDUniversalPlayer.getMedia(); m.currentTime = m.duration - .5; });
  await playing('satans-loan', 'main');
  await page.waitForFunction(() => location.pathname === '/satans-loan/');
  check('Both newest cuts naturally advance to Satan’s Loan, not a shuffled catalog choice');
  await page.evaluate(() => window.CMDUniversalPlayer.control('next'));
  await playing('superstore-effect', 'main');
  await page.waitForFunction(() => location.pathname === '/superstore-effect/');
  check('After new-since-visit music, the queue continues to the next older release');
  await page.evaluate(() => { window.CMDUniversalPlayer.control('seek', 0); window.CMDUniversalPlayer.control('previous'); });
  await playing('satans-loan', 'main');
  await page.waitForFunction(() => location.pathname === '/satans-loan/');
  check('Previous uses the same chronological queue');
  await page.evaluate(() => { window.__latestOwner = window.CMDUniversalPlayer.getMedia(); window.CMDPersistentSite.open('/'); });
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => window.CMDUniversalPlayer.getMedia() === window.__latestOwner), true);
  assert.equal((await state()).paused, false);
  await (await shown('a[href="/updates/"]')).tap();
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => window.CMDUniversalPlayer.getMedia() === window.__latestOwner), true);
  assert.match(await (await shown('#latestRadioStatus')).textContent(), /2 releases.*since your last visit/);
  check('Home and back to Updates preserve playback, queue and the visit boundary');
  await (await shown('#latestRadioPlay')).tap();
  await playing('set-a-table-for-two', 'main');
  await page.waitForTimeout(500);
  let visibleDocks = 0, activeAudio = 0;
  for (const frame of page.frames()) {
    activeAudio += await frame.evaluate(() => [...document.querySelectorAll('audio')].filter(a => !a.paused && !a.ended).length);
    for (const dock of await frame.locator('.cmd-universal-player').all()) if (await dock.isVisible()) visibleDocks++;
  }
  assert.equal(visibleDocks, 1); assert.equal(activeAudio, 1);
  check('Restarting latest-first hands over cleanly with one active audio and one dock');
  for (const mode of ['first', 'caught-up', 'storage-blocked']) {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await c.addInitScript(mode => {
      Date.now = () => Date.parse('2026-09-08T08:00:00Z');
      if (mode === 'caught-up') {
        const now = Date.now(); localStorage.setItem('cmd:site-visit:v1', JSON.stringify({ version: 1, startedAt: now, lastSeen: now, previousAt: now - 1000 }));
      }
      if (mode === 'storage-blocked') Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
    }, mode);
    const p = await c.newPage(); p.on('pageerror', e => report.errors.push(String(e)));
    await p.goto(base + '/updates/', { waitUntil: 'networkidle' });
    assert.equal(await p.locator('#latestRadioPlay').isEnabled(), true);
    assert.match(await p.locator('#latestRadioStatus').textContent(), mode === 'caught-up' ? /up to date/ : /Newest releases first/);
    await p.locator('#latestRadioPlay').tap();
    await p.waitForFunction(() => window.CMDUniversalPlayer?.getTrack()?.songId === 'set-a-table-for-two' && window.CMDUniversalPlayer.getMedia().currentTime > .1);
    check(`${mode}: latest playback works without claiming unavailable listening history`);
    await c.close();
  }
  assert.deepEqual(report.errors, []); check('No uncaught browser errors'); report.success = true;
} catch (error) {
  report.success = false; report.failure = String(error.stack || error); report.failureState = await state().catch(() => null);
  await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {}); process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2)); await browser.close();
}
