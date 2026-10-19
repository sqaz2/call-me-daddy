const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{window.__winhampShares=[];Object.defineProperty(navigator,'share',{value:data=>{window.__winhampShares.push(data);return Promise.resolve();}});});
  const base=process.env.BASE_URL||'http://127.0.0.1:8765';
  await page.goto(base+'/winhamp/?song=this-is-my-story&version=gospel',{waitUntil:'load'});
  assert.equal(await page.locator('#versions').isChecked(),true);
  assert.equal(await page.evaluate(()=>Boolean(window.CMDUniversalPlayer.getMedia())),false);
  for(const width of [320,390,1440]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`WinHamp fits ${width}px`);
   assert.ok((await page.locator('#trackList').boundingBox()).height>100);
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#artwork').click();
  await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia()?.currentTime>.3);
  assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getTrack().variantId),'gospel');
  assert.equal(new URL(page.url()).pathname,'/winhamp/');
  assert.equal(await page.locator('.cmd-universal-player:visible').count(),0,'The full-page player has no duplicate dock');
  await page.evaluate(()=>{window.__winhampMedia=window.CMDUniversalPlayer.getMedia();window.__winhampPosition=window.__winhampMedia.currentTime;});
  await page.locator('#shuffle').click();await page.locator('#repeat').click();
  assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia()===window.__winhampMedia&&window.__winhampMedia.currentTime>=window.__winhampPosition),true);
  await page.locator('#shareSong').click();
  const share=new URL(await page.evaluate(()=>window.__winhampShares.at(-1).url));
  assert.equal(share.pathname,'/winhamp/');assert.equal(share.searchParams.get('version'),'gospel');
  await page.locator('#next').click();
  await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia()?.currentTime>.2);
  assert.equal(new URL(page.url()).pathname,'/winhamp/','Next does not open the song story');
  assert.equal(await page.evaluate(()=>document.querySelectorAll('audio').length),1);
  await page.locator('#search').fill('Live It Right');
  await page.locator('.track-row').first().click();
  await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia()?.currentTime>.2);
  assert.equal(await page.locator('#trackTitle').textContent(),'Live It Right');
  await page.waitForFunction(()=>{const audio=window.CMDUniversalPlayer.getMedia(),graph=audio?.__cmdWinHampGraph;if(!graph)return false;graph.analyser.getByteFrequencyData(graph.data);return graph.data.some(v=>v>0);});
  await page.locator('#stop').click();
  assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia().paused),true);
  assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia().currentTime),0);
  // A local audio fixture tests playlist UI without depending on the game server.
  await page.route('**/media/starmuff/*.mp3',route=>route.fulfill({status:200,contentType:'audio/mpeg',body:fs.readFileSync('media/songs/2026/10/live-it-right/audio.mp3')}));
  await page.locator('#playlistStarMuff').click();
  assert.equal(await page.locator('#trackList .track-row').count(),50);
  await page.locator('#trackList .track-row').first().click();
  await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia()?.currentTime>.2);
  assert.ok((await page.evaluate(()=>window.CMDUniversalPlayer.getTrack().songId)).startsWith('starmuff-'));
  await page.locator('#sharePlayer').click();
  const playlistShare=new URL(await page.evaluate(()=>window.__winhampShares.at(-1).url));
  assert.equal(playlistShare.searchParams.get('playlist'),'starmuff');assert.equal(playlistShare.searchParams.has('song'),false);
  await page.locator('#shareSong').click();
  const starShare=new URL(await page.evaluate(()=>window.__winhampShares.at(-1).url));
  assert.equal(starShare.searchParams.get('playlist'),'starmuff');assert.ok(starShare.searchParams.get('song').startsWith('starmuff-'));
  await page.locator('#playlistCallMeDaddy').click();
  assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia().paused),false,'Browsing the other playlist preserves current audio');
  assert.ok(await page.locator('#trackList .track-row').count()>60);
  assert.deepEqual(errors,[]);
  await context.close();console.log('WinHamp mobile layout, real audio/spectrum, exact sharing and shared playback passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
