/** Exercise the real supplied recording through the shared player in touch Chromium. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.BASE_URL || 'http://127.0.0.1:8765';
const out = process.env.QA_DIR || '/tmp/cheap-to-inform-qa';
await fs.mkdir(out, {recursive:true});
const browser = await chromium.launch({headless:true});
const reports = [];
try {
  for (const spec of [
    {name:'mobile', viewport:{width:390,height:844}, isMobile:true, hasTouch:true, reducedMotion:'reduce'},
    {name:'desktop', viewport:{width:1440,height:1000}, reducedMotion:'no-preference'}
  ]) {
    const context = await browser.newContext({...spec, name:undefined});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      const response = await page.goto(`${base}/cheap-to-inform/`, {waitUntil:'domcontentloaded'});
      assert.equal(response.status(), 200);
      await page.waitForFunction(() => window.CMD_SONGS?.some(song => song.id === 'cheap-to-inform') && window.CMDContinuousPlayback);
      await page.waitForFunction(() => {const image = document.querySelector('.scene-cover img'); return image?.complete && image.naturalWidth > 0;});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'No horizontal scrolling');
      assert.equal(await page.locator('#sceneVideo').getAttribute('src'), null, 'No idle video download');
      await page.locator('.scene-cover').click();
      await page.waitForFunction(() => {const audio = window.CMDUniversalPlayer?.getMedia?.(); return audio && !audio.paused && audio.currentTime > .3 && (audio.currentSrc || audio.src).includes('/cheap-to-inform/audio.mp3');}, null, {timeout:25000});
      const before = await page.evaluate(() => window.CMDUniversalPlayer.getMedia().currentTime);
      await page.locator('.scene-cover').click();
      await page.waitForFunction(() => window.CMDUniversalPlayer.getMedia().paused);
      assert.ok(await page.evaluate(() => window.CMDUniversalPlayer.getMedia().currentTime) >= before, 'Pause retains position');
      await page.locator('.scene-cover').click();
      await page.waitForFunction(position => {const audio=window.CMDUniversalPlayer.getMedia(); return !audio.paused && audio.currentTime > position;}, before);
      if (spec.reducedMotion === 'reduce') {
        assert.equal(await page.locator('#sceneVideo').getAttribute('src'), null);
        await page.locator('#sceneMotion').click();
      }
      await page.waitForFunction(() => {const video=document.getElementById('sceneVideo'); return video.muted && video.readyState >= 2 && !video.paused;}, null, {timeout:25000});
      const media = await page.evaluate(() => {
        const audio=window.CMDUniversalPlayer.getMedia();
        const video=document.getElementById('sceneVideo');
        const image=document.querySelector('.scene-cover img');
        return {source:audio.currentSrc || audio.src, duration:audio.duration, position:audio.currentTime, imageWidth:image.naturalWidth, imageHeight:image.naturalHeight, videoWidth:video.videoWidth, videoHeight:video.videoHeight, muted:video.muted};
      });
      await page.locator('#sceneMotion').click();
      await page.waitForFunction(() => document.getElementById('sceneVideo').paused);
      assert.equal(await page.evaluate(() => window.CMDUniversalPlayer.getMedia().paused), false, 'Motion toggle does not stop audio');
      await page.evaluate(() => scrollTo(0,0));
      await page.screenshot({path:`${out}/${spec.name}.png`, fullPage:true});
      assert.deepEqual(errors, [], 'No runtime page errors');
      reports.push({viewport:spec.name, ...media, errors});
    } finally {await context.close();}
  }
} finally {await browser.close();}
await fs.writeFile(`${out}/report.json`, JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports,null,2));
