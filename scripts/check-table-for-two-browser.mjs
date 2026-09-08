/** Real Chromium release smoke test. npm install --no-save playwright; run node scripts/serve-release-test.mjs at :8765. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const base=process.env.SITE_BASE||'http://127.0.0.1:8765';
const out=process.env.QA_OUTPUT||'/tmp/table-for-two-qa';
fs.mkdirSync(out,{recursive:true});
const report={base,checks:[],errors:[]};
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage();
page.on('pageerror',error=>report.errors.push(String(error)));
const check=(name,detail=true)=>report.checks.push({name,detail});
const state=()=>page.evaluate(()=>{const p=window.CMDUniversalPlayer,m=p?.getMedia?.(),t=p?.getTrack?.();return {track:t,source:m?.src,time:m?.currentTime,duration:m?.duration,paused:m?.paused,readyState:m?.readyState,href:location.href}});
const waitForCut=async id=>{
  await page.waitForFunction(id=>{const p=window.CMDUniversalPlayer,m=p?.getMedia?.(),t=p?.getTrack?.();return t?.songId==='set-a-table-for-two'&&t.variantId===id&&m&&!m.paused&&m.currentTime>.1},id,{timeout:25000});
  return state();
};
async function releaseFrame(){
  for(const frame of [...page.frames()].reverse()){
    if(!frame.url().includes('/set-a-table-for-two/'))continue;
    if(frame===page.mainFrame()||await (await frame.frameElement()).isVisible()){
      await frame.locator('#releasePlay').waitFor({timeout:12000});
      return frame;
    }
  }
  throw new Error('No visible release frame');
}
async function visibleDocks(){let count=0;for(const frame of page.frames())for(const dock of await frame.locator('.cmd-universal-player').all())if(await dock.isVisible())count++;return count;}
try{
  await page.goto(`${base}/set-a-table-for-two/`,{waitUntil:'networkidle'});
  assert.equal(await page.locator('#releaseAudio').getAttribute('src'),null);
  assert.equal(await page.locator('[data-cut="main"]').getAttribute('aria-pressed'),'true');
  check('Cold page is silent and selects wedding cut');
  await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
  for(const width of [320,390,1440]){
    await page.setViewportSize({width,height:width>800?1050:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    check(`No horizontal overflow at ${width}px`);
  }
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.locator('#releasePlay').click();
  let playing=await waitForCut('main');
  assert.ok(decodeURI(playing.source).endsWith('/fuck everybody but you.mp3'));
  assert.ok(playing.duration>143&&playing.duration<145);
  check('First artwork tap decodes and starts original wedding MP3',playing);
  await page.waitForTimeout(700);
  assert.equal(await visibleDocks(),1);
  check('Exactly one visible site-wide dock');
  let frame=await releaseFrame();
  await frame.locator('[data-cut="voice-clone"]').click();
  playing=await waitForCut('voice-clone');
  assert.ok(decodeURI(playing.source).endsWith('/Set A Table For Two.mp3'));
  assert.ok(playing.track.cover.endsWith('Screenshot_20260907-194633.png'));
  await page.waitForTimeout(700);
  frame=await releaseFrame();
  assert.match(await frame.locator('#releaseShare').getAttribute('data-share-url'),/version=voice-clone/);
  check('Variant selection synchronizes real source, artwork and exact-cut share',playing);
  assert.equal(await visibleDocks(),1);
  await page.evaluate(()=>{window.__qaOwner=window.CMDUniversalPlayer.getMedia();window.CMDUniversalPlayer.control('seek',40)});
  await page.waitForFunction(()=>{const m=window.CMDUniversalPlayer.getMedia();return !m.seeking&&m.currentTime>=39.5&&m.currentTime<45},null,{timeout:5000});
  check('Real media seek reaches 40 seconds',await state());
  frame=await releaseFrame();
  await frame.locator('#releasePlay').click();
  await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia().paused);
  await frame.locator('#releasePlay').click();
  await waitForCut('voice-clone');
  assert.equal(await page.evaluate(()=>window.__qaOwner===window.CMDUniversalPlayer.getMedia()),true);
  assert.ok((await state()).time>39);
  check('Artwork pause/resume delegates to same media owner and preserves seek');
  await page.evaluate(()=>{window.CMDUniversalPlayer.control('seek',0);window.CMDUniversalPlayer.control('previous')});
  await waitForCut('main');
  check('Previous from alternate returns to wedding recording');
  await page.evaluate(()=>{const m=window.CMDUniversalPlayer.getMedia();m.currentTime=m.duration-4.3});
  await page.waitForFunction(()=>document.querySelector('.cmd-universal-detail')?.textContent.includes('Up next in'),null,{timeout:4000});
  check('Five-second Up next appears before recording ends');
  await waitForCut('voice-clone');
  await page.waitForFunction(()=>location.search.includes('voice-clone'));
  check('Natural end advances to alternate and follows variant route');
  await page.evaluate(()=>{window.__qaOwner=window.CMDUniversalPlayer.getMedia();window.CMDPersistentSite.open('/music/')});
  await page.waitForTimeout(1800);
  assert.equal(await page.evaluate(()=>window.__qaOwner===window.CMDUniversalPlayer.getMedia()),true);
  assert.equal((await state()).paused,false);
  check('Browsing music catalog preserves owner and playing audio');
  await page.evaluate(()=>window.CMDPersistentSite.open('/set-a-table-for-two/?version=voice-clone'));
  await page.waitForTimeout(1200);
  frame=await releaseFrame();
  assert.equal(await frame.locator('[data-cut="voice-clone"]').getAttribute('aria-pressed'),'true');
  assert.equal(await visibleDocks(),1);
  check('Return to release reflects existing owner without a second dock');
  await page.evaluate(()=>window.CMDUniversalPlayer.control('next'));
  await page.waitForFunction(()=>{const p=window.CMDUniversalPlayer,m=p.getMedia(),t=p.getTrack();return t?.songId!=='set-a-table-for-two'&&t?.audio&&m&&!m.paused&&new URL(t.audio,location.href).href===m.src},null,{timeout:25000});
  check('Next after both cuts enters site radio with matching metadata',await state());
  const deep=await context.newPage();
  await deep.goto(`${base}/set-a-table-for-two/?version=voice-clone`,{waitUntil:'networkidle'});
  assert.equal(await deep.locator('[data-cut="voice-clone"]').getAttribute('aria-pressed'),'true');
  assert.match(await deep.locator('#releaseCover').getAttribute('src'),/Screenshot_/);
  assert.equal(await deep.locator('#releaseAudio').getAttribute('src'),null);
  await deep.locator('#releasePlay').click();
  await deep.waitForFunction(()=>{const p=window.CMDUniversalPlayer,m=p?.getMedia();return p?.getTrack()?.variantId==='voice-clone'&&m&&!m.paused&&m.currentTime>.1});
  check('Direct alternate link selects correct silent artwork and starts alternate on one tap');
  await deep.close();
  assert.deepEqual(report.errors,[]);
  check('No uncaught browser JavaScript errors');
  report.success=true;
}catch(error){report.success=false;report.failure=String(error.stack||error);report.failureState=await state().catch(()=>null);await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw error}
finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close()}
