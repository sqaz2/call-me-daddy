import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadCatalog,buildLinks} from '../scripts/sync-song-links.mjs';
import {buildLibraryCatalog} from '../library/catalog.mjs';
import {filterCatalog,shareURL,GROUPS} from '../library/model.mjs';
import {EDITORIAL,MOOD_IDS} from '../library/editorial.mjs';
import {canonicalLibraryURL,canonicalLibraryTrackKey} from '../library/identities.mjs';
import {handleRequest} from '../worker/index.mjs';
import {handleLibrary} from '../worker/library.mjs';
import {handleShortLink} from '../worker/short-links.mjs';
const catalog=buildLibraryCatalog(loadCatalog());
const song=id=>catalog.find(s=>s.id===id);
const canonical='did-armando-die-after-you-held-his-beer';
test('artist genre confirmations apply to the right recordings, without leaking into gospel',()=>{
 for(const [id,genre] of [['2010-wows','hiphop'],['eternal-room','rock'],['funhouse-meltdown','dubstep'],['where-the-teeth-are-kept','dubstep']])assert.ok(song(id).tracks.every(t=>t.genres.includes(genre)),id);
 assert.ok(song('this-is-my-story').tracks.find(t=>t.variantId==='main').genres.includes('hiphop'));
 assert.deepEqual(song('this-is-my-story').tracks.find(t=>t.variantId==='gospel').genres,['gospel']);
 assert.ok(song('concrete-under-evergreens').tracks.every(t=>t.genres.includes('rock'))); // matched source identifies adult-alternative, independent of its comedy mood
});
test('lyrical moods, dropdowns and natural brief searches agree',()=>{
 for(const [query,mood,id] of [['encouragement','motivational','keep-moving'],['encouraging','motivational','stomp-clamp'],['winning','triumphant','power-moves-only'],['hopeful','hopeful','one-brick'],['vulnerable','vulnerable','come-sit-here-with-me'],['curiosity','curious','cloudlife'],['bitter','bitter','everybody-else-less'],['sweet comedy','gentle','concrete-under-evergreens'],['suspenseful dubstep','tense','where-the-teeth-are-kept']]){
  assert.ok(filterCatalog(catalog,{q:query}).some(s=>s.id===id),query);
  assert.ok(filterCatalog(catalog,{mood}).some(s=>s.id===id),mood);
 }
 assert.ok(!song('come-sit-here-with-me').groups.includes('romantic'));
 assert.ok(!song('2010-wows').groups.includes('romantic'));
 assert.ok(!song('fractured-face').groups.includes('hopeful'));
 assert.ok(song('the-loudest-one-in-my-head').groups.includes('anxious'));
 assert.ok(song('the-loudest-one-in-my-head').groups.includes('hopeful'));
 assert.ok(!song('the-loudest-one-in-my-head').groups.includes('triumphant'));
 assert.ok(!song('stomp-clamp').groups.includes('triumphant'));
 assert.deepEqual(GROUPS.filter(g=>g.kind==='mood').map(g=>g.id).sort(),[...MOOD_IDS].sort());
 for(const [id,entry] of Object.entries(EDITORIAL))if(entry.replaceMoods){assert.ok(entry.note,id);assert.ok(entry.moods.every(m=>MOOD_IDS.includes(m)),id);}
});
test('questionable lyric mappings do not invent search matches or verified lyric coverage',()=>{
 const c=buildLibraryCatalog(loadCatalog(),[],{lyrics:{'numbness-as-a-trap':{search:'stomp clamp anomalousphrase'}}});
 const s=c.find(s=>s.id==='numbness-as-a-trap');s.searchLyrics='stomp clamp anomalousphrase';
 assert.ok(s.tracks.every(t=>!t.lyricsAvailable&&t.lyricsReview));
 assert.equal(filterCatalog([s],{q:'anomalousphrase'}).length,0);
});
test('Armando has one identity and retains both exact recordings',()=>{
 assert.ok(!loadCatalog().some(s=>s.id==='armando'));
 const s=song(canonical);assert.equal(s.tracks.length,2);
 assert.deepEqual(s.tracks.map(t=>[t.variantId,t.audio]),[['main','/media/songs/2026/08/did-armando-die-after-you-held-his-beer/audio.mp3'],['earlier','/media/songs/2026/08/armando/audio.mp3']]);
 assert.equal(filterCatalog(catalog,{q:'Armando'}).length,1);
 assert.equal(filterCatalog(catalog,{q:'Armando — Earlier Mix'})[0].visibleTracks[0].variantId,'earlier');
 assert.equal(canonicalLibraryTrackKey('armando:main'),canonical+':earlier');
 const old=canonicalLibraryURL('https://library.musicsubject.com/?song=armando&version=main&pick=armando:main');
 assert.equal(old.searchParams.get('song'),canonical);assert.equal(old.searchParams.get('version'),'earlier');assert.equal(old.searchParams.get('pick'),canonical+':earlier');
 assert.equal(new URL(shareURL({track:s.tracks[1]})).searchParams.get('version'),'earlier');
});
test('old numbered Armando links and query links keep the original mix, not the chosen recording',async()=>{
 const links=buildLinks(loadCatalog(),JSON.parse(fs.readFileSync('content/song-links.json')));
 assert.deepEqual(links.rows.filter(r=>r.songId===canonical).map(r=>[r.number,r.slot,r.version]),[[4,1,'earlier'],[14,1,'main']]);
 assert.equal(handleShortLink(new Request('https://jokes.win/4')).headers.get('location'),'https://callmedaddy.musicsubject.com/power-pulse-uprising/?version=earlier');
 const redirected=await handleRequest(new Request('https://callmedaddy.musicsubject.com/music/?song=armando&version=main'),{});
 assert.equal(new URL(redirected.headers.get('location')).searchParams.get('version'),'earlier');
 const library=await handleLibrary(new Request('https://library.musicsubject.com/?song=armando&version=main'),{});
 assert.equal(library.status,308);assert.equal(new URL(library.headers.get('location')).searchParams.get('version'),'earlier');
 const module=await handleLibrary(new Request('https://library.musicsubject.com/data/song-identities.mjs'),{ASSETS:{fetch:()=>new Response('module')}});assert.equal(module.status,200);
});
test('Armando player selects deep-linked versions and plays version choices in the tap handler',()=>{
 for(const search of ['', '?version=earlier','?song=armando']){
  const elements=new Map();const element=()=>({dataset:{},addEventListener(name,fn){this[name]=fn},setAttribute(){},appendChild(){},querySelector(){return null},classList:{toggle(){}}});
  elements.set('pulseAudio',element());elements.set('pulsePlay',element());
  const buttons=['main','earlier'].map(id=>({...element(),dataset:{armandoVersion:id}}));let options;const actions=[];
  const document={getElementById:id=>elements.get(id),querySelector:()=>null,querySelectorAll:q=>q==='[data-armando-version]'?buttons:[],createElement:element};
  vm.runInNewContext(fs.readFileSync('power-pulse-uprising/continuous-player.js','utf8'),{document,location:{search},URLSearchParams,window:{CMDContinuousPlayback:{create:o=>{options=o;return{load:(index,state)=>actions.push([index,state.autoplay]),play:()=>actions.push('play'),pause(){}}}}}});
  assert.equal(options.startIndex,search?1:0);assert.equal(options.tracks[1].songId,canonical);assert.equal(options.tracks[1].variantId,'earlier');assert.match(options.tracks[1].experience,/version=earlier/);
  buttons[1].click();buttons[0].click();assert.deepEqual(actions,[[1,true],[0,true]]);
  elements.get('pulseAudio').paused=true;elements.get('pulsePlay').click();assert.equal(actions.at(-1),'play');
 }
});

test('previously missing published lyric sheets are searchable and give vocal coverage',()=>{
 for(const [id,phrase] of [['concrete-under-evergreens','wheelbarrows'],['live-it-right','reassurance']]){
  const s=song(id);assert.ok(s.tracks.every(t=>t.lyricsAvailable&&t.vocals==='vocal'));
  assert.ok(filterCatalog(catalog,{q:phrase}).some(s=>s.id===id));
 }
});
