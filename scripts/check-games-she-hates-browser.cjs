// Uses the existing Site checks Chromium installation and local media server.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SITE_BASE||'http://127.0.0.1:8765';
const out=process.env.QA_OUTPUT||'/tmp/replay-qa/games-she-hates';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),checks=[],errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 const check=name=>{checks.push(name);console.log('PASS',name)};
 const state=()=>page.evaluate(()=>{let p=window.CMDUniversalPlayer,m=p?.getMedia?.();return {track:p?.getTrack?.(),src:m?.src,time:m?.currentTime,paused:m?.paused,duration:m?.duration}});
 const wait=async id=>{await page.waitForFunction(id=>{let p=window.CMDUniversalPlayer,m=p?.getMedia?.();return p?.getTrack?.().songId==='the-games-she-hates'&&p.getTrack().variantId===id&&m&&!m.paused&&m.currentTime>.15},id,{timeout:20000});return state()};
 const frame=async()=>{for(const f of [...page.frames()].reverse())if(f.url().includes('/the-games-she-hates/')&&(f===page.mainFrame()||await(await f.frameElement()).isVisible()))return f;throw Error('No visible release frame')};
 try{
 await page.goto(base+'/the-games-she-hates/',{waitUntil:'networkidle'});
 assert.equal(await page.locator('#releaseAudio').getAttribute('src'),null);check('Page loads silent');
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:width===1440?1000:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/'+width+'.png',fullPage:true});check('No horizontal overflow at '+width+'px')}
 await page.setViewportSize({width:390,height:844});
 await page.locator('#releasePlay').click();let s=await wait('main');assert(s.src.endsWith('/main.mp3'));assert(Math.abs(s.duration-122.424)<.06);check('First artwork tap starts real title MP3');
 for(const id of ['be-yourself','be-yourself-2','end-this-cycle']){
  let f=await frame();await f.locator('[data-cut="'+id+'"]').click();s=await wait(id);assert(s.src.endsWith('/'+id+'.mp3'));assert(s.track.cover.endsWith('/'+id+'.jpg'));
  await page.waitForTimeout(600);f=await frame();assert((await f.locator('#releaseShare').getAttribute('data-share-url')).includes('version='+id));
  assert((await f.locator('#recordingLyricsLabel').textContent()).includes(id==='end-this-cycle'?'End This Cycle':'Be Yourself'));check(id+' audio, artwork, share and lyrics aligned');
 }
 let f=await frame();await f.locator('[data-cut="end-this-cycle"]').click();await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia().paused);await f.locator('[data-cut="end-this-cycle"]').click();await wait('end-this-cycle');check('Selected version pauses/resumes');
 await page.evaluate(()=>{window.CMDUniversalPlayer.control('seek',0);window.CMDUniversalPlayer.control('previous')});await wait('be-yourself-2');check('Previous selects preceding main version');
 await page.evaluate(()=>{const m=window.CMDUniversalPlayer.getMedia();m.currentTime=m.duration-4.1});
 await page.waitForFunction(()=>document.querySelector('.cmd-universal-detail')?.textContent.includes('Up next'),null,{timeout:5000});check('Up next before end');
 await wait('end-this-cycle');check('Natural end advances to bonus');
 await page.evaluate(()=>{window.__qaOwner=window.CMDUniversalPlayer.getMedia();window.CMDPersistentSite.open('/?q=The%20Games%20She%20Hates#homeSearchForm')});await page.waitForTimeout(1200);
 assert(await page.evaluate(()=>window.__qaOwner===window.CMDUniversalPlayer.getMedia()&&!window.__qaOwner.paused));check('Playback survives search navigation');
 await page.goto(base+'/?q=End%20This%20Cycle#homeSearchForm',{waitUntil:'networkidle'});
 assert((await page.locator('[data-home-song="the-games-she-hates"] .home-song-open').getAttribute('href')).includes('version=end-this-cycle'));check('Bonus search selects bonus');
 await page.goto(base+'/sad-music/',{waitUntil:'networkidle'});let bonus=page.locator('[data-song="the-games-she-hates"]');assert((await bonus.locator('a.primary').getAttribute('href')).includes('version=end-this-cycle'));await bonus.locator('.sad-quick-play').click();s=await wait('end-this-cycle');assert(s.track.cover.endsWith('/end-this-cycle.jpg'));check('Sad collection plays bonus with bonus artwork');
 await page.goto(base+'/the-games-she-hates/?version=be-yourself-2',{waitUntil:'networkidle'});assert.equal(await page.locator('[data-cut="be-yourself-2"]').getAttribute('aria-pressed'),'true');await page.locator('#releasePlay').click();await wait('be-yourself-2');check('Exact-version page starts requested recording');
 let docks=0;for(const f of page.frames())for(const d of await f.locator('.cmd-universal-player').all())if(await d.isVisible())docks++;assert.equal(docks,1);check('One visible dock');
 assert.deepEqual(errors,[]);check('No browser JavaScript errors');
 }finally{fs.writeFileSync(out+'/report.json',JSON.stringify({checks,errors},null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
