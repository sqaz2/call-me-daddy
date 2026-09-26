// Uses the existing Site checks Chromium installation and local media server.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SITE_BASE||process.env.BASE_URL||'http://127.0.0.1:8765';
const out=process.env.QA_OUTPUT||'/tmp/replay-qa/quiet-tip';
fs.mkdirSync(out,{recursive:true});

(async()=>{
 const browser=await chromium.launch({headless:true}),checks=[],errors=[];
 const mobile={viewport:{width:390,height:844},isMobile:true,hasTouch:true};
 const pass=name=>{checks.push(name);console.log('PASS',name)};
 const watch=page=>{page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message))};
 const noOverflow=async page=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'The page must fit the viewport');
 const onePlayer=async page=>{
  let docks=0;
  for(const frame of page.frames())for(const dock of await frame.locator('.cmd-universal-player').all())if(await dock.isVisible())docks++;
  assert.equal(docks,1,'Exactly one player dock is visible');
  assert.equal(await page.evaluate(()=>[document,...[...document.querySelectorAll('iframe')].map(frame=>frame.contentDocument)].filter(Boolean).flatMap(doc=>[...doc.querySelectorAll('audio')]).filter(media=>!media.paused&&!media.ended).length),1,'Exactly one audio element is playing');
 };
 try{
  const fresh=await browser.newContext(mobile),newPage=await fresh.newPage();watch(newPage);
  for(const route of ['/my-music/','/']){
   await newPage.goto(base+route,{waitUntil:'load'});
   await newPage.waitForFunction(()=>Boolean(window.CMDQuietTipUI&&window.CMDQuietTip));
   const tip=newPage.locator('[data-quiet-tip]');
   assert.equal(await tip.count(),1);
   assert.equal(await tip.isVisible(),false,'A new listener never sees a tip prompt');
   assert.equal(await tip.getAttribute('open'),null,'A new visitor never gets an expanded request');
   assert.equal(await newPage.evaluate(()=>[...document.querySelectorAll('audio')].some(media=>!media.paused)),false);
  }
  pass('Home and My Music hide the tip for a new listener and never start audio');
  await fresh.close();

  const context=await browser.newContext(mobile);
  await context.addInitScript(()=>{
   // Engagement accounting is exercised with real clock/source events in the
   // state tests. This fixture represents an already qualified listening session.
   if(!sessionStorage.getItem('cmd-quiet-tip-v1'))sessionStorage.setItem('cmd-quiet-tip-v1',JSON.stringify({version:1,listenedSeconds:900,completedSongs:3,lastActivity:Date.now()}));
   window.__tipCopies=[];
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:text=>{window.__tipCopies.push(text);return Promise.resolve()}}});
  });
  const page=await context.newPage();watch(page);
  await page.goto(base+'/my-music/',{waitUntil:'load'});
  const tip=page.locator('[data-quiet-tip]'),summary=tip.locator('summary'),email=tip.locator('.quiet-tip-email'),copy=tip.locator('.quiet-tip-copy'),status=tip.locator('.quiet-tip-status');
  await tip.waitFor({state:'visible'});
  assert.equal(await summary.getAttribute('aria-label'),'Leave a tip');
  assert.equal((await summary.textContent()).trim(),'$');
  assert.equal(await tip.getAttribute('open'),null,'Eligibility reveals only the collapsed dollar sign');
  assert.equal(await email.isVisible(),false);
  const appearance=await summary.evaluate(element=>{const style=getComputedStyle(element),box=element.getBoundingClientRect();return {width:box.width,height:box.height,fontSize:parseFloat(style.fontSize),background:style.backgroundColor,position:style.position,animation:style.animationName,shadow:style.boxShadow}});
  assert.ok(appearance.width>=44&&appearance.height>=44,'The quiet icon retains a 44px touch target');
  assert.ok(appearance.fontSize<=16,'The dollar sign remains small');
  assert.equal(appearance.background,'rgba(0, 0, 0, 0)');
  assert.notEqual(appearance.position,'fixed');assert.equal(appearance.animation,'none');assert.equal(appearance.shadow,'none');
  for(const width of [320,390]){await page.setViewportSize({width,height:844});await noOverflow(page)}
  pass('A qualified listener sees only a small unanimated footer dollar sign with a 44px touch target');

  await page.getByLabel('Search songs and versions',{exact:true}).fill('The Games She Hates');
  await page.locator('#searchResults [data-recording="the-games-she-hates::be-yourself"] button.art').click();
  await page.waitForFunction(()=>{const player=window.CMDUniversalPlayer,media=player?.getMedia?.();return player?.getTrack?.()?.variantId==='be-yourself'&&media?.currentSrc.endsWith('/be-yourself.mp3')&&!media.paused&&media.currentTime>.15&&media.readyState>=2});
  await page.evaluate(()=>{window.__quietTipOwner=window.CMDUniversalPlayer.getMedia()});
  await summary.click();
  assert.equal(await tip.getAttribute('open'),'');
  assert.equal(await email.inputValue(),'player6@gmail.com');
  await copy.click();
  await page.waitForFunction(()=>document.querySelector('.quiet-tip-status')?.textContent==='Email copied.');
  assert.deepEqual(await page.evaluate(()=>window.__tipCopies),['player6@gmail.com']);
  assert.equal(context.pages().length,1,'Copying the email does not open another page or a banking request');
  assert.equal(await page.evaluate(()=>window.__quietTipOwner===window.CMDUniversalPlayer.getMedia()&&!window.__quietTipOwner.paused),true,'Opening and copying preserve the playing audio owner');
  await onePlayer(page);
  pass('The tip opens only on demand and copies the exact e-transfer email without interrupting real audio');

  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined}));
  await copy.click();
  assert.match(await status.textContent(),/select and copy/i);
  assert.deepEqual(await email.evaluate(input=>({focused:document.activeElement===input,start:input.selectionStart,end:input.selectionEnd})),{focused:true,start:0,end:'player6@gmail.com'.length});
  for(const width of [320,390]){
   await page.setViewportSize({width,height:844});await noOverflow(page);
   const animations=await tip.evaluate(element=>[element,...element.querySelectorAll('*')].map(node=>getComputedStyle(node).animationName));
   assert.ok(animations.every(name=>name==='none'),'The tip has no animations');
  }
  await page.screenshot({path:out+'/quiet-tip-open-390.png'});
  await summary.focus();await summary.press('Enter');
  await page.waitForFunction(()=>!document.querySelector('[data-quiet-tip]').open);
  assert.equal(await email.isVisible(),false);
  assert.equal(await page.evaluate(()=>window.__quietTipOwner===window.CMDUniversalPlayer.getMedia()&&!window.__quietTipOwner.paused),true);
  pass('Missing clipboard support selects the email for manual copy; keyboard close and narrow layouts work');

  await page.getByRole('link',{name:'Find music',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('iframe')].some(frame=>frame.contentDocument?.getElementById('homeSongSearch')&&frame.contentWindow?.CMDQuietTipUI));
  const home=page.frames().find(frame=>frame!==page.mainFrame()&&new URL(frame.url()).pathname==='/');
  assert.ok(home,'Home loads in the persistent player frame');
  const homeTip=home.locator('[data-quiet-tip]');await homeTip.waitFor({state:'visible'});
  assert.equal(await homeTip.getAttribute('open'),null,'Navigation never opens the request');
  assert.equal(await page.evaluate(()=>{const frame=[...document.querySelectorAll('iframe')].find(item=>item.contentDocument?.getElementById('homeSongSearch'));return frame?.contentWindow.CMDQuietTip===window.CMDQuietTip&&window.CMDQuietTip.getState().eligible}),true,'Top and frame share the qualified session');
  assert.equal(await page.evaluate(()=>window.__quietTipOwner===window.CMDUniversalPlayer.getMedia()&&!window.__quietTipOwner.paused),true);
  await onePlayer(page);await noOverflow(page);
  pass('Home navigation retains eligibility in the shared session, keeps the tip collapsed and preserves one playing owner');
  await page.locator('.cmd-universal-toggle').click();
  assert.deepEqual(errors,[]);pass('No browser JavaScript errors');
 }finally{
  fs.writeFileSync(out+'/report.json',JSON.stringify({checks,errors},null,2));
  await browser.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1});
