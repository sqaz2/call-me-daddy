import { chromium } from 'playwright';
import fs from 'node:fs';
const base=process.env.SITE_BASE||'http://127.0.0.1:8765';
const out='/tmp/replay-qa';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const reports=[];
for(const origin of ['/superstore-effect/','/set-a-table-for-two/']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const report={origin,states:[],events:[],errors:[]};reports.push(report);
  await context.addInitScript(()=>{
    const stamp=Math.random().toString(36).slice(2,7);window.__stamp=stamp;
    for(const type of ['play','playing','pause','ended','emptied','error'])document.addEventListener(type,e=>{if(e.target instanceof HTMLMediaElement)console.log('TRACE '+JSON.stringify({stamp,href:location.href,type,src:e.target.src,paused:e.target.paused,time:e.target.currentTime}))},true);
    addEventListener('message',e=>{if(e.data?.type?.startsWith('cmd:'))console.log('TRACE '+JSON.stringify({stamp,type:e.data.type,from:e.source?.__stamp}))});
  });
  const page=await context.newPage();
  page.on('console',m=>{if(m.text().startsWith('TRACE'))report.events.push(m.text().slice(6))});
  page.on('pageerror',e=>report.errors.push(String(e)));
  const state=async label=>{
    const s=await page.evaluate(()=>{const p=window.CMDUniversalPlayer,m=p?.getMedia(),t=p?.getTrack();return {href:location.href,title:t?.title,variant:t?.variantId,source:m?.src,paused:m?.paused,ended:m?.ended,time:m?.currentTime,owner:m?.ownerDocument.defaultView?.__stamp,connected:m?.isConnected,dock:document.querySelector('.cmd-universal-detail')?.textContent,frames:[...document.querySelectorAll('iframe')].map(f=>({url:f.src,stamp:f.contentWindow?.__stamp,playing:[...f.contentDocument?.querySelectorAll('audio')||[]].map(a=>({src:a.src,paused:a.paused,time:a.currentTime}))}))}});
    report.states.push({label,...s});console.log(label,JSON.stringify(s));return s;
  };
  const view=async selector=>{
    for(const f of [...page.frames()].reverse())if(await f.locator(selector).count())return f;
    throw Error('No view: '+selector);
  };
  const tap=async selector=>(await view(selector)).locator(selector).first().tap();
  const navigate=async url=>{await page.evaluate(u=>window.CMDPersistentSite.open(u),url);await page.waitForTimeout(700)};
  const waitPlay=()=>page.waitForFunction(()=>{const m=window.CMDUniversalPlayer?.getMedia();return m&&!m.paused&&m.currentTime>.1},null,{timeout:12000});
  try{
    await page.goto(base+origin,{waitUntil:'networkidle'});
    if(origin.includes('superstore')){
      await tap('.ss-cover-button');await waitPlay();await state('Superstore first');
      await navigate('/updates/');await tap('a[href="/set-a-table-for-two/"]');await page.waitForTimeout(700);
    }
    await tap('#releasePlay');await waitPlay();await page.waitForTimeout(350);await state('Main first');
    await page.evaluate(()=>{const m=window.CMDUniversalPlayer.getMedia();m.currentTime=m.duration-.5});await page.waitForTimeout(1500);await state('Clone after main ended');
    await page.evaluate(()=>{const m=window.CMDUniversalPlayer.getMedia();m.currentTime=m.duration-.5});await page.waitForTimeout(1500);await state('Radio after both ended');
    await navigate('/superstore-effect/');await tap('.ss-cover-button');await page.waitForTimeout(700);await state('Superstore again');
    for(let i=0;i<3;i++){
      await navigate('/updates/');await tap('a[href="/set-a-table-for-two/"]');await page.waitForTimeout(700);await state('Returned before tap '+i);
      await tap('#releasePlay');await page.waitForTimeout(900);await state('Returned first tap '+i);
      await tap('#releasePlay');await page.waitForTimeout(400);await state('Returned second tap '+i);
      await tap('#releasePlay');await page.waitForTimeout(900);await state('Returned third tap '+i);
      await navigate('/');await navigate('/set-a-table-for-two/');await tap('#releasePlay');await page.waitForTimeout(700);await state('After home tap '+i);
      await tap('[data-cut="voice-clone"]');await page.waitForTimeout(700);await state('Other cut '+i);
      await navigate('/superstore-effect/');await tap('.ss-cover-button');await page.waitForTimeout(700);
    }
  }catch(e){report.failure=String(e.stack||e);await state('FAILURE').catch(()=>{});await page.screenshot({path:`${out}/${origin.includes('superstore')?'superstore':'table'}-failure.png`}).catch(()=>{})}
  await context.close();
}
await browser.close();
fs.writeFileSync(out+'/diagnostics.json',JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports.map(({origin,states,errors,failure})=>({origin,states,errors,failure})),null,2));
