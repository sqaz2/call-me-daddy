const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SITE_BASE||'http://127.0.0.1:8765';
const releaseId=process.argv[2]||'since-before-youtube';
const cases={
 'since-before-youtube':{manifest:'2026-09-30-since-before-youtube',query:'You finding me now',note:'#release-note',copy:"I've been in the McDonald's drive-through while I got this page built. That's how slow the line was moving.",short:'https://dnb.fyi/63'},
 'times-are-coming':{manifest:'2026-10-01-times-are-coming',query:'Something good is coming',note:'#song-story',copy:'the chill in the weather and the hope that something good is on its way.',short:'https://dubstep.bid/64/2'}
};
const config=cases[releaseId];assert(config,'Choose a known release fixture');
const out=`/tmp/replay-qa/${releaseId}`;fs.mkdirSync(out,{recursive:true});
const {song,lyrics,update}=require(`../content/releases/${config.manifest}.json`);
const variant=song.variants[0];
const links=require('../data/song-links.json');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 17) AppleWebKit/537.36 Chrome/144.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/535.0]'});
 const page=await context.newPage(),checks=[],errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 const check=name=>{checks.push(name);console.log('PASS',name)};
 await context.route(url=>Object.values(links.domains).includes(url.hostname),route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:JSON.stringify({service:'musicsubject-song-links',revision:links.revision})}));
 await context.addInitScript(()=>{window.__copies=[];Object.defineProperty(navigator,'clipboard',{value:{writeText:text=>{window.__copies.push(text);return Promise.resolve()}}});Object.defineProperty(navigator,'share',{value:()=>{throw Error('Facebook must use the copy fallback')}})});
 const frame=async()=>{for(const f of [...page.frames()].reverse())if(new URL(f.url()).pathname===song.experience&&(f===page.mainFrame()||await(await f.frameElement()).isVisible()))return f;throw Error('No visible release frame')};
 const playing=(target=variant)=>page.waitForFunction(({id,version,audio})=>{const p=window.CMDUniversalPlayer,m=p?.getMedia?.(),t=p?.getTrack?.();return t?.songId===id&&t?.variantId===version&&m&&!m.paused&&m.currentTime>.1&&new URL(m.src).pathname===audio},{id:song.id,version:target.id,audio:target.audio},{timeout:20000});
 const ownerCount=()=>page.evaluate(()=>[document,...[...document.querySelectorAll('iframe')].map(f=>f.contentDocument)].filter(Boolean).flatMap(d=>[...d.querySelectorAll('audio,video')]).filter(m=>!m.paused&&!m.ended&&!m.muted).length);
 const assertIdentity=async(target=variant)=>{
  const state=await page.evaluate(()=>{const p=window.CMDUniversalPlayer,m=p.getMedia(),t=p.getTrack();return {src:m.src,duration:m.duration,title:document.querySelector('.cmd-universal-title')?.textContent,cover:document.querySelector('.cmd-universal-art img')?.src,mediaTitle:m.ownerDocument.defaultView.navigator.mediaSession?.metadata?.title,trackTitle:t.title,version:t.variantId}});
  assert.equal(state.src,new URL(target.audio,base).href);assert.equal(state.cover,new URL(target.cover||song.cover,base).href);
  assert.equal(state.title,state.trackTitle);assert.equal(state.mediaTitle,state.trackTitle);assert.equal(state.version,target.id);assert(Math.abs(state.duration-target.duration)<.1);
 };
 const assertShare=async(target=variant)=>{
  await page.evaluate(()=>window.CMDShortLinks.ready);await page.locator('.cmd-universal-share').click();
  const row=links.rows.find(r=>r.songId===song.id&&r.version===target.id);
  const expected=`https://${links.domains[row.genre]}/${row.number}${row.slot===1?'':`/${row.slot}`}`;
  if(target.id===variant.id)assert.equal(expected,config.short);
  assert.equal(await page.locator('.cmd-share-link').inputValue(),expected);assert.equal(await page.evaluate(()=>window.__copies.at(-1)),expected);
  await page.getByRole('button',{name:'Done',exact:true}).click();
 };
 try{
  await page.goto(base+song.experience,{waitUntil:'networkidle'});
  assert.equal(await page.locator('#releaseAudio').getAttribute('src'),null);
  for(const width of [320,390,1440]){
   await page.setViewportSize({width,height:width===1440?1000:844});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:`${out}/${width}.png`,fullPage:true});
  }
  check('Silent load and layouts at 320, 390 and 1440px');
  await page.setViewportSize({width:320,height:844});await page.locator('#releaseLyricsLabel').click();
  assert.equal(await page.locator('#releaseLyrics').textContent(),lyrics.text);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert((await page.locator(config.note).innerText()).includes(config.copy));
  if(releaseId==='times-are-coming'){
   assert((await page.locator('#production-note').innerText()).includes('I mixed this song, then mastered it in generative.download'));
   assert((await page.locator('#production-note').innerText()).includes('the DAW I built'));
   assert.equal(new URL(await page.locator('#production-note .times-daw-link').getAttribute('href')).hostname,'generative.download');
   check('The production note credits mixing then mastering and links to generative.download');
  }
  await page.screenshot({path:out+'/lyrics-320.png',fullPage:true});
  check('Exact released lyrics wrap on small phones and the song story is present');
  await page.locator('#releaseLyricsLabel').click();await page.setViewportSize({width:390,height:844});
  await page.locator('#releasePlay').tap();await playing();
  await assertIdentity();
  check('First artwork tap plays the uploaded MP3 with matching dock and phone metadata');
  await assertShare();check('Facebook copy fallback uses the requested domain and exact recording');
  if(song.variants.length>1){
   for(const target of [...song.variants.slice(1),variant]){
    const currentFrame=await frame();await currentFrame.locator(`[data-cut="${target.id}"]`).tap();await playing(target);
    await assertIdentity(target);await assertShare(target);assert.equal(await ownerCount(),1);
    const visible=await frame();assert.equal(await visible.locator('#releaseLyrics').textContent(),lyrics.text);
   }
   check('Version buttons switch actual audio, preserve lyrics and share the correct permanent slot with one player');
  }
  await page.locator('.cmd-universal-toggle').click();await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia().paused);
  await page.locator('.cmd-universal-toggle').click();await playing();check('The dock pauses and resumes the recording');
  await page.evaluate(()=>{window.__owner=window.CMDUniversalPlayer.getMedia();window.__time=window.__owner.currentTime;window.CMDPersistentSite.open('/updates/')});
  await page.waitForTimeout(900);assert(await page.evaluate(()=>window.__owner===window.CMDUniversalPlayer.getMedia()&&!window.__owner.paused&&window.__owner.currentTime>=window.__time));
  await page.evaluate(path=>window.CMDPersistentSite.open(path),`${song.experience}?version=${variant.id}`);await page.waitForTimeout(900);
  let f=await frame();assert.equal(await f.locator('#releaseAudio').getAttribute('src'),null);assert.equal(await ownerCount(),1);
  check('Browsing and returning preserve the audio owner, position and single player');
  await page.evaluate(()=>{window.CMDUniversalPlayer.control('next');window.CMDUniversalPlayer.control('seek',0);window.CMDUniversalPlayer.control('previous')});await playing();
  await page.evaluate(()=>{window.CMDUniversalPlayer.control('next');window.CMDUniversalPlayer.control('seek',0);window.CMDUniversalPlayer.control('previous');window.CMDUniversalPlayer.control('next');window.CMDUniversalPlayer.control('seek',0);window.CMDUniversalPlayer.control('previous')});await playing();
  assert.equal(await ownerCount(),1);check('Next, previous and rapid skips return to the correct recording');
  for(const target of song.variants.slice(1)){
   await page.evaluate(()=>{const m=window.CMDUniversalPlayer.getMedia();m.currentTime=m.duration-4.1});
   await page.waitForFunction(()=>document.querySelector('.cmd-universal-detail')?.textContent.includes('Up next'),null,{timeout:5000});
   await playing(target);await assertIdentity(target);assert.equal(await ownerCount(),1);
  }
  if(song.variants.length>1)check('Natural ending continues through the other version without losing recording identity');
  await page.evaluate(()=>{const m=window.CMDUniversalPlayer.getMedia();m.currentTime=m.duration-4.1});
  await page.waitForFunction(()=>document.querySelector('.cmd-universal-detail')?.textContent.includes('Up next'),null,{timeout:5000});
  await page.waitForFunction(id=>{const p=window.CMDUniversalPlayer,m=p?.getMedia?.();return p?.getTrack?.().songId!==id&&m&&!m.paused&&m.currentTime>.1},song.id,{timeout:20000});
  assert.equal(await ownerCount(),1);check('Up next appears before the end and the song continues into radio');
  await page.goto(base+'/',{waitUntil:'networkidle'});await page.getByRole('searchbox',{name:'Search songs'}).fill(config.query);
  assert.equal(await page.locator(`[data-home-song="${song.id}"] .home-song-open`).getAttribute('href'),song.experience);
  check('Homepage lyric search opens the new release');
  await page.goto(base+'/updates/',{waitUntil:'networkidle'});assert(await page.locator(`a[href="${update.href}"]`).count()>0);
  // Fix the clock at this publication so later releases do not invalidate this check.
  const newest=await page.evaluate(now=>window.CMDLatestReleases.build({songs:window.CMD_SONGS,entries:window.CMD_BRIEFING.entries,now}).tracks[0],Date.parse(update.published));
  assert.equal(newest.songId,song.id);assert.equal(newest.variantId,variant.id);check('What’s New links the page and queues this recording first at publication');
  assert.deepEqual(errors,[]);check('No browser JavaScript errors');
 }finally{fs.writeFileSync(out+'/report.json',JSON.stringify({checks,errors},null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
