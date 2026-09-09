// Tests real MP3 decoding in touch Chromium, not a mocked media/worker connection.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const base=process.env.SITE_BASE||'http://127.0.0.1:8765',out=process.env.QA_OUTPUT||'/tmp/everybody-qa';
const route='/sad-music/everybody-else-less/',ID='everybody-else-less';
fs.mkdirSync(out,{recursive:true});const report={base,checks:[],errors:[]};
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage();page.on('pageerror',error=>report.errors.push(String(error)));
const check=name=>report.checks.push(name);
const playing=()=>page.waitForFunction(id=>{const p=window.CMDUniversalPlayer,m=p?.getMedia?.(),t=p?.getTrack?.();return t?.songId===id&&m&&!m.paused&&m.currentTime>.1&&new URL(t.audio,location.href).href===m.src},ID,{timeout:25000});
const visibleFrame=async()=>{for(const f of [...page.frames()].reverse())if(f.url().includes(route)&&(f===page.mainFrame()||await(await f.frameElement()).isVisible()))return f;throw Error('No visible song page')};
const docks=async()=>{let n=0;for(const f of page.frames())for(const d of await f.locator('.cmd-universal-player').all())if(await d.isVisible())n++;return n};
try{
 await page.goto(base+route,{waitUntil:'networkidle'});
 assert.equal(await page.locator('#releaseAudio').getAttribute('src'),null);check('Cold page remains silent');
 assert.ok(await page.locator('.art-button img').evaluate(img=>img.complete&&img.naturalWidth>0));check('Original hosted artwork loads');
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:width>800?1050:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,`${width}px.png`),fullPage:true});check(`No overflow at ${width}px`)}
 await page.setViewportSize({width:390,height:844});await page.locator('#releasePlay').click();await playing();
 assert.ok(await page.evaluate(()=>Math.abs(window.CMDUniversalPlayer.getMedia().duration-197.952)<.1));check('First artwork tap starts and decodes the exact 3:18 recording');
 await page.waitForTimeout(600);assert.equal(await docks(),1);check('One visible dock');
 await page.evaluate(()=>{window.__songOwner=window.CMDUniversalPlayer.getMedia();window.CMDUniversalPlayer.control('seek',30)});
 await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia().currentTime>=29.9);
 let f=await visibleFrame();await f.locator('#releasePlay').click();await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia().paused);
 await f.locator('#releasePlay').click();await playing();assert.equal(await page.evaluate(()=>window.__songOwner===window.CMDUniversalPlayer.getMedia()),true);check('Pause, seek and resume retain the same media owner');
 await page.evaluate(()=>window.CMDPersistentSite.open('/music/'));await page.waitForTimeout(1500);await playing();assert.equal(await page.evaluate(()=>window.__songOwner===window.CMDUniversalPlayer.getMedia()),true);
 await page.evaluate(route=>window.CMDPersistentSite.open(route),route);await page.waitForTimeout(1200);f=await visibleFrame();assert.equal(await f.locator('#releasePlay').getAttribute('aria-pressed'),'true');assert.equal(await docks(),1);check('Navigation and return preserve playback and artwork state');
 await f.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(200);
 const bottom=await f.locator('.eel-footer').evaluate(e=>e.getBoundingClientRect().bottom);
 const dockTop=await page.locator('.cmd-universal-player').evaluate(e=>e.getBoundingClientRect().top);assert.ok(bottom<=dockTop,`Footer ${bottom} obscured by dock at ${dockTop}`);check('Full lyrics and footer remain reachable above the dock');
 await page.evaluate(()=>{const m=window.CMDUniversalPlayer.getMedia();m.currentTime=m.duration-4.4});
 await page.waitForFunction(()=>document.querySelector('.cmd-universal-detail')?.textContent.includes('Up next in'),null,{timeout:4000});check('Up next appears in the final five seconds');
 await page.waitForFunction(id=>{const p=window.CMDUniversalPlayer,m=p.getMedia(),t=p.getTrack();return t?.songId!==id&&t?.audio&&m&&!m.paused&&m.currentTime>.1&&new URL(t.audio,location.href).href===m.src},ID,{timeout:30000});check('Natural end continues into real site radio with matching source and metadata');
 await page.evaluate(()=>{window.CMDUniversalPlayer.control('seek',0);window.CMDUniversalPlayer.control('previous')});await playing();check('Previous returns to the original recording');
 await page.waitForFunction(route=>location.pathname===route,route,{timeout:15000});check('Song changes follow the correct story page');
 assert.deepEqual(report.errors,[]);check('No uncaught page errors');report.success=true;
}catch(error){report.success=false;report.failure=String(error.stack||error);await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw error}
finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close()}
