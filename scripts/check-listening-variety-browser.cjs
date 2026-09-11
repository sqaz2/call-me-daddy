const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${process.env.BASE_URL||'http://127.0.0.1:8765'}/cheap-to-inform/`,{waitUntil:'load'});
  assert.deepEqual(await page.evaluate(()=>window.CMDCatalogCycle.readHistory()),[]);
  await page.locator('.scene-cover').click();
  await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia()?.currentTime>0.1&&window.CMDCatalogCycle.readHistory()[0]==='cheap-to-inform');
  await page.getByText('Up next & listening options',{exact:true}).click();
  assert.ok((await page.locator('.cmd-listening-next').innerText()).startsWith('Up next: '));
  assert.ok((await page.locator('.cmd-universal-next').boundingBox()).height>=44);
  await page.getByRole('button',{name:'Take a break from this song',exact:true}).click();
  await page.waitForFunction(()=>window.CMDUniversalPlayer.getTrack()?.songId!=='cheap-to-inform'&&window.CMDUniversalPlayer.getMedia()?.currentTime>0.1);
  assert.equal(await page.evaluate(()=>window.CMDCatalogCycle.isOnBreak('cheap-to-inform')),true);
  assert.ok(await page.getByRole('button',{name:'Undo song break',exact:true}).isVisible());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const panel=await page.locator('.cmd-universal-player').boundingBox();
  assert.ok(panel.y>=0&&panel.y+panel.height<=844,'Expanded player remains inside the mobile viewport');
  fs.mkdirSync('/tmp/replay-qa',{recursive:true});
  await page.screenshot({path:'/tmp/replay-qa/listening-options-mobile.png'});
  await page.getByRole('button',{name:'Undo song break',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.CMDCatalogCycle.isOnBreak('cheap-to-inform')),false);
  const played=await page.evaluate(()=>window.CMDCatalogCycle.readHistory());
  assert.ok(played.includes('cheap-to-inform'));assert.ok(played.length>=2);
  // A full navigation in the same browser retains history; it does not start audio.
  await page.goto(`${process.env.BASE_URL||'http://127.0.0.1:8765'}/`,{waitUntil:'load'});
  assert.ok((await page.evaluate(()=>window.CMDCatalogCycle.readHistory())).includes('cheap-to-inform'));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({historyRecorded:true,historySurvivesNavigation:true,breakSkipsImmediately:true,undo:true,upcomingVisible:true,mobileFit:true,errors}));
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
