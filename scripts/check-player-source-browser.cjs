const assert=require('node:assert/strict');
const {chromium}=require('playwright');

(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const base=process.env.BASE_URL||'http://127.0.0.1:8765';
  await page.addInitScript(()=>Object.defineProperty(navigator,'share',{value:data=>{window.top.__sourceShares??=[];window.top.__sourceShares.push(data);return Promise.resolve()}}));
  // Make only the Satan's Loan radio tail deterministic. The real media files,
  // controllers, page scripts, decoder events and persistent frames remain intact.
  await page.route('**/playlist-radio.js*',async route=>{
   const response=await route.fetch();
   const fixture=`;(()=>{const api=window.CMDPlaylistRadio,create=api.create;api.create=(options={})=>{const radio=create(options);if(!options.excludeIds?.includes('satans-loan'))return radio;let index=0;const tracks=['superstore-effect','twas-the-tism-mlord'].map(id=>window.CMD_SONGS.find(song=>song.id===id)).filter(Boolean).map(song=>({...song,songId:song.id,variantId:song.variants?.[0]?.id||'main',variantLabel:song.variants?.[0]?.label||'',variantCount:song.variants?.length||1}));return {...radio,next:()=>tracks[index++]||radio.next()};};})();`;
   await route.fulfill({response,body:(await response.text())+fixture});
  });
  const state=()=>page.evaluate(()=>{const player=window.CMDUniversalPlayer,media=player?.getMedia();return {track:player?.getTrack(),source:media?.currentSrc,time:media?.currentTime,duration:media?.duration,paused:media?.paused,title:document.querySelector('.cmd-universal-title')?.textContent,mediaTitle:navigator.mediaSession?.metadata?.title,artwork:document.querySelector('.cmd-universal-art img')?.src};});
  const playing=async id=>{
   await page.waitForFunction(id=>{const p=window.CMDUniversalPlayer,m=p?.getMedia();return p?.getTrack()?.songId===id&&m?.currentSrc.endsWith('/'+id+'/audio.mp3')&&!m.paused&&m.currentTime>.1;},id);
   const actual=await state();assert.equal(actual.title,actual.track.title);assert.equal(actual.mediaTitle,actual.track.title);assert.equal(actual.artwork,new URL(actual.track.cover,base).href);
   assert.ok(actual.source.endsWith('/'+id+'/audio.mp3'));return actual;
  };
  const open=async path=>{
   await page.evaluate(path=>window.CMDPersistentSite.open(path),path);
   await page.waitForFunction(path=>[...document.querySelectorAll('iframe')].some(f=>f.contentDocument?.readyState==='complete'&&new URL(f.contentWindow.location.href).pathname===path),path);
   return page.frames().find(f=>f.parentFrame()&&new URL(f.url()).pathname===path);
  };
  await page.goto(base+'/superstore-effect/',{waitUntil:'load'});
  await page.locator('.ss-cover-button').tap();await playing('superstore-effect');
  const satan=await open('/satans-loan/');
  await satan.waitForFunction(()=>window.CMDUniversalPlayer&&document.getElementById('ssAudio').__cmdContinuousPlaybackController);
  await satan.evaluate(()=>{window.__sourceObservations=[];window.CMDContinuousPlayback.subscribe(event=>{if(event.type==='track')window.__sourceObservations.push({title:event.track.title,announced:event.track.audio,source:event.audio.getAttribute('src')});});});
  await satan.locator('.ss-cover-button').tap();
  const first=await playing('satans-loan');assert.ok(first.duration>130&&first.duration<140);
  await page.getByRole('button',{name:'Share current song',exact:true}).tap();
  assert.ok((await page.evaluate(()=>window.__sourceShares.at(-1).text)).includes("Satan's Loan"));
  await page.evaluate(()=>{window.__sourceOwner=window.CMDUniversalPlayer.getMedia();window.__sourceOwner.currentTime=window.__sourceOwner.duration-.2;});
  const next=await playing('superstore-effect');assert.ok(next.duration>210&&next.duration<220);
  await page.waitForURL(url=>url.pathname==='/superstore-effect/');
  assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia()===window.__sourceOwner),true);
  await page.getByRole('button',{name:'Share current song',exact:true}).tap();
  assert.ok((await page.evaluate(()=>window.__sourceShares.at(-1).text)).includes('the superstore effect'));

  // The close/return pill must follow the current song, not the old Satan's Loan
  // page that still owns the continuous audio after advancing to Superstore.
  await open('/');
  await page.getByRole('button',{name:'Return to playing song',exact:true}).tap();
  await page.waitForURL(url=>url.pathname==='/superstore-effect/');
  await playing('superstore-effect');
  assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia()===window.__sourceOwner),true);
  await page.getByRole('button',{name:'Next song',exact:true}).tap();await playing('twas-the-tism-mlord');
  await page.waitForURL(url=>url.pathname==='/twas-the-tism-mlord/');
  await page.evaluate(()=>window.CMDUniversalPlayer.control('seek',0));
  await page.getByRole('button',{name:'Previous song',exact:true}).tap();await playing('superstore-effect');
  await page.waitForURL(url=>url.pathname==='/superstore-effect/');
  const observations=await satan.evaluate(()=>window.__sourceObservations);
  assert.ok(observations.length>=4);observations.forEach(event=>assert.equal(event.announced,event.source,'Published track and audio source agree at every transition'));
  const audible=await page.evaluate(()=>[document,...[...document.querySelectorAll('iframe')].map(f=>f.contentDocument)].filter(Boolean).flatMap(d=>[...d.querySelectorAll('audio,video')]).filter(m=>!m.paused&&!m.ended&&!m.muted).length);
  assert.equal(audible,1);assert.equal(await page.locator('.cmd-universal-player:visible').count(),1);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({satanToSuperstore:true,realSourceMatchesTitle:true,artworkAndMediaSession:true,correctShares:true,atomicTrackEvents:true,returnOpensPlayingSong:true,nextPrevious:true,oneAudioOwner:true,errors}));
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
