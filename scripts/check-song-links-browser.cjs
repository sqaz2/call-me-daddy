const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const data=require('../data/song-links.json');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const active of [true,false]){
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await context.route(/https:\/\/(hiphop\.bid|dubstep\.bid|suno\.fyi)\//,route=>active?route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:JSON.stringify({service:'musicsubject-song-links',revision:data.revision})}):route.abort());
   await page.addInitScript(()=>{window.shared=[];Object.defineProperty(navigator,'share',{value:payload=>{window.shared.push({...payload,activeGesture:navigator.userActivation.isActive});return Promise.resolve()}})});
   await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:8765'}/cheap-to-inform/`,{waitUntil:'load'});
   await page.evaluate(()=>window.CMDShortLinks.ready);
   await page.locator('[data-share] [data-action="more"]').click();
   let shared=await page.evaluate(()=>window.shared.at(-1));
   assert.equal(shared.url,active?'https://hiphop.bid/9':data.origin+'/cheap-to-inform/');
   assert.equal(shared.activeGesture,true);
   await page.locator('.scene-cover').click();
   await page.waitForFunction(()=>window.CMDUniversalPlayer?.getMedia()?.currentTime>0.1);
   await page.locator('.cmd-universal-share').click();
   shared=await page.evaluate(()=>window.shared.at(-1));
   assert.ok(shared.url.endsWith(active?'hiphop.bid/9':'/cheap-to-inform/'));assert.equal(shared.activeGesture,true);
   assert.deepEqual(errors,[]);
   console.log(JSON.stringify({active,share:shared.url,gesture:shared.activeGesture,playback:true,errors}));
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
