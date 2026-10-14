// Run with NODE_PATH pointing to an installed Playwright package.
const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const {loadCatalog}=await import('../../scripts/sync-song-links.mjs'); const expected=require('../app/src/main/assets/catalog-model.js').playable(loadCatalog()).length;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let fresh=false,offline=false;
 await page.route('https://appassets.androidplatform.net/**',route=>{const file=path.join(root,'android/app/src/main',new URL(route.request().url()).pathname);const ext=path.extname(file);route.fulfill({body:fs.readFileSync(file),contentType:ext==='.js'?'application/javascript':ext==='.css'?'text/css':ext==='.png'?'image/png':'text/html'})});
 await page.route('https://callmedaddy.musicsubject.com/**',route=>{
   const pathname=new URL(route.request().url()).pathname;const file=path.join(root,pathname);
   if(offline&&pathname.endsWith('.js'))return route.abort();
   if(pathname.endsWith('.js')) {let body=fs.readFileSync(file,'utf8');if(fresh&&pathname==='/data/songs.js')body+='\nwindow.CMD_SONGS.unshift({id:"test-new-release",title:"Freshly added release",date:"2026-10-15",audio:"/new.mp3"});';return route.fulfill({body,contentType:'application/javascript'})}
   if(fs.existsSync(file))return route.fulfill({body:fs.readFileSync(file),contentType:pathname.endsWith('.png')?'image/png':'image/jpeg'});
   return route.fulfill({body:fs.readFileSync(path.join(root,'app/icon-192.png')),contentType:'image/png'});
 });
 await page.addInitScript(()=>{window.commands=[];window.MusicSubjectNative={postMessage:s=>window.commands.push(JSON.parse(s))}});
 await page.goto('https://appassets.androidplatform.net/assets/index.html');
 await page.waitForFunction(()=>document.getElementById('catalogStatus').textContent.includes('updated just now'));
 assert.equal(await page.locator('.song').count(),expected);
 await page.locator('.song-start').first().click();let cmd=await page.evaluate(()=>commands.at(-1));assert.equal(cmd.type,'play');assert.equal(cmd.queue.length,expected);
 const queue=cmd.queue;
 await page.evaluate(q=>receivePlayback({track:q[0],queue:q,index:0,position:30,duration:135,playing:true,wantsPlayback:true,buffering:false}),queue);
 await page.screenshot({path:'/tmp/musicsubject-app-home.png'});
 await page.locator('#expand').click();assert.equal(await page.locator('#title').textContent(),queue[0].title);
 await page.locator('#next').click();assert.equal(await page.evaluate(()=>commands.at(-1).type),'next');
 await page.evaluate(q=>receivePlayback({track:q[2],queue:q,index:2,position:0,duration:180,playing:true,wantsPlayback:true}),queue);
 assert.equal(await page.locator('#title').textContent(),queue[2].title);
 await page.screenshot({path:'/tmp/musicsubject-app-player.png'});
 await page.locator('#saveTrack').click();await page.locator('#collapse').click();await page.locator('[data-filter=saved]').click();assert.equal(await page.locator('.song').count(),1);
 await page.locator('[data-filter=all]').click();fresh=true;await page.locator('#refresh').click();await page.waitForFunction(n=>document.querySelectorAll('.song').length===n,expected+1);
 assert.equal(await page.locator('.song strong').first().textContent(),'Freshly added release');
 assert.equal(await page.locator('#miniTitle').textContent(),queue[2].title,'catalogue refresh must not replace playing recording');
 offline=true;await page.locator('#refresh').click();await page.waitForFunction(()=>document.getElementById('catalogStatus').textContent.includes('Could not refresh'));
 assert.equal(await page.locator('.song').count(),expected+1);
 await page.locator('#search').fill('turning');assert.ok(await page.locator('.song').count()>=1);
 assert.deepEqual(errors,[]);console.log('PASS: catalogue load, playback commands, next-track metadata, favourites, new-song refresh, offline retention, search, mobile layout');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
