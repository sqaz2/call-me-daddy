/** Run against serve-release-test.mjs. --baseline verifies the pre-fix failure. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const base=process.env.SITE_BASE||'http://127.0.0.1:8765';
const baseline=process.argv.includes('--baseline');
const out=process.env.QA_OUTPUT||'/tmp/replay-qa';fs.mkdirSync(out,{recursive:true});
const report={base,baseline,checks:[],errors:[]};
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));
const check=name=>report.checks.push(name);
const sourceSuffix=id=>id==='main'?'/Set A Table For Two.mp3':'/fuck everybody but you.mp3';
const state=()=>page.evaluate(()=>{const p=window.CMDUniversalPlayer,m=p?.getMedia(),doc=m?.ownerDocument;return {track:p?.getTrack(),paused:m?.paused,time:m?.currentTime,src:m?.src,live:Boolean(doc?.defaultView&&doc.defaultView.document===doc&&m.isConnected),dock:document.querySelector('.cmd-universal-detail')?.textContent,href:location.href}});
const view=async selector=>{for(const f of [...page.frames()].reverse())if(await f.locator(selector).count())return f;throw Error('Missing page control '+selector)};
const tap=async selector=>(await view(selector)).locator(selector).first().tap();
const navigate=async url=>{await page.evaluate(u=>window.CMDPersistentSite.open(u),url);await page.waitForTimeout(700)};
const waitForCut=async id=>{
  await page.waitForFunction(id=>{const p=window.CMDUniversalPlayer,m=p?.getMedia(),t=p?.getTrack(),d=m?.ownerDocument;return t?.songId==='set-a-table-for-two'&&t.variantId===id&&m&&!m.paused&&!m.ended&&m.currentTime>.1&&d?.defaultView?.document===d},id,{timeout:12000});
  const before=await state();await page.waitForTimeout(350);const after=await state();
  assert.ok(after.time>before.time+.15,'Real decoder position must advance, not just the Play/Pause icon');
  assert.ok(decodeURI(after.src).endsWith(sourceSuffix(id)));return after;
};
const openReleaseFromUpdates=async()=>{await navigate('/updates/');await tap('a[href="/set-a-table-for-two/"]');await page.waitForTimeout(700)};
try{
  await page.goto(base+'/superstore-effect/',{waitUntil:'networkidle'});
  await tap('.ss-cover-button');
  await page.waitForFunction(()=>window.CMDUniversalPlayer?.getMedia()?.currentTime>.1);
  await openReleaseFromUpdates();await tap('#releasePlay');await waitForCut('main');
  await page.evaluate(()=>{const m=window.CMDUniversalPlayer.getMedia();m.currentTime=m.duration-.4});
  await waitForCut('voice-clone');
  await page.evaluate(()=>{const m=window.CMDUniversalPlayer.getMedia();m.currentTime=m.duration-.4});
  await page.waitForFunction(()=>window.CMDUniversalPlayer.getTrack()?.songId!=='set-a-table-for-two',null,{timeout:12000});
  check('Both original cuts naturally end before the replay scenario');
  await navigate('/superstore-effect/');
  await page.evaluate(()=>window.CMDUniversalPlayer.control('pause'));
  await tap('.ss-cover-button');await page.waitForTimeout(700);
  await openReleaseFromUpdates();await tap('#releasePlay');await waitForCut('main');
  check('Superstore → Updates → previously heard wedding cut plays on one tap');
  await page.locator('.cmd-universal-toggle').tap();
  await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia().paused);
  await page.evaluate(()=>{window.__replayOldMedia=window.CMDUniversalPlayer.getMedia()});
  let owner;
  for(const f of page.frames())if(await f.evaluate(()=>document===window.top.CMDUniversalPlayer?.getMedia()?.ownerDocument)){owner=f;break}
  assert.ok(owner&&owner!==page.mainFrame(),'Fixture must retain playback in a real child document');
  // An iframe WindowProxy survives reload, but its old media document does not.
  await owner.goto(owner.url(),{waitUntil:'networkidle'});
  assert.equal((await state()).live,false,'The retained adapter now refers to an unloaded document');
  report.before=await state();
  await tap('#releasePlay');
  if(baseline){
    await page.waitForTimeout(900);report.after=await state();
    assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia()===window.__replayOldMedia),true);
    assert.equal(report.after.live,false);
    assert.equal(report.after.time,report.before.time);
    assert.equal(report.after.dock,'Paused');
    check('Original code reproduces artwork toggling while dock remains paused and decoder never advances');
    await navigate('/');await navigate('/set-a-table-for-two/');await tap('#releasePlay');await page.waitForTimeout(600);
    assert.equal((await state()).live,false);
    check('Original failure persists after going Home and returning');
    await tap('[data-cut="voice-clone"]');await waitForCut('voice-clone');
    check('Selecting the other cut recovers the original failure, matching the report');
    report.reproduced=true;
  }else{
    await waitForCut('main');report.after=await state();
    assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia()===window.__replayOldMedia),false);
    check('One artwork tap replaces the unloaded owner and actually plays the SAME cut');
    await page.evaluate(()=>{window.__replayHealthyMedia=window.CMDUniversalPlayer.getMedia();window.CMDUniversalPlayer.control('seek',35)});
    await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia().currentTime>=35);
    await tap('#releasePlay');await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia().paused);
    const pausedTime=(await state()).time;
    await navigate('/');await openReleaseFromUpdates();await tap('#releasePlay');
    await waitForCut('main');
    assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia()===window.__replayHealthyMedia),true);
    assert.ok((await state()).time>=pausedTime);
    check('Healthy paused playback survives Home → Updates → return without resetting position or queue');
    await tap('[data-cut="voice-clone"]');const clone=await waitForCut('voice-clone');
    const f=await view('#releaseCover');
    assert.equal(new URL(await f.locator('#releaseCover').getAttribute('src'),base).href,new URL(clone.track.cover,base).href);
    assert.equal(await f.locator('#releaseSuno').getAttribute('href'),clone.track.sunoUrl);
    check('Alternate playback, artwork and Suno pairing remain correct');
    let playing=0,docks=0;
    for(const f of page.frames()){
      playing+=await f.evaluate(()=>[...document.querySelectorAll('audio')].filter(m=>!m.paused&&!m.ended).length);
      for(const dock of await f.locator('.cmd-universal-player').all())if(await dock.isVisible())docks++;
    }
    assert.equal(playing,1);assert.equal(docks,1);
    check('Exactly one playing audio element and one visible universal dock');
    assert.deepEqual(report.errors,[]);check('No uncaught JavaScript errors');
    await page.screenshot({path:path.join(out,'replay-fixed-mobile.png')});
  }
  report.success=true;
}catch(e){report.success=false;report.failure=String(e.stack||e);report.failureState=await state().catch(()=>null);process.exitCode=1}
finally{fs.writeFileSync(path.join(out,baseline?'baseline-replay.json':'fixed-replay.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close()}
