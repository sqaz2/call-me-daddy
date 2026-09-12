import assert from 'node:assert/strict';
import fs from 'node:fs';
const origin='https://callmedaddy.musicsubject.com';
const base='/media/songs/2026/09/make-me-an-animal-v6/';
let last;
for(let attempt=0;attempt<24;attempt++){
  try{
    const get=async(path,options={})=>{const response=await fetch(origin+path,{...options,signal:AbortSignal.timeout(20000),headers:{'cache-control':'no-cache',...(options.headers||{})}});return response;};
    const page=await get('/make-me-an-animal-v6/');assert.equal(page.status,200);const html=await page.text();assert.ok(html.includes('SAkaHGkSiHPbGl0Q'));assert.ok(html.includes('data-animal-version="suno-v6"'));assert.ok(html.includes(base+'cover.png'));
    for(const [file,type] of [['audio.mp3','audio/'],['background.mp4','video/']]){
      const head=await get(base+file,{method:'HEAD'});assert.equal(head.status,200);assert.ok(head.headers.get('content-type')?.startsWith(type));assert.ok(Number(head.headers.get('content-length'))>1000);
      const partial=await get(base+file,{headers:{range:'bytes=0-1023'}});assert.equal(partial.status,206);assert.match(partial.headers.get('content-range'),/^bytes 0-1023\//);assert.equal((await partial.arrayBuffer()).byteLength,1024);
    }
    const art=await get(base+'cover.png',{method:'HEAD'});assert.equal(art.status,200);assert.match(art.headers.get('content-type'),/^image\//);
    const songs=await get('/data/songs.js');assert.ok((await songs.text()).includes(base+'audio.mp3'));
    const feed=await get('/data/briefing.js');assert.ok((await feed.text()).includes('release-make-me-an-animal-v6'));
    const old=await get('/updates/release-make-me-an-animal/');assert.equal(old.status,200);
    const registry=JSON.parse(fs.readFileSync('content/song-links.json','utf8')).songs.find(s=>s.songId==='make-me-an-animal');
    const short=await fetch(`https://suno.fyi/${registry.number}/4`,{redirect:'manual',signal:AbortSignal.timeout(20000)});assert.ok([301,302,307,308].includes(short.status));assert.ok(short.headers.get('location')?.includes('version=suno-v6'));
    console.log(JSON.stringify({page:origin+'/make-me-an-animal-v6/',short:`https://suno.fyi/${registry.number}/4`,audioRanges:206,videoRanges:206,cover:200,originalPage:200,discovery:true}));process.exit(0);
  }catch(error){last=error;console.log(`Waiting for deployment (${attempt+1}/24): ${error.message}`);await new Promise(resolve=>setTimeout(resolve,10000));}
}
throw last;
