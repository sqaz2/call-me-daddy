import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { resolveSocial } from '../song-social.mjs';
const origin = process.env.SOCIAL_BASE || 'http://127.0.0.1:8787';
const data = await (await fetch(origin + '/data/song-social.json')).json();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const paths = ['/make-me-an-animal-v6/', '/music/?song=make-me-an-animal&version=suno-v6', '/music/?song=make-me-an-animal&version=edm-switch-up-mix'];
  for (const route of paths) {
    await page.goto(origin + route, { waitUntil: 'domcontentloaded' });
    const expected = resolveSocial(route, data).image;
    await page.waitForFunction(image => document.querySelector('link[rel="icon"]')?.href === image, expected);
    assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'), expected);
  }
  // Exercise the same History API used by the persistent music browser. No reload or audio replacement.
  await page.waitForFunction(() => Boolean(window.CMDSongFavicon));
  for (const route of paths.slice().reverse()) {
    await page.evaluate(url => history.pushState({}, '', url), route);
    await page.waitForFunction(image => document.querySelector('link[rel="icon"]')?.href === image, resolveSocial(route, data).image);
  }
  await page.screenshot({ path: '/tmp/song-artwork-browser.png', fullPage: false });
  console.log('Mobile browser: direct-page, exact-version and persistent-navigation artwork icons passed.');
} finally { await browser.close(); }
