const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SITE_BASE||'http://127.0.0.1:8765';
const out=process.env.QA_OUTPUT||'/tmp/replay-qa/2010-wows';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),checks=[],errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 const check=name=>{checks.push(name);console.log('PASS',name)};
 const wait=async id=>{
  await page.waitForFunction(id=>{const p=window.CMDUniversalPlayer,m=p?.getMedia?.();return p?.getTrack?.().songId==='2010-wows'&&p.getTrack().variantId===id&&m&&!m.paused&&m.currentTime>.1},id,{timeout:20000});
  const s=await page.evaluate(()=>{const p=window.CMDUniversalPlayer,m=p.getMedia(),track=p.getTrack();return {track,src:m.src,duration:m.duration,cover:document.querySelector('.cmd-universal-art img')?.src,title:document.querySelector('.cmd-universal-title')?.textContent,mediaTitle:m.ownerDocument.defaultView.navigator.mediaSession?.metadata?.title}});
  assert.equal(s.src,new URL(s.track.audio,base).href);assert.equal(s.cover,new URL(s.track.cover,base).href);assert.equal(s.title,s.track.title);assert.equal(s.mediaTitle,s.track.title);return s;
 };
 const frame=async()=>{for(const f of [...page.frames()].reverse())if(new URL(f.url()).pathname==='/archive/2010-wows/'&&(f===page.mainFrame()||await(await f.frameElement()).isVisible()))return f;throw Error('No visible archive frame')};
 const audible=()=>page.evaluate(()=>[document,...[...document.querySelectorAll('iframe')].map(f=>f.contentDocument)].filter(Boolean).flatMap(d=>[...d.querySelectorAll('audio,video')]).filter(m=>!m.paused&&!m.ended&&!m.muted).length);
 try{
  await page.goto(base+'/archive/2010-wows/?version=close-my-eyes-ai-mix',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#releaseAudio').getAttribute('src'),null);check('Page loads silent');
  for(const width of [320,390,1440]){await page.setViewportSize({width,height:width===1440?1000:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/'+width+'.png',fullPage:true});check('No horizontal overflow at '+width+'px')}
  await page.setViewportSize({width:390,height:844});
  await page.locator('#releasePlay').tap();let s=await wait('close-my-eyes-ai-mix');assert(s.src.endsWith('/close-my-eyes-ai-mix.mp3'));assert(Math.abs(s.duration-181.584)<.1);check('First artwork tap decodes the uploaded MP3 with matching identity');
  await page.evaluate(()=>window.CMDUniversalPlayer.getMedia().dispatchEvent(new Event('waiting')));
  await page.waitForFunction(()=>document.getElementById('releaseStatus').textContent.startsWith('Playing'),null,{timeout:5000});check('Buffering status clears when decoded playback continues');
  let f=await frame();await f.locator('[data-cut="special-2026-remix"]').click();s=await wait('special-2026-remix');assert(Math.abs(s.duration-167.832)<.1);check('Earlier remix keeps its own audio and artwork');
  await page.waitForTimeout(600);f=await frame();assert((await f.locator('#releaseShare').getAttribute('data-share-url')).includes('version=special-2026-remix'));check('Sharing follows the selected version');
  await f.locator('[data-cut="special-2026-remix"]').click();await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia().paused);
  await f.locator('[data-cut="special-2026-remix"]').click();await wait('special-2026-remix');check('Selected version pauses and resumes');
  await page.evaluate(()=>{window.CMDUniversalPlayer.control('seek',0);window.CMDUniversalPlayer.control('previous')});await wait('close-my-eyes-ai-mix');check('Previous returns to new mix');
  await page.evaluate(()=>{window.CMDUniversalPlayer.control('next');window.CMDUniversalPlayer.control('seek',0);window.CMDUniversalPlayer.control('previous');window.CMDUniversalPlayer.control('next')});await wait('special-2026-remix');assert.equal(await audible(),1);check('Rapid skips retain one audio owner and matching metadata');
  await page.evaluate(()=>{window.CMDUniversalPlayer.control('seek',0);window.CMDUniversalPlayer.control('previous')});await wait('close-my-eyes-ai-mix');
  await page.evaluate(()=>{const m=window.CMDUniversalPlayer.getMedia();m.currentTime=m.duration-4.1});
  await page.waitForFunction(()=>document.querySelector('.cmd-universal-detail')?.textContent.includes('Up next'),null,{timeout:5000});check('Up next appears before the recording ends');
  await wait('special-2026-remix');check('Natural end advances to the earlier version');
  await page.evaluate(()=>{window.__wowsOwner=window.CMDUniversalPlayer.getMedia();window.CMDPersistentSite.open('/updates/')});await page.waitForTimeout(1000);
  assert(await page.evaluate(()=>window.__wowsOwner===window.CMDUniversalPlayer.getMedia()&&!window.__wowsOwner.paused));check('Browsing What’s New preserves playback');
  await page.evaluate(()=>window.CMDPersistentSite.open('/archive/2010-wows/?version=close-my-eyes-ai-mix'));await page.waitForTimeout(1000);
  f=await frame();await f.locator('[data-cut="close-my-eyes-ai-mix"]').click();await wait('close-my-eyes-ai-mix');assert.equal(await audible(),1);check('Revisited page switches versions with one audio owner');
  await page.screenshot({path:out+'/playing.png',fullPage:true});
  let docks=0;for(const f of page.frames())for(const d of await f.locator('.cmd-universal-player').all())if(await d.isVisible())docks++;assert.equal(docks,1);assert.equal(await page.locator('.cmd-universal-player').evaluate(node=>getComputedStyle(node).position),'fixed');check('One visible fixed shared dock');
  await page.goto(base+'/archive/2010-wows/?version=special-2026-remix',{waitUntil:'networkidle'});assert.equal(await page.locator('[data-cut="special-2026-remix"]').getAttribute('aria-pressed'),'true');await page.locator('#releasePlay').click();await wait('special-2026-remix');check('Existing exact-version links still select the earlier remix');
  await page.goto(base+'/updates/',{waitUntil:'networkidle'});
  const tracks=await page.evaluate(()=>window.CMDLatestReleases.build({songs:window.CMD_SONGS,entries:window.CMD_BRIEFING.entries}).tracks.map(t=>({id:t.songId,version:t.variantId})));
  assert.equal(tracks[0].id,'2010-wows');assert.equal(tracks[0].version,'close-my-eyes-ai-mix');check('What’s New starts with this exact new mix');
  const newCard=page.locator('a[href*="/archive/2010-wows/"][href*="close-my-eyes-ai-mix"]');assert(await newCard.count()>0);check('What’s New links to the existing song page');
  assert.deepEqual(errors,[]);check('No browser JavaScript errors');
 }finally{fs.writeFileSync(out+'/report.json',JSON.stringify({checks,errors},null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
