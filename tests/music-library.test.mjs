import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildCatalog,filterCatalog,makeQueue,shareURL,AMBIENCE,LIBRARY_ORIGIN} from '../library/model.mjs';
import {librarySocial,handleLibrary} from '../worker/library.mjs';
import {SkiesAmbience} from '../library/ambience.mjs';
import {STARMUFF_TRACKS} from '../data/starmuff-playlist.mjs';
import {readHead} from '../song-social.mjs';

const songs=[{id:'song',title:'One song',kind:'Hip-hop',variants:[{id:'rap',label:'Rap',audio:'/rap.mp3'},{id:'soul',label:'Alternative R&B',audio:'/soul.mp3'},{id:'dnb',label:'DnB remix',audio:'/dnb.mp3'}]}, {id:'story',title:'Story',openerPolicy:{defaultVersion:'main',eligibleVersions:['main']},variants:[{id:'opening',audio:'/opening.mp3'},{id:'main',audio:'/main.mp3'}]}, {id:'optional',title:'Optional',rotation:'opt-in',audio:'/optional.mp3'}];
test('genre collections select exact versions without inheriting the other mix genre',()=>{
 const catalog=buildCatalog(songs);
 assert.deepEqual(filterCatalog(catalog,{group:'rnb'})[0].visibleTracks.map(t=>t.variantId),['soul']);
 assert.equal(filterCatalog(catalog,{group:'rock'}).length,0);
 assert.deepEqual(filterCatalog(catalog,{group:'dnb'})[0].visibleTracks.map(t=>t.variantId),['dnb']);
 assert.deepEqual(filterCatalog(catalog,{group:'hiphop'})[0].visibleTracks.map(t=>t.variantId),['rap']);
});
test('a collection rotates from its selected recording, excludes opt-in/opening/ambience and preserves exact share identity',()=>{
 const visible=filterCatalog(buildCatalog(songs)),first=visible.find(s=>s.id==='song').tracks[1];
 const queue=makeQueue(visible,first);
 assert.equal(queue[0].variantId,'soul');
 assert.ok(queue.every(t=>!t.manualOnly&&!t.ambience));
 assert.equal(new Set(queue.map(t=>t.audio)).size,queue.length);
 assert.deepEqual(queue.slice(0,2).map(t=>t.variantId),['soul','dnb']);
 const url=new URL(shareURL({group:'rnb',track:first}));
 assert.equal(url.origin,LIBRARY_ORIGIN);assert.equal(url.searchParams.get('song'),'song');assert.equal(url.searchParams.get('version'),'soul');
});
test('both StarMuff editions have independent collection identities',()=>{
 const catalog=buildCatalog([],STARMUFF_TRACKS);
 assert.equal(filterCatalog(catalog,{group:'starmuff'}).length,50);
 const skies=filterCatalog(catalog,{group:'unwritten-skies'});
 assert.equal(skies.length,1);assert.equal(skies[0].tracks[0].ambience,true);
 assert.equal(filterCatalog(catalog,{group:'calming'})[0].id,AMBIENCE.id);
});
const html=fs.readFileSync(new URL('../library/index.html',import.meta.url),'utf8');
const index={schemaVersion:1,songs:{song:{defaultVersion:'rap',versions:{rap:{title:'Reviewed headline — One song',description:'Read the original story.',image:'https://callmedaddy.musicsubject.com/rap.jpg'},soul:{title:'Reviewed headline — One song · Soul',description:'Read the original story.',image:'https://callmedaddy.musicsubject.com/soul.jpg'}}}},pages:{}};
const assets={fetch:async r=>new URL(r.url).pathname==='/data/song-social.json'?Response.json(index):new Response(html,{headers:{'content-type':'text/html'}})};
test('library host has its own root and exact-version previews without the old navigation shell',async()=>{
 const r=await handleLibrary(new Request(LIBRARY_ORIGIN+'/?song=song&version=soul'),{ASSETS:assets});
 const body=await r.text(),head=readHead(body);
 assert.equal(r.status,200);assert.equal(r.headers.get('x-musicsubject-library'),'1');
 assert.match(head.title,/Soul.*MusicSubject Library/);
 assert.equal(head.image,LIBRARY_ORIGIN+'/soul.jpg');
 assert.equal(head.canonical,LIBRARY_ORIGIN+'/?song=song&version=soul');
 assert.doesNotMatch(head.description,/Read the original story/);
 assert.doesNotMatch(body,/<a[^>]+href=["']https:\/\/callmedaddy/);
 assert.doesNotMatch(body,/app\/install\.js|persistent-site-browser\.js/);
 const headResponse=await handleLibrary(new Request(LIBRARY_ORIGIN+'/',{method:'HEAD'}),{ASSETS:assets});assert.equal(headResponse.body,null);
});
test('existing homepage stays on its own route and unrelated artist pages are unavailable on the library host',async()=>{
 assert.equal(await handleLibrary(new Request('https://callmedaddy.musicsubject.com/'),{}),null);
 assert.equal((await handleLibrary(new Request(LIBRARY_ORIGIN+'/music/'),{})).status,404);
 assert.equal((await handleLibrary(new Request(LIBRARY_ORIGIN+'/',{method:'POST'}),{})).status,405);
});
test('both edition previews and collection links keep the library origin',()=>{
 for(const suffix of ['?group=starmuff','?group=country','?song='+STARMUFF_TRACKS[0].id+'&version=main','?song='+AMBIENCE.id+'&version=ambient']){
  const social=librarySocial(new URL(LIBRARY_ORIGIN+'/'+suffix),index);
  assert.equal(new URL(social.canonical).origin,LIBRARY_ORIGIN);
  assert.equal(new URL(social.image).origin,LIBRARY_ORIGIN);
 }
});
test('StarMuff proxy streams the exact recording with its range intact on the library host',async()=>{
 let seen;
 const r=await handleLibrary(new Request(LIBRARY_ORIGIN+STARMUFF_TRACKS[0].audio,{headers:{range:'bytes=0-2'}}),{STARMUFF:{fetch:async request=>{seen=request;return new Response(new Uint8Array([1,2,3]),{status:206,headers:{'content-type':'audio/mpeg','content-range':'bytes 0-2/100'}});}}});
 assert.equal(r.status,206);assert.equal(seen.headers.get('range'),'bytes=0-2');assert.equal(new URL(seen.url).pathname,STARMUFF_TRACKS[0].sourcePath);
});
const param=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(v){this.value=v;}});
class FakeContext{
 constructor(){this.currentTime=0;this.sampleRate=10;this.destination={};this.oscillators=[];}
 createGain(){return {gain:param(),connect(){}};}
 createDynamicsCompressor(){return {threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){}};}
 createBiquadFilter(){return {frequency:param(),Q:param(),connect(){}};}
 createOscillator(){const o={frequency:param(),connect(){},start(){}};this.oscillators.push(o);return o;}
 createConvolver(){return {connect(){}};}
 createBuffer(ch,len){return {getChannelData(){return new Float32Array(len);}};}
 async resume(){}async suspend(){}async close(){}
}
test('ambience starts both original layers, each can be muted, and immediate pause cancels a pending resume',async()=>{
 const a=new SkiesAmbience(FakeContext);assert.equal(await a.play(),true);
 assert.ok(a.drone.gain.value>0&&a.pad.gain.value>0&&a.master.gain.value>0);
 assert.ok(a.context.oscillators.some(o=>o.frequency.value===55));
 assert.ok(a.context.oscillators.some(o=>o.frequency.value===65.41));
 a.set({drone:0,pad:0});assert.equal(a.drone.gain.value,0);assert.equal(a.pad.gain.value,0);
 const pending=a.play();a.pause();assert.equal(await pending,false);assert.equal(a.running,false);assert.equal(a.master.gain.value,0);a.destroy();
});
