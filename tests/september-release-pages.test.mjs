import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+p,import.meta.url))).digest('hex');
const manifests=['nobody-wants-to-listen','8-walmart-parking-lot'].map(id=>JSON.parse(read(`content/releases/2026-09-29-${id}.json`)));
const sources={
 main:'Nobody Wants to Listen.mp3',
 'beat-2':'Nobody Wants to Listen (beat 2) .mp3',
 chant:'I Can Make Music — Chant.mp3',
 'extended-hook':'music with the devil — extended hook.mp3',
 'extended-hook-remix':'music with the devil — extended hook (Remix).mp3',
 remastered:'8 (walmart Parking Lot) (Remastered).mp3'
};
test('all uploaded recordings stay byte-for-byte intact under two song identities',()=>{
 const box={window:{}};vm.createContext(box);vm.runInContext(read('data/songs.js'),box);
 assert.equal(manifests[0].song.variants.length,5);
 assert.equal(manifests[1].song.variants.length,1);
 assert(manifests[0].song.aliases.includes('Music with the Devil'));
 assert.equal(box.window.CMD_SONGS.some(s=>s.id==='music-with-the-devil'||s.id==='i-can-make-music'),false);
 for(const {song} of manifests){
  assert.equal(box.window.CMD_SONGS.filter(s=>s.id===song.id).length,1);
  for(const v of song.variants){
   assert.equal(hash(v.audio.slice(1)),hash(sources[v.id]));
   const cover=fs.readFileSync(new URL('..'+v.cover,import.meta.url));
   assert.equal(cover.subarray(0,2).toString('hex'),'ffd8');assert(cover.length>1000);
   assert.equal(v.shareUrl,`${song.experience}?version=${v.id}`);
  }
 }
});
test('each selectable recording has its own released lyrics and artwork',()=>{
 for(const {song} of manifests){
  const html=read(song.experience.slice(1)+'index.html');
  const lyrics=JSON.parse(html.match(/<script id="releaseLyricsData" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  for(const v of song.variants){assert(lyrics[v.id]);assert(html.includes(`data-cut="${v.id}"`));assert(html.includes(v.cover));assert(html.includes(v.shareUrl))}
  if(song.id==='nobody-wants-to-listen'){
   assert(lyrics.main.includes('The machine learned how to listen\nbefore anybody else did.'));
   assert(lyrics['beat-2'].includes("So I'm making music about nobody listen\n"));
   assert(lyrics.chant.includes('so im making music about nobody listening'));
   assert.notEqual(lyrics['extended-hook'],lyrics['extended-hook-remix']);
  }else assert(lyrics.remastered.includes("Now I'm woworking\non this song."));
 }
});
test('both pages use the existing shared playback and permanent version links',()=>{
 const registry=JSON.parse(read('content/song-links.json'));
 for(const {song} of manifests){
  const html=read(song.experience.slice(1)+'index.html');
  assert(html.includes('preload="none" hidden'));
  assert(html.indexOf('/continuous-playback.js')<html.indexOf('/release-page/player.js'));
  assert(html.indexOf('/playlist-radio.js')<html.indexOf('/release-page/player.js'));
  const link=registry.songs.find(s=>s.songId===song.id);assert(link);
  assert.deepEqual(link.versions,song.variants.map(v=>v.id));
 }
});
