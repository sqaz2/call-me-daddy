// Uses the existing Site checks Chromium installation and local media server.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SITE_BASE||process.env.BASE_URL||'http://127.0.0.1:8765';
const out=process.env.QA_OUTPUT||'/tmp/replay-qa/my-music';
fs.mkdirSync(out,{recursive:true});

(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),checks=[],errors=[];
 page.setDefaultTimeout(20000);
 page.on('pageerror',error=>errors.push(error.message));
 // Capture the browser share payload without opening a native share dialog.
 await page.addInitScript(()=>{window.__momentShares=[];Object.defineProperty(navigator,'share',{configurable:true,value:data=>{window.__momentShares.push(data);return Promise.resolve()}})});
 const pass=name=>{checks.push(name);console.log('PASS',name)};
 const state=()=>page.evaluate(()=>{const player=window.CMDUniversalPlayer,media=player?.getMedia?.();return {track:player?.getTrack?.(),src:media?.currentSrc,time:media?.currentTime,paused:media?.paused,duration:media?.duration}});
 const playing=async(variant,minTime=.15)=>{
  await page.waitForFunction(({variant,minTime})=>{const player=window.CMDUniversalPlayer,media=player?.getMedia?.(),track=player?.getTrack?.();return track?.songId==='the-games-she-hates'&&track.variantId===variant&&media?.currentSrc.endsWith('/'+variant+'.mp3')&&!media.paused&&media.currentTime>=minTime&&media.readyState>=2},{variant,minTime});
  return state();
 };
 const silent=async()=>assert.equal(await page.evaluate(()=>[...document.querySelectorAll('audio')].some(media=>!media.paused)),false,'Visiting a page must not start audio');
 const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'The page must fit the viewport');
 const oneDock=async()=>{
  let count=0;for(const frame of page.frames())for(const dock of await frame.locator('.cmd-universal-player').all())if(await dock.isVisible())count++;
  assert.equal(count,1,'Exactly one player dock is visible');
  assert.equal(await page.evaluate(()=>[document,...[...document.querySelectorAll('iframe')].map(frame=>frame.contentDocument)].filter(Boolean).flatMap(doc=>[...doc.querySelectorAll('audio')]).filter(media=>!media.paused&&!media.ended).length),1,'Exactly one audio element is playing');
 };
 const rows=selector=>page.locator(selector+' [data-recording]');
 const record=(selector,variant)=>page.locator(selector+' [data-recording="the-games-she-hates::'+variant+'"]');
 try{
  await page.goto(base+'/my-music/',{waitUntil:'load'});
  await rows('#searchResults').first().waitFor();
  await silent();assert.equal(await page.locator('#libraryAudio').getAttribute('src'),null);
  for(const width of [320,390]){await page.setViewportSize({width,height:844});await noOverflow()}
  pass('My Music loads silently and fits 320px and 390px');

  await page.getByLabel('New playlist',{exact:true}).fill('Night drives');
  await page.getByRole('button',{name:'Create playlist',exact:true}).click();
  await page.getByRole('button',{name:'Open playlist Night drives',exact:true}).waitFor();
  await page.getByLabel('Search songs and versions',{exact:true}).fill('The Games She Hates');
  await record('#searchResults','be-yourself').getByRole('button',{name:/^Save /}).click();
  for(const variant of ['be-yourself','be-yourself-2'])await record('#searchResults',variant).getByRole('button',{name:/^Add .* to Night drives$/}).click();
  assert.deepEqual(await rows('#savedList').evaluateAll(items=>items.map(item=>item.dataset.recording)),['the-games-she-hates::be-yourself']);
  assert.equal(await rows('#playlistTracks').count(),2);
  await record('#playlistTracks','be-yourself-2').getByRole('button',{name:/^Move .* up$/}).click();
  assert.deepEqual(await rows('#playlistTracks').evaluateAll(items=>items.map(item=>item.dataset.recording)),['the-games-she-hates::be-yourself-2','the-games-she-hates::be-yourself']);
  pass('Save an exact version, add two versions and reorder the playlist');

  await page.locator('#playPlaylist').click();
  await playing('be-yourself-2');
  assert.equal(new URL(page.url()).pathname,'/my-music/','The playlist stays in view while it plays');
  await page.locator('.cmd-universal-next').click();
  await playing('be-yourself');
  assert.equal(await page.locator('.cmd-universal-like').getAttribute('aria-pressed'),'true');
  await oneDock();
  await page.setViewportSize({width:320,height:844});await noOverflow();
  await page.screenshot({path:out+'/playlist-320.png'});
  await page.setViewportSize({width:390,height:844});
  pass('Play the reordered MP3 queue, then Next selects its exact saved version');

  await page.evaluate(()=>{window.__libraryOwner=window.CMDUniversalPlayer.getMedia()});
  await page.getByRole('link',{name:'Find music',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('iframe')].some(frame=>frame.contentDocument?.getElementById('homeSongSearch')));
  assert.equal(await page.evaluate(()=>window.__libraryOwner===window.CMDUniversalPlayer.getMedia()&&!window.__libraryOwner.paused),true);
  await oneDock();
  pass('Browsing Home preserves the same audio element and one dock');

  // Exercise the accessible seek control, then pause to save a stable position.
  const progress=page.getByRole('slider',{name:'Seek through song',exact:true});
  await progress.focus();await progress.press('Home');
  for(let n=0;n<6;n++)await progress.press('ArrowRight');
  await page.locator('.cmd-universal-toggle').click();
  await page.waitForFunction(()=>{const resume=window.CMDMyMusic?.getResume();return window.CMDUniversalPlayer.getMedia().paused&&resume?.position>=30&&resume.position<35});
  const savedPosition=await page.evaluate(()=>window.CMDMyMusic.getResume().position);
  await page.goto(base+'/my-music/',{waitUntil:'load'});
  await page.locator('#resumeQueue').waitFor();await silent();
  assert.deepEqual(await rows('#savedList').evaluateAll(items=>items.map(item=>item.dataset.recording)),['the-games-she-hates::be-yourself']);
  assert.deepEqual(await rows('#playlistTracks').evaluateAll(items=>items.map(item=>item.dataset.recording)),['the-games-she-hates::be-yourself-2','the-games-she-hates::be-yourself']);
  await page.reload({waitUntil:'load'});
  await page.locator('#resumeQueue').waitFor();await silent();
  await page.locator('#resumeQueue').click();
  const resumed=await playing('be-yourself',savedPosition-.25);
  assert.ok(resumed.time<savedPosition+4,'Resume must restore the saved position');
  await page.getByRole('slider',{name:'Seek through song',exact:true}).press('Home');
  await page.locator('.cmd-universal-prev').click();
  await playing('be-yourself-2');await oneDock();
  pass('Saved versions and playlist order survive a new load; Resume restores position and queue');

  await page.goto(base+'/music/?song=the-games-she-hates&version=be-yourself&t=32&share=1',{waitUntil:'load'});
  await page.waitForFunction(()=>document.getElementById('listenPlay')?.textContent.includes('Play from 0:32'));await silent();
  await page.locator('#listenPlay').click();
  const moment=await playing('be-yourself',32);
  assert.ok(moment.time<36,'Shared recording should begin at 32 seconds');
  await page.locator('.cmd-universal-toggle').click();
  await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia().paused);
  const momentSecond=Math.floor((await state()).time);
  await page.getByText('Up next & listening options',{exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('.cmd-share-moment')?.disabled);
  await page.locator('.cmd-share-moment').click();
  await page.waitForFunction(()=>window.__momentShares.length>0);
  const shared=new URL(await page.evaluate(()=>window.__momentShares.at(-1).url));
  assert.equal(shared.origin,'https://callmedaddy.musicsubject.com');
  assert.equal(shared.pathname,'/music/');assert.equal(shared.searchParams.get('song'),'the-games-she-hates');
  assert.equal(shared.searchParams.get('version'),'be-yourself');assert.equal(shared.searchParams.get('t'),String(momentSecond));
  assert.equal(shared.searchParams.get('share'),'1');
  await noOverflow();await page.screenshot({path:out+'/shared-moment-390.png'});
  pass('Moment links wait for Play, decode the correct recording at 32 seconds, and share the exact timestamp');
  assert.deepEqual(errors,[]);pass('No browser JavaScript errors');
 }finally{
  fs.writeFileSync(out+'/report.json',JSON.stringify({checks,errors},null,2));
  await browser.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1});
