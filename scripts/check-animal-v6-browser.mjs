import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:8765';
const out='/tmp/animal-v6-qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const reports=[];
const currentFrame=async page=>{for(const frame of page.frames().reverse()){try{if(await frame.locator('#animalPlay').isVisible())return frame;}catch{}}throw new Error('Animal page is not visible');};
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
      await page.locator('.animal-cover').click();
      await page.waitForFunction(()=>{const a=window.CMDUniversalPlayer?.getMedia?.();return a&&!a.paused&&a.currentTime>.3&&(a.currentSrc||a.src).includes('/make-me-an-animal-v6/audio.mp3');},null,{timeout:30000});
      let frame=await currentFrame(page);
      await frame.locator('#animalPlay').click();
      await page.waitForFunction(()=>window.CMDUniversalPlayer.getMedia().paused);
      const position=await page.evaluate(()=>window.CMDUniversalPlayer.getMedia().currentTime);
      await frame.locator('#animalPlay').click();
      await page.waitForFunction(p=>{const a=window.CMDUniversalPlayer.getMedia();return !a.paused&&a.currentTime>p;},position);
      if(options.reducedMotion==='reduce'){assert.equal(await frame.locator('#animalVideo').getAttribute('src'),null);await frame.locator('#animalMotion').click();}
      await frame.waitForFunction(()=>{const v=document.getElementById('animalVideo');return v.muted&&v.readyState>=2&&!v.paused;},null,{timeout:30000});
      const media=await page.evaluate(()=>{const a=window.CMDUniversalPlayer.getMedia();return {source:a.currentSrc||a.src,duration:a.duration,position:a.currentTime,tag:a.tagName};});
      assert.equal(media.tag,'AUDIO');
      const art=await frame.evaluate(()=>{const i=document.getElementById('animalCover'),v=document.getElementById('animalVideo');return {image:[i.naturalWidth,i.naturalHeight],video:[v.videoWidth,v.videoHeight],videoDuration:v.duration};});
      await frame.locator('#animalMotion').click();
      assert.equal(await page.evaluate(()=>window.CMDUniversalPlayer.getMedia().paused),false,'Motion toggle leaves the song playing');
      await frame.locator('[data-animal-version="edm-switch-up-mix"]').click();
      await page.waitForFunction(()=>{const a=window.CMDUniversalPlayer.getMedia();return !a.paused&&(a.currentSrc||a.src).includes('/edm-switch-up-mix.mp3');},null,{timeout:30000});
      frame=await currentFrame(page);
      await frame.waitForFunction(()=>document.getElementById('animalVersion').textContent.includes('EDM Switch-Up Mix'));
      assert.ok((await frame.locator('#animalCover').getAttribute('src')).includes('/2026/08/make-me-an-animal/cover.jpg'),'Earlier mix keeps its artwork');
      await frame.locator('[data-animal-version="suno-v6"]').click();
      await page.waitForFunction(()=>{const a=window.CMDUniversalPlayer.getMedia();return !a.paused&&(a.currentSrc||a.src).includes('/make-me-an-animal-v6/audio.mp3');},null,{timeout:30000});
      frame=await currentFrame(page);await frame.locator('#animalTitle').scrollIntoViewIfNeeded();
      await page.screenshot({path:`${out}/${name}-playing.png`,fullPage:true});
      assert.deepEqual(errors,[],'No page runtime errors');
      reports.push({viewport:name,...media,...art,versionSwitching:true,pauseResume:true,errors});
    }catch(error){await page.screenshot({path:`${out}/${name}-failure.png`,fullPage:true}).catch(()=>{});throw error;}finally{await context.close();}
  }
}finally{await browser.close();await fs.writeFile(out+'/report.json',JSON.stringify(reports,null,2));}
console.log(JSON.stringify(reports,null,2));
