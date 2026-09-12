const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const data=require('../data/song-links.json');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const active of [true,false]){
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await context.route(url=>Object.values(data.domains).includes(url.hostname),route=>active?route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:JSON.stringify({service:'musicsubject-song-links',revision:data.revision})}):route.abort());
   await page.addInitScript(()=>{window.shared=[];Object.defineProperty(navigator,'share',{value:payload=>{window.shared.push({...payload,activeGesture:navigator.userActivation.isActive});return Promise.resolve()}})});
   await page.addInitScript(()=>{window.copied=[];window.popups=[];Object.defineProperty(navigator,'clipboard',{value:{writeText:text=>{window.copied.push(text);return Promise.resolve()}}});window.open=url=>{window.popups.push(url);return null}});
   await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:8765'}/cheap-to-inform/`,{waitUntil:'load'});
   await page.evaluate(()=>window.CMDShortLinks.ready);
   await page.locator('[data-share] [data-action="more"]').click();
   let shared=await page.evaluate(()=>window.shared.at(-1));
   assert.ok(shared.text.endsWith(active?'https://hiphop.bid/9':data.origin+'/cheap-to-inform/'));assert.equal(shared.url,undefined);assert.equal((shared.text.match(/https?:\/\//g)||[]).length,1);
   assert.equal(shared.activeGesture,true);
   await page.locator('.scene-cover').click();
   await page.waitForFunction(()=>window.CMDUniversalPlayer?.getMedia()?.currentTime>0.1);
   await page.locator('.cmd-universal-share').click();
   shared=await page.evaluate(()=>window.shared.at(-1));
   assert.ok(shared.text.endsWith(active?'hiphop.bid/9':'/cheap-to-inform/'));assert.equal(shared.url,undefined);assert.equal(shared.activeGesture,true);
   assert.deepEqual(errors,[]);
   console.log(JSON.stringify({active,share:shared.text,gesture:shared.activeGesture,playback:true,errors}));
   await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:8765'}/funhouse-meltdown/`,{waitUntil:'load'});
   await page.evaluate(()=>window.CMDShortLinks.ready);
   await page.locator('[data-share] [data-action="more"]').click();
   shared=await page.evaluate(()=>window.shared.at(-1));
   const joke=data.rows.find(row=>row.songId==='funhouse-meltdown'&&row.slot===1);
   assert.ok(shared.text.endsWith(active?`https://jokes.win/${joke.number}`:data.origin+'/funhouse-meltdown/'));assert.equal(shared.url,undefined);
   assert.equal(shared.activeGesture,true);assert.deepEqual(errors,[]);
   console.log(JSON.stringify({active,jokeShare:shared.text,gesture:shared.activeGesture,errors}));
   await page.locator('[data-share] [data-action="copy"]').click();
   const copied=await page.evaluate(()=>window.copied.at(-1));
   assert.ok(copied.endsWith(active?`https://jokes.win/${joke.number}`:data.origin+'/funhouse-meltdown/'));
   assert.equal((copied.match(/https?:\/\//g)||[]).length,1);
   await page.locator('[data-share] [data-network="x"]').click();
   const posted=new URL(await page.evaluate(()=>window.popups.at(-1)));
   assert.ok(posted.searchParams.get('text').endsWith(active?`https://jokes.win/${joke.number}`:data.origin+'/funhouse-meltdown/'));
   assert.equal(posted.searchParams.has('url'),false);
   for(const version of ['dnb-folk-tale','monster-and-maiden']){
    const row=data.rows.find(row=>row.songId==='where-monsters-are'&&row.version===version);
    await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:8765'}${row.target}`,{waitUntil:'load'});
    await page.evaluate(()=>window.CMDShortLinks.ready);
    await page.locator('#listenPlay').click();
    await page.waitForFunction(audio=>{const media=window.CMDUniversalPlayer?.getMedia();return media?.currentSrc.endsWith(audio)&&!media.paused&&media.currentTime>.1;},row.audio);
    await page.locator('.cmd-universal-share').click();
    shared=await page.evaluate(()=>window.shared.at(-1));
    const expected=active?`https://${data.domains[row.genre]}/${row.number}${row.slot===1?'':`/${row.slot}`}`:data.origin+row.target;
    assert.ok(shared.text.endsWith(expected),shared.text);assert.equal(shared.url,undefined);
    assert.equal((shared.text.match(/https?:\/\//g)||[]).length,1);assert.equal(shared.activeGesture,true);
    assert.ok(shared.text.includes(row.label));assert.deepEqual(errors,[]);
    console.log(JSON.stringify({active,dnbRecording:version,share:shared.text,gesture:shared.activeGesture,playback:true,errors}));
   }
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
