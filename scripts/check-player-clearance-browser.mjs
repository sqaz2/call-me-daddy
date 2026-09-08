/** Verify fixed playback UI never makes the end of a page unreachable. Run with serve-release-test.mjs. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const base=process.env.SITE_BASE||'http://127.0.0.1:8765';
const out=process.env.CLEARANCE_QA_OUTPUT||'/tmp/player-clearance-qa';
fs.mkdirSync(out,{recursive:true});
const report={base,checks:[],errors:[]};
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage();
page.on('pageerror',e=>report.errors.push(String(e)));
const check=(name,detail)=>report.checks.push({name,detail});

async function waitPlaying(songId){
  await page.waitForFunction(id=>{const p=window.CMDUniversalPlayer,m=p?.getMedia(),t=p?.getTrack();return t?.songId===id&&m&&!m.paused&&m.currentTime>.1},songId,{timeout:20000});
}
async function visibleFrame(selector){
  const main=page.mainFrame(),candidates=[];
  for(const frame of page.frames()){
    if(frame===main||!await frame.locator(selector).count())continue;
    try{
      const handle=await frame.frameElement();
      const layer=await handle.evaluate(el=>({open:Boolean(el.closest('.cmd-site-view.is-open')),z:Number(el.style.zIndex)||0}));
      if(layer.open)candidates.push({frame,z:layer.z});
    }catch{}
  }
  if(candidates.length)return candidates.sort((a,b)=>b.z-a.z)[0].frame;
  if(await main.locator(selector).count())return main;
  throw Error(`No visible ${selector}`);
}
async function topObstruction(){
  return page.evaluate(()=>{
    const rects=[...document.querySelectorAll('.cmd-universal-player:not([hidden]),.cmd-site-session-pill:not([hidden])')]
      .filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.height>0&&r.bottom>innerHeight-80})
      .map(el=>el.getBoundingClientRect().top);
    return rects.length?Math.min(...rects):innerHeight;
  });
}
async function assertBottomReachable(frame,label){
  await frame.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  await frame.waitForTimeout(250);
  const obstruction=await topObstruction();
  const result=await frame.evaluate(()=>{
    const target=document.querySelector('footer')||document.body.lastElementChild;
    const r=target.getBoundingClientRect();
    return {bottom:r.bottom,top:r.top,scrollY,scrollHeight:document.documentElement.scrollHeight,innerHeight,rootPadding:getComputedStyle(document.documentElement).paddingBottom};
  });
  assert.ok(result.bottom<=obstruction-8,`${label}: final content bottom ${result.bottom} must clear fixed UI at ${obstruction}`);
  check(label,{...result,obstruction});
}
try{
  // Direct-page case: the player and content live in the same document.
  await page.goto(base+'/set-a-table-for-two/',{waitUntil:'networkidle'});
  await page.locator('#releasePlay').tap();await waitPlaying('set-a-table-for-two');
  for(const width of [320,390,540]){
    await page.setViewportSize({width,height:844});await page.waitForTimeout(150);
    const geometry=await page.evaluate(()=>{const p=document.querySelector('.cmd-universal-player:not([hidden])')?.getBoundingClientRect();return {playerTop:p?.top,playerHeight:p?.height,rootPadding:parseFloat(getComputedStyle(document.documentElement).paddingBottom)||0,reported:window.CMDUniversalPlayer?.getClearance?.()||0}});
    assert.ok(geometry.playerHeight>100);
    assert.ok(geometry.reported>=geometry.playerHeight);
    assert.ok(geometry.rootPadding>=geometry.reported);
    check(`dynamic measured clearance at ${width}px`,geometry);
  }
  await page.setViewportSize({width:390,height:844});
  await assertBottomReachable(page,'Direct song-page footer scrolls completely above the player');
  await page.screenshot({path:path.join(out,'direct-bottom-mobile.png'),fullPage:false});

  // Persistent browsing case: the original song keeps playing in the host while a
  // different full-page iframe is in front of it. This is the screenshot's UX model.
  await page.evaluate(()=>{window.__clearanceOwner=window.CMDUniversalPlayer.getMedia();window.CMDPersistentSite.open('/superstore-effect/')});
  await page.waitForTimeout(900);
  const storyFrame=await visibleFrame('.ss-cover-button');
  assert.notEqual(storyFrame,page.mainFrame());
  assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia()===window.__clearanceOwner),true);
  await assertBottomReachable(storyFrame,'Visible persistent-page footer clears player and music-continues pill');
  const reserve=await storyFrame.evaluate(()=>({padding:parseFloat(getComputedStyle(document.documentElement).paddingBottom)||0,variable:getComputedStyle(document.documentElement).getPropertyValue('--cmd-persistent-clearance')}));
  assert.ok(reserve.padding>150);check('Persistent view receives host obstruction reserve',reserve);
  await page.screenshot({path:path.join(out,'persistent-bottom-mobile.png'),fullPage:false});

  // Player resizing and browser viewport changes should recompute, not rely on a magic number.
  await page.setViewportSize({width:680,height:680});await page.waitForTimeout(250);
  const afterResize=await page.evaluate(()=>({reported:window.CMDUniversalPlayer.getClearance(),playerTop:document.querySelector('.cmd-universal-player:not([hidden])').getBoundingClientRect().top,viewport:innerHeight}));
  assert.ok(Math.abs(afterResize.reported-(afterResize.viewport-afterResize.playerTop))<30);
  check('Viewport resize recomputes the obstruction from actual geometry',afterResize);

  // Navigating again must not accumulate padding each time.
  const before=await storyFrame.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).paddingBottom)||0);
  await page.evaluate(()=>window.CMDPersistentSite.open('/updates/'));await page.waitForTimeout(500);
  await page.evaluate(()=>window.CMDPersistentSite.open('/superstore-effect/'));await page.waitForTimeout(700);
  const returned=await visibleFrame('.ss-cover-button');
  const after=await returned.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).paddingBottom)||0);
  assert.ok(after<before+80,`clearance must not compound across navigation (${before} → ${after})`);
  await assertBottomReachable(returned,'Repeated navigation still leaves the page end reachable');
  check('Clearance does not compound on revisits',{before,after});

  assert.deepEqual(report.errors,[]);check('No uncaught browser errors');report.success=true;
}catch(error){
  report.success=false;report.failure=String(error.stack||error);await page.screenshot({path:path.join(out,'failure.png'),fullPage:false}).catch(()=>{});process.exitCode=1;
}finally{
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));await browser.close();
}
