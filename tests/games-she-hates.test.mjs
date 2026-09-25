import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {buildSongSocial} from '../scripts/build-song-social.mjs';
import {resolveSocial} from '../song-social.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const manifest=JSON.parse(read('content/releases/2026-09-25-the-games-she-hates.json'));
const sources=JSON.parse(read('content/sources/the-games-she-hates.json'));
const song=manifest.song;
function load(search=''){
 const store=new Map([['fake-listener-count','1000000']]);
 const window={};const context=vm.createContext({window,location:{search},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},URLSearchParams,Date,Math,Uint32Array});
 for(const p of ['data/radio-intents.js','catalog-cycle.js'])vm.runInContext(read(p),context);
 return window;
}
test('four original recordings remain distinct and byte-for-byte unchanged',()=>{
 const hashes=new Set();
 for(const record of sources.recordings){
  const variant=song.variants.find(v=>v.id===record.variantId);
  const hash=p=>createHash('sha256').update(fs.readFileSync(new URL('../'+p,import.meta.url))).digest('hex');
  assert.equal(hash(record.file),hash(variant.audio.slice(1)));
  hashes.add(hash(record.file));
 }
 assert.equal(hashes.size,4);
});
test('editorial opener stays fixed across seeds, repeat cycles, and absent audience data',()=>{
 const w=load();
 w.CMDListenerTaste={weightMultiplier:()=>1000000,isKilled:()=>false,get:()=>({plays:1000000,completions:1000000})};
 for(let i=0;i<50;i++){
  const selected=w.CMDCatalogCycle.build([song],{seed:'listener-'+i,cycleNumber:i+1,ignoreHistory:true});
  assert.equal(selected[0].variantId,'main');
 }
 assert.equal(song.openerPolicy.minimumUniqueListenersPerVersion,100);
 assert.equal(song.openerPolicy.minimumObservationDays,14);
 assert.equal(song.openerPolicy.aggregateDataSource,null);
});
test('explicit shares retain each selected recording including the bonus',()=>{
 for(const variant of song.variants){
  const w=load('?song='+song.id+'&version='+variant.id);
  const selected=w.CMDCatalogCycle.build([song],{seed:'exact-version',cycleNumber:1});
  assert.equal(selected[0].variantId,variant.id);
  assert.equal(selected[0].audio,variant.audio);
 }
});
test('personal exclusions never promote the bonus to ordinary opener',()=>{
 const w=load();w.CMDListenerTaste={isKilled:(id,vid)=>vid==='main'};
 assert.equal(w.CMDCatalogCycle.build([song],{seed:'excluded'})[0].variantId,'be-yourself');
 w.CMDListenerTaste.isKilled=(id,vid)=>vid!=='end-this-cycle';
 assert.equal(w.CMDCatalogCycle.build([song],{seed:'excluded'}).length,0);
});
test('each exact-version social link uses its own artwork and the bonus is in sad music',()=>{
 const data=buildSongSocial({write:false});
 for(const v of song.variants){
  const record=resolveSocial('https://callmedaddy.musicsubject.com/the-games-she-hates/?version='+v.id,data);
  assert.equal(new URL(record.image).pathname,v.cover);
  assert.ok(record.title.includes(v.label));
 }
 const window={};vm.runInNewContext(read('data/sad-music.js'),{window});
 const bonus=window.CMD_SAD_MUSIC.find(s=>s.id===song.id);
 assert.equal(bonus.versions[0].id,'end-this-cycle');
 assert.ok(bonus.route.includes('version=end-this-cycle'));
});
test('search finds title, alternate title, bonus title, and original poem',()=>{
 const window={};vm.runInNewContext(read('data/song-lyrics.js'),{window});
 vm.runInNewContext(read('catalog-search.js'),{window});
 for(const query of ['The Games She Hates','Be Yourself','End This Cycle','your behavior is beautiful by nature'])assert.equal(window.CMDCatalogSearch.filterSongs([song],query).length,1);
 const lyrics=JSON.parse(read('the-games-she-hates/lyrics.json'));
 assert.equal(lyrics.main,manifest.lyrics.text);
 assert.ok(lyrics['end-this-cycle'].startsWith('[Intro]\n[Spoken]\n'));
});
