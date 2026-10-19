import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const audio='/media/songs/2026/10/her-story/audiobook.m4a';
test('the optional audiobook preserves the artist upload byte for byte',()=>{
  const hash=file=>createHash('sha256').update(fs.readFileSync(new URL('../'+file,import.meta.url))).digest('hex');
  assert.equal(hash(audio.slice(1)),hash('Oct 19 at 4-11 AM.m4a'));
});
test('the audiobook cannot enter the catalog, any radio intention, or latest releases',()=>{
  const storage=new Map(),window={};
  const context=vm.createContext({window,URL,URLSearchParams,Date,Math,Uint32Array,
    location:{href:'https://callmedaddy.musicsubject.com/her-story/',origin:'https://callmedaddy.musicsubject.com',search:'',pathname:'/her-story/'},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)}});
  for(const file of ['data/songs.js','data/archive-catalog.js','data/radio-intents.js','data/2026-08-25-uploads.js','data/2026-08-26-uploads.js','data/2026-08-27-uploads.js','data/2026-08-29-uploads.js','catalog-cycle.js','data/briefing.js','latest-releases.js'])vm.runInContext(read(file),context);
  const all=window.CMD_SONGS.flatMap(song=>[song,...(song.variants||[])]);
  assert(!all.some(track=>track.audio===audio));
  const song=window.CMD_SONGS.find(song=>song.id==='her-story');
  assert.equal(song.audio,'/media/songs/2026/10/her-story/audio.mp3');
  assert.deepEqual(Array.from(song.variants,v=>v.id),['opening','main']);
  // A full cycle with this song is deterministic about the recording selected,
  // even when heavy tracks and personal preferences are enabled.
  for(const {id:intent} of window.CMDCatalogCycle.intents){
    const queue=window.CMDCatalogCycle.build([song],{intent,includeHeavy:true,unlockedByTaste:true,seed:'audiobook-exclusion'});
    assert.equal(queue.length,1);
    assert.equal(queue[0].audio,song.audio);
  }
  const latest=window.CMDLatestReleases.build({songs:window.CMD_SONGS,entries:window.CMD_BRIEFING.entries,now:Date.parse('2026-10-20T00:00:00Z')}).tracks;
  assert(!latest.some(track=>track.audio===audio));
});
