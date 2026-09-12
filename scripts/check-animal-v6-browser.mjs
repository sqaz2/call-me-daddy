import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:8765';
const out='/tmp/animal-v6-qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const reports=[];
// Playback may retain the old document as its audio owner while the visible
// song page moves into a new iframe. Check real pointer actionability, not
// merely DOM visibility in that retained document. Never force a covered click.
const interact=async(page,selector,trial=false)=>{
  const deadline=Date.now()+15000;let last;
  while(Date.now()<deadline){
    for(const frame of page.frames().reverse()){
      try{
        const target=frame.locator(selector);
        if(!await target.isVisible())continue;
        if(frame!==page.mainFrame()){
          const element=await frame.frameElement();
          if(!await element.evaluate(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return r.width>100&&r.height>100&&s.display!=='none'&&s.visibility!=='hidden'&&s.pointerEvents!=='none';}))continue;
        }
        await target.click({trial,timeout:700});
        return frame;
      }catch(error){last=error;}
    }
    await page.waitForTimeout(100);
  }
  throw new Error(`No actionable Animal control ${selector}: ${last?.message||'page not ready'}`);
};
const currentFrame=page=>interact(page,'#animalPlay',true);
try{
  for(const spec of [{name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'},{name:'desktop',viewport:{width:1440,height:1000},reducedMotion:'no-preference'}]){
    const {name,...options}=spec;const context=await browser.newContext(options);const page=await context.newPage();const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    try{
      assert.equal((await page.goto(base+'/make-me-an-animal-v6/',{waitUntil:'domcontentloaded'})).status(),200);
      await page.waitForFunction(()=>window.CMDContinuousPlayback&&window.CMD_SONGS?.find(s=>s.id==='make-me-an-animal')?.variants.length===4);
      await page.waitForFunction(()=>document.querySelector('#animalCover')?.naturalWidth>0);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No horizontal overflow');
      assert.equal(await page.locator('#animalVideo').getAttribute('src'),null,'No idle video request');
      await page.screenshot({path:`${out}/${name}-initial.png`,fullPage:true});
      await interact(page,'.animal-cover');
      await page.waitForFunction(()=>{const a=window.CMDUniversalPlayer?.getMedia?.();return a&&!a.paused&&a.currentTime>.3&&(a.currentSrc||a.src).includes('/make-me-an-animal-v6/audio.mp3');},null,{timeout:30000});
      await interact(page,'#animalPlay');
      await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia().paused);
      const position=await page.evaluate(()=>window.CMDUniversalPlayer.getMedia().currentTime);
      await interact(page,'#animalPlay');
      await page.waitForFunction(p=>{const a=window.CMDUniversalPlayer.getMedia();return !a.paused&&a.currentTime>p;},position);
      let frame=await currentFrame(page);
      if(options.reducedMotion==='reduce'){assert.equal(await frame.locator('#animalVideo').getAttribute('src'),null);frame=await interact(page,'#animalMotion');}
      await frame.waitForFunction(()=>{const v=document.getElementById('animalVideo');return v.muted&&v.readyState>=2&&!v.paused;},null,{timeout:30000});
      const media=await page.evaluate(()=>{const a=window.CMDUniversalPlayer.getMedia();return {source:a.currentSrc||a.src,duration:a.duration,position:a.currentTime,tag:a.tagName};});
      assert.equal(media.tag,'AUDIO');
      const art=await frame.evaluate(()=>{const i=document.getElementById('animalCover'),v=document.getElementById('animalVideo');return {image:[i.naturalWidth,i.naturalHeight],video:[v.videoWidth,v.videoHeight],videoDuration:v.duration};});
      await interact(page,'#animalMotion');
      assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia().paused),false,'Motion toggle leaves the song playing');
      await interact(page,'[data-animal-version="edm-switch-up-mix"]');
      await page.waitForFunction(()=>{const a=window.CMDUniversalPlayer.getMedia();return !a.paused&&(a.currentSrc||a.src).includes('/edm-switch-up-mix.mp3');},null,{timeout:30000});
      frame=await currentFrame(page);
      await frame.waitForFunction(()=>document.getElementById('animalVersion').textContent.includes('EDM Switch-Up Mix'));
      assert.ok((await frame.locator('#animalCover').getAttribute('src')).includes('/2026/08/make-me-an-animal/cover.jpg'),'Earlier mix keeps its artwork');
      await interact(page,'[data-animal-version="suno-v6"]');
      await page.waitForFunction(()=>{const a=window.CMDUniversalPlayer.getMedia();return !a.paused&&(a.currentSrc||a.src).includes('/make-me-an-animal-v6/audio.mp3');},null,{timeout:30000});
      frame=await currentFrame(page);
      await frame.waitForFunction(()=>document.getElementById('animalVersion').textContent.includes('Suno v6'));
      await frame.locator('#animalTitle').scrollIntoViewIfNeeded();
      await page.screenshot({path:`${out}/${name}-playing.png`,fullPage:true});
      assert.deepEqual(errors,[],'No page runtime errors');
      reports.push({viewport:name,...media,...art,versionSwitching:true,pauseResume:true,errors});
    }catch(error){
      await page.screenshot({path:`${out}/${name}-failure.png`,fullPage:true}).catch(()=>{});
      await fs.writeFile(`${out}/${name}-failure.json`,JSON.stringify({error:error.message,errors,frames:page.frames().map(f=>f.url()),media:await page.evaluate(()=>{const a=window.CMDUniversalPlayer?.getMedia?.();return a?{source:a.currentSrc||a.src,paused:a.paused,position:a.currentTime}:null;}).catch(()=>null)},null,2));
      throw error;
    }finally{await context.close();}
  }
}finally{await browser.close();await fs.writeFile(out+'/report.json',JSON.stringify(reports,null,2));}
console.log(JSON.stringify(reports,null,2));
