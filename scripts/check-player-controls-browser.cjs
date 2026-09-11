const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');

(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const base=process.env.BASE_URL||'http://127.0.0.1:8765';
  const selected='/music/?song=survival-mode&version=celtic-north-remix';
  await page.goto(base+selected,{waitUntil:'load'});
  assert.equal(await page.evaluate(()=>[...document.querySelectorAll('audio')].some(a=>!a.paused)),false);
  await page.locator('#listenPlay').click();
  await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia()?.currentTime>0.1);
  const dock=page.getByRole('region',{name:'Site-wide music player',exact:true});
  await dock.getByRole('button',{name:'Like Survival Mode',exact:true}).click();
  assert.equal(await dock.locator('.cmd-universal-like').getAttribute('aria-pressed'),'true');
  const source=await page.evaluate(()=>window.CMDUniversalPlayer.getMedia().src);
  await page.getByRole('link',{name:'Search songs',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('iframe')].some(f=>f.contentDocument?.getElementById('liked-songs')));
  const home=page.frames().find(f=>f.parentFrame()&&new URL(f.url()).pathname==='/');
  assert.ok(home,'Home opens while the original audio keeps playing');
  const liked=home.locator('#liked-songs .home-song-open');
  assert.equal(await liked.count(),1);
  assert.equal(await liked.getAttribute('href'),selected);
  assert.ok((await liked.textContent()).includes('Earlier Celtic North Remix'));
  await dock.getByRole('button',{name:'Unlike Survival Mode',exact:true}).click();
  await home.locator('#liked-songs').waitFor({state:'detached'});
  await dock.getByRole('button',{name:'Like Survival Mode',exact:true}).click();
  await home.locator('#liked-songs').waitFor();
  assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia().src),source);

  // A visit to Home must not become the selected recording's own destination.
  await dock.locator('.cmd-universal-title').click();
  await page.waitForURL(url=>url.pathname+url.search===selected);
  assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia().src),source);
  assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia().paused),false);
  await page.waitForFunction(()=>document.querySelector('.cmd-universal-player').classList.contains('cmd-swipe-target'));
  const touch=await context.newCDPSession(page);
  const gesture=async(locator,dx,dy=0)=>{
   const rect=await locator.boundingBox();assert.ok(rect);
   const x=dx<0?rect.x+rect.width-16:rect.x+16,y=rect.y+rect.height/2;
   await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=6;i++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/6,y:y+dy*i/6}]});
   await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  };
  const title=dock.locator('.cmd-universal-title');
  await gesture(title,-135);
  await page.waitForFunction(first=>window.CMDUniversalPlayer.getMedia()?.src!==first&&window.CMDUniversalPlayer.getMedia()?.currentTime>0.1,source);
  const next=await page.evaluate(()=>window.CMDUniversalPlayer.getMedia().src);
  await page.waitForFunction(()=>new URL(location.href).pathname!=='/music/');
  assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia().paused),false,'A swipe must not also click Pause');
  await page.evaluate(()=>{window.CMDUniversalPlayer.getMedia().currentTime=10});
  await gesture(title,135);
  await page.waitForFunction(first=>window.CMDUniversalPlayer.getMedia()?.src===first&&!window.CMDUniversalPlayer.getMedia().paused,source);
  await page.waitForURL(url=>url.pathname+url.search===selected);
  assert.notEqual(source,next);
  await gesture(title,-10,-75);
  assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia().src),source,'Vertical scrolling must not change songs');
  const progress=dock.getByRole('slider',{name:'Seek through song'});
  await gesture(progress,110);
  assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia().src),source,'Seeking must not skip');
  assert.ok(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia().currentTime>5));
  assert.ok(await dock.locator('.cmd-universal-times').isVisible());
  assert.equal(await page.locator('.cmd-universal-player:visible').count(),1);
  assert.equal(await page.evaluate(()=>[document,...[...document.querySelectorAll('iframe')].map(f=>f.contentDocument)].filter(Boolean).flatMap(d=>[...d.querySelectorAll('audio')]).filter(a=>!a.paused&&!a.ended).length),1);

  // Exact likes persist on another load, and footer links clear the expanded dock.
  await page.goto(base+'/',{waitUntil:'load'});
  await page.locator('#liked-songs .home-song-open').waitFor();
  assert.equal(await page.locator('#liked-songs .home-song-open').getAttribute('href'),selected);
  await page.goto(base+selected,{waitUntil:'load'});
  await page.locator('#listenPlay').click();
  await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia()?.currentTime>0.1);
  await page.getByRole('link',{name:'Search songs',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('iframe')].some(f=>f.contentDocument?.getElementById('liked-songs')));
  await dock.getByText('Up next & listening options',{exact:true}).click();
  await page.setViewportSize({width:320,height:720});
  const browsed=page.frames().find(f=>f.parentFrame()&&new URL(f.url()).pathname==='/');
  await browsed.waitForFunction(()=>parseFloat(getComputedStyle(document.body).paddingBottom)>250);
  await browsed.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  const panel=await dock.boundingBox(),footer=await browsed.locator('footer a').last().boundingBox();
  assert.ok(panel.y>=0&&panel.y+panel.height<=720,'Expanded dock stays inside a narrow viewport');
  assert.ok(footer.y+footer.height<=panel.y,'Footer links remain above the expanded player');
  assert.equal(await browsed.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  fs.mkdirSync('/tmp/replay-qa',{recursive:true});
  await page.screenshot({path:'/tmp/replay-qa/player-swipe-likes-mobile.png'});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({exactVersionLike:true,homeLikesUpdate:true,likesPersist:true,returnToSong:true,swipeNextPrevious:true,verticalAndSeekSafe:true,oneAudioOwner:true,narrowPlayerAndFooterFit:true,errors}));
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
