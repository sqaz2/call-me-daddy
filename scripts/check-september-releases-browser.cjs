const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SITE_BASE||'http://127.0.0.1:8765';
const out=process.env.QA_OUTPUT||'/tmp/replay-qa/september-releases';fs.mkdirSync(out,{recursive:true});
const releases=['nobody-wants-to-listen','8-walmart-parking-lot'].map(id=>JSON.parse(fs.readFileSync(`content/releases/2026-09-29-${id}.json`)).song);
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),checks=[],errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 const check=name=>{checks.push(name);console.log('PASS',name)};
 const visibleFrame=async route=>{
  for(const frame of [...page.frames()].reverse())if(new URL(frame.url()).pathname===route&&(frame===page.mainFrame()||await(await frame.frameElement()).isVisible()))return frame;
  throw Error('No visible release frame: '+route);
 };
 const wait=async(song,variant)=>{
  await page.waitForFunction(({song,variant})=>{const p=window.CMDUniversalPlayer,m=p?.getMedia?.(),t=p?.getTrack?.();return t?.songId===song&&t?.variantId===variant&&m&&!m.paused&&m.currentTime>.1},{song:song.id,variant:variant.id},{timeout:20000});
  const state=await page.evaluate(()=>{const p=window.CMDUniversalPlayer,m=p.getMedia(),t=p.getTrack();return {src:m.src,duration:m.duration,cover:document.querySelector('.cmd-universal-art img')?.src,title:document.querySelector('.cmd-universal-title')?.textContent,trackTitle:t.title,mediaTitle:m.ownerDocument.defaultView.navigator.mediaSession?.metadata?.title}});
  assert.equal(state.src,new URL(variant.audio,base).href);assert.equal(state.cover,new URL(variant.cover,base).href);
  assert.equal(state.title,state.trackTitle);assert.equal(state.mediaTitle,state.trackTitle);assert(Math.abs(state.duration-variant.duration)<.1);
  return state;
 };
 const ownerCount=()=>page.evaluate(()=>[document,...[...document.querySelectorAll('iframe')].map(f=>f.contentDocument)].filter(Boolean).flatMap(d=>[...d.querySelectorAll('audio,video')]).filter(m=>!m.paused&&!m.ended&&!m.muted).length);
 try{
  for(const song of releases){
   await page.goto(base+song.experience,{waitUntil:'networkidle'});
   assert.equal(await page.locator('#releaseAudio').getAttribute('src'),null);
   for(const width of [320,390,1440]){
    await page.setViewportSize({width,height:width===1440?1000:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`${out}/${song.id}-${width}.png`,fullPage:true});
   }
   check(song.title+': silent load and layouts at 320, 390 and 1440px');
   await page.setViewportSize({width:390,height:844});
   await page.locator('#releasePlay').tap();await wait(song,song.variants[0]);
   check(song.title+': first artwork tap plays the uploaded audio');
   for(const variant of song.variants){
    let frame=await visibleFrame(song.experience);
    if(variant!==song.variants[0])await frame.locator(`[data-cut="${variant.id}"]`).click();
    await wait(song,variant);
    frame=await visibleFrame(song.experience);
    await frame.waitForFunction(id=>document.getElementById('releaseLyrics').dataset.version===id,variant.id);
    assert((await frame.locator('#releaseShare').getAttribute('data-share-url')).includes('version='+variant.id));
    const expected=await frame.locator('#releaseLyricsData').textContent();
    assert.equal(await frame.locator('#releaseLyrics').textContent(),JSON.parse(expected)[variant.id]);
    assert.equal(await ownerCount(),1);
    check(song.title+' / '+variant.label+': audio, artwork, phone metadata, sharing and exact lyrics agree');
   }
  }
  const nobody=releases[0],walmart=releases[1];
  await page.evaluate(()=>{window.__releaseOwner=window.CMDUniversalPlayer.getMedia();window.__releaseTime=window.__releaseOwner.currentTime;window.CMDPersistentSite.open('/nobody-wants-to-listen/')});
  await page.waitForTimeout(800);
  assert(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia()===window.__releaseOwner&&!window.__releaseOwner.paused&&window.__releaseOwner.currentTime>=window.__releaseTime));
  let frame=await visibleFrame(nobody.experience);
  assert.equal(await frame.locator('#releaseAudio').getAttribute('src'),null);
  await frame.locator('[data-cut="beat-2"]').click();await wait(nobody,nobody.variants[1]);
  assert.equal(await ownerCount(),1);check('Browsing preserves the owner; choosing a version in the new page transfers playback once');
  await page.evaluate(()=>{window.CMDUniversalPlayer.control('seek',0);window.CMDUniversalPlayer.control('previous')});await wait(nobody,nobody.variants[0]);
  await page.evaluate(()=>{window.CMDUniversalPlayer.control('next');window.CMDUniversalPlayer.control('next');window.CMDUniversalPlayer.control('seek',0);window.CMDUniversalPlayer.control('previous')});await wait(nobody,nobody.variants[1]);
  assert.equal(await ownerCount(),1);check('Next, previous and rapid skips retain the right recording');
  await page.evaluate(()=>{const m=window.CMDUniversalPlayer.getMedia();m.currentTime=m.duration-4.1});
  await page.waitForFunction(()=>document.querySelector('.cmd-universal-detail')?.textContent.includes('Up next'),null,{timeout:5000});
  await wait(nobody,nobody.variants[2]);check('Five-second preview and natural advance continue through the versions');
  let docks=0;for(const f of page.frames())for(const d of await f.locator('.cmd-universal-player').all())if(await d.isVisible())docks++;
  assert.equal(docks,1);assert.equal(await page.locator('.cmd-universal-player').evaluate(node=>getComputedStyle(node).position),'fixed');
  await page.screenshot({path:out+'/one-shared-dock.png',fullPage:true});check('One visible fixed dock after cross-page playback');
  await page.goto(base+nobody.experience+'?version=extended-hook-remix',{waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-cut="extended-hook-remix"]').getAttribute('aria-pressed'),'true');
  await page.locator('#releasePlay').click();await wait(nobody,nobody.variants[4]);check('Exact alternate-version links play the selected recording on first tap');
  await page.goto(base+walmart.experience,{waitUntil:'networkidle'});await page.locator('#releasePlay').click();await wait(walmart,walmart.variants[0]);
  await page.evaluate(()=>{const m=window.CMDUniversalPlayer.getMedia();m.currentTime=m.duration-.3});
  await page.waitForFunction(()=>{const p=window.CMDUniversalPlayer,m=p?.getMedia?.();return p?.getTrack?.().songId!=='8-walmart-parking-lot'&&m&&!m.paused&&m.currentTime>.1},null,{timeout:20000});
  assert.equal(await ownerCount(),1);check('The single Walmart remaster continues into shared radio');
  const archive=JSON.parse(fs.readFileSync('content/releases/2026-09-29-2010-wows.json')).song;
  await page.goto(base+archive.experience+'?version=gangster-as-fuck-remix',{waitUntil:'networkidle'});
  await page.locator('#releasePlay').click();await wait(archive,archive.variants[0]);check('Gangster as Fuck Remix plays within the existing 2010 song identity');
  assert.deepEqual(errors,[]);check('No browser JavaScript errors');
 }finally{fs.writeFileSync(out+'/report.json',JSON.stringify({checks,errors},null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
