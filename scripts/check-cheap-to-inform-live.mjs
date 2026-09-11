/** Verify publication, discoverability, and byte-range delivery on the real domain. */
import assert from 'node:assert/strict';
const origin='https://callmedaddy.musicsubject.com';
const once=async()=>{
  const get=async(path,headers={})=>fetch(`${origin}${path}`, {headers:{'cache-control':'no-cache',...headers},signal:AbortSignal.timeout(15000)});
  const page=await get('/cheap-to-inform/');
  assert.equal(page.status,200,'Song page HTTP status');
  const html=await page.text();
  assert.ok(html.includes('<h1 id="song-title">CHEAP'));
  assert.ok(html.includes('Scene study') && html.includes('Personal · Lived experience'));
  assert.ok(html.includes('https://suno.com/s/Gn6OwZiICiZD9qjd'));
  assert.ok(html.includes('huge audiences are cheap to mobilize and expensive to inform.'));
  const evidence=[];
  for(const [file,size,type] of [['audio.mp3',3139641,'audio/'],['cover.jpg',409327,'image/'],['background.mp4',4090357,'video/']]){
    const response=await get(`/media/songs/2026/09/cheap-to-inform/${file}`, {range:'bytes=0-511'});
    assert.equal(response.status,206,`${file} range response`);
    assert.ok((response.headers.get('content-type')||'').startsWith(type));
    assert.equal(response.headers.get('content-range'),`bytes 0-511/${size}`);
    assert.equal((await response.arrayBuffer()).byteLength,512);
    evidence.push({file,status:response.status,contentRange:response.headers.get('content-range')});
  }
  for(const path of ['/data/songs.js','/data/briefing.js','/data/radio-intents.js','/sitemap.xml','/updates/release-cheap-to-inform/']){
    const response=await get(path);
    assert.equal(response.status,200,path);
    assert.ok((await response.text()).includes('cheap-to-inform'),`${path} includes release`);
  }
  console.log(JSON.stringify({page:`${origin}/cheap-to-inform/`,verifiedAt:new Date().toISOString(),media:evidence,discovery:'catalog, homepage feed, radio, sitemap and update route verified'},null,2));
};
const deadline=Date.now()+6*60*1000;
for(;;){
  try{await once();break;}catch(error){
    if(Date.now()>=deadline)throw error;
    console.log(`Publication not verified yet: ${error.message}`);
    await new Promise(resolve=>setTimeout(resolve,12000));
  }
}
