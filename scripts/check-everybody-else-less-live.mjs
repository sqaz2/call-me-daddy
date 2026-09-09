// Read-only checks against the real custom domain, after its existing deployment finishes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const origin='https://callmedaddy.musicsubject.com';
const release=JSON.parse(fs.readFileSync('content/releases/2026-08-everybody-else-less.json','utf8'));
const proof=JSON.parse(fs.readFileSync('content/sources/everybody-else-less.json','utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const get=async(path,headers={})=>{const r=await fetch(origin+path,{cache:'no-store',headers,signal:AbortSignal.timeout(20000)});assert.ok(r.ok,`${path}: HTTP ${r.status}`);return r};
let success=false;
for(let attempt=1;attempt<=30;attempt++)try{
 const route=release.song.experience,page=await(await get(route)).text();assert.ok(page.includes('The hurt doesn’t'));assert.ok(page.includes('fictional narrator'));assert.ok(page.includes(release.lyrics.text));assert.ok(page.includes('jOr9CSygvDsRHMC9'));assert.ok(page.includes(`href="${origin+route}"`));
 for(const file of ['player.js','style.css']){const deployed=Buffer.from(await(await get(route+file)).arrayBuffer());assert.equal(hash(deployed),hash(fs.readFileSync('.'+route+file)),`Stale ${file}`)}
 const catalog=await(await get('/data/songs.js')).text();assert.equal((catalog.match(/(?:id:|"id":)\s*['"]everybody-else-less['"]/g)||[]).length,1);
 for(const [p,marker]of [['/data/briefing.js',release.update.id],['/sitemap.xml',origin+route],[release.update.sharePath,release.song.title],['/data/song-lyrics.js',release.lyrics.clipIds[0]]])assert.ok((await(await get(p)).text()).includes(marker),p);
 const range=await get(release.song.audio,{Range:'bytes=0-63'});assert.equal(range.status,206);assert.equal(range.headers.get('content-range'),`bytes 0-63/${proof.audioBytes}`);assert.equal(Buffer.from(await range.arrayBuffer()).toString('ascii',0,3),'ID3');
 const audio=Buffer.from(await(await get(release.song.audio)).arrayBuffer());assert.equal(audio.length,proof.audioBytes);assert.equal(hash(audio),proof.audioSha256);
 const cover=Buffer.from(await(await get(release.song.cover)).arrayBuffer());assert.equal(cover.length,proof.coverBytes);assert.equal(crypto.createHash('sha1').update(`blob ${cover.length}\0`).update(cover).digest('hex'),proof.coverGitBlob);
 console.log('LIVE VERIFIED: exact lyrics/story, shared player JS/CSS, one catalog identity, homepage feed, update share page, sitemap, byte-identical original MP3 and cover, HTTP206 seeking.');success=true;break;
}catch(error){console.log(`Deployment ${attempt}/30: ${error.message}`);if(attempt<30)await new Promise(r=>setTimeout(r,10000))}
if(!success){console.error('Production not verified. Do not claim this page is live.');process.exitCode=1}
