import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const origin='https://callmedaddy.musicsubject.com';
const base='/media/songs/2026/09/make-me-an-animal-v6/';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
let last;
for(let attempt=0;attempt<24;attempt++){
  try{
    const get=async(path,options={})=>fetch(origin+path,{...options,signal:AbortSignal.timeout(20000),headers:{'cache-control':'no-cache',...(options.headers||{})}});
    const page=await get('/make-me-an-animal-v6/');assert.equal(page.status,200,'Release page HTTP status');const html=await page.text();assert.ok(html.includes('SAkaHGkSiHPbGl0Q'),'Correct Suno link on live page');assert.ok(html.includes('data-animal-version="suno-v6"'),'Live v6 controls');assert.ok(html.includes(base+'cover.png'),'Live v6 artwork');
    console.log('Live release page and exact v6 controls: OK');
    const media=[];
    for(const [file,type] of [['audio.mp3','audio/'],['background.mp4','video/']]){
      const expected=fs.readFileSync('.'+base+file);
      const head=await get(base+file,{method:'HEAD'});assert.equal(head.status,200,`${file} HEAD status`);assert.ok(head.headers.get('content-type')?.startsWith(type),`${file} MIME type`);
      // This Worker's bodyless HEAD response need not contain the media length.
      // Validate total size and actual seekable bytes against the uploaded file.
      for(const start of [0,expected.length-1024]){
        const end=start+1023;
        const partial=await get(base+file,{headers:{range:`bytes=${start}-${end}`}});
        assert.equal(partial.status,206,`${file} range status`);
        assert.equal(partial.headers.get('content-range'),`bytes ${start}-${end}/${expected.length}`,`${file} range and complete file size`);
        const bytes=Buffer.from(await partial.arrayBuffer());
        assert.equal(bytes.length,1024,`${file} range payload length`);
        assert.equal(digest(bytes),digest(expected.subarray(start,end+1)),`${file} delivered bytes match the original upload`);
      }
      media.push({file,rangeStatus:206,bytes:expected.length,firstAndLastBytesVerified:true});
      console.log(`${file}: first and final byte ranges match the uploaded file (${expected.length} bytes)`);
    }
    const art=await get(base+'cover.png');assert.equal(art.status,200,'Artwork HTTP status');assert.match(art.headers.get('content-type'),/^image\//);assert.equal(digest(Buffer.from(await art.arrayBuffer())),digest(fs.readFileSync('.'+base+'cover.png')),'Published artwork is the exact supplied image');
    const songs=await get('/data/songs.js');assert.ok((await songs.text()).includes(base+'audio.mp3'),'Live catalog contains v6 audio');
    const feed=await get('/data/briefing.js');assert.ok((await feed.text()).includes('release-make-me-an-animal-v6'),'Live discovery feed contains v6 release');
    const old=await get('/updates/release-make-me-an-animal/');assert.equal(old.status,200,'Original release remains reachable');
    const registry=JSON.parse(fs.readFileSync('content/song-links.json','utf8')).songs.find(s=>s.songId==='make-me-an-animal');
    const short=await fetch(`https://suno.fyi/${registry.number}/4`,{redirect:'manual',signal:AbortSignal.timeout(20000)});assert.ok([301,302,307,308].includes(short.status),'Permanent v6 link redirects');assert.ok(short.headers.get('location')?.includes('version=suno-v6'),'Permanent link selects v6, not an earlier recording');
    console.log(JSON.stringify({page:origin+'/make-me-an-animal-v6/',short:`https://suno.fyi/${registry.number}/4`,media,coverExact:true,originalPage:200,discovery:true}));process.exit(0);
  }catch(error){last=error;console.log(`Live verification attempt ${attempt+1}/24: ${error.message}`);await new Promise(resolve=>setTimeout(resolve,10000));}
}
throw last;
