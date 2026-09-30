import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const box={window:{},URL,URLSearchParams,Date,console,location:{origin:"https://callmedaddy.musicsubject.com"}};vm.createContext(box);
for(const path of ['data/songs.js','data/archive-catalog.js','data/2026-08-25-uploads.js','data/2026-08-26-uploads.js','data/2026-08-27-uploads.js','data/2026-08-29-uploads.js','data/briefing.js','latest-releases.js'])vm.runInContext(read(path),box);
const song=box.window.CMD_SONGS.find(s=>s.id==='2010-wows');
test('2010 WOWS remains one song with three local recordings and the positive source',()=>{
 assert.equal(box.window.CMD_SONGS.filter(s=>s.id==='2010-wows').length,1);
 assert.equal(box.window.CMD_SONGS.some(s=>s.id==='close-my-eyes'),false);
 assert.equal(song.variants.length,3);
 assert.equal(song.variants.find(v=>v.id==='special-2026-remix').audio,'/media/archive/2010-wows/2026/special-remix.mp3');
 assert.equal(song.experience,'/archive/2010-wows/');
 assert.equal(song.positiveSunoUrl,'https://suno.com/s/Zooqq8Q9KsTbnAjw');
 const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+p,import.meta.url))).digest('hex');
 assert.equal(hash(song.variants.find(v=>v.id==='close-my-eyes-ai-mix').audio.slice(1)),hash('Close My Eyes 2010 Special 2026 ai-mix.mp3'));
 assert.equal(hash(song.audio.slice(1)),hash('2010 Wows (Gangster as Fuck Remix).mp3'));
});
test('earlier Close My Eyes announcement keeps its exact version and numbered share slot',()=>{
 const entry=box.window.CMD_BRIEFING.entries.find(e=>e.id==='2010-wows-close-my-eyes');
 assert.equal(entry.songId,'2010-wows');assert.equal(entry.variantId,'close-my-eyes-ai-mix');
 const result=box.window.CMDLatestReleases.build({songs:box.window.CMD_SONGS,entries:[entry],now:Date.parse('2026-09-30T02:00:00Z')});
 assert.equal(result.tracks.length,1);assert.equal(result.tracks[0].variantId,entry.variantId);
 const registry=JSON.parse(read('content/song-links.json'));
 const link=registry.songs.find(s=>s.songId==='2010-wows');
 assert.equal(link.number,2);assert.equal(link.versions[0],'special-2026-remix');assert.equal(link.versions[1],'close-my-eyes-ai-mix');
 assert.equal(link.versions[2],'gangster-as-fuck-remix');
});
test('new remix and earlier announcement retain distinct version links and artwork',()=>{
 const current=box.window.CMD_BRIEFING.entries.find(e=>e.id==='2010-wows-gangster-remix');
 const earlier=box.window.CMD_BRIEFING.entries.find(e=>e.id==='2010-wows-close-my-eyes');
 assert.equal(current.variantId,'gangster-as-fuck-remix');assert.equal(current.featured,true);assert.equal(earlier.featured,false);
 const result=box.window.CMDLatestReleases.build({songs:box.window.CMD_SONGS,entries:[current],now:Date.parse('2026-09-30T04:00:00Z')});
 assert.equal(result.tracks.length,1);assert.equal(result.tracks[0].variantId,current.variantId);
 for(const entry of [current,earlier]){
  const html=read(`updates/${entry.id}/index.html`);
  assert.ok(html.includes(`version=${entry.variantId}&amp;intent=`));
  assert.ok(html.includes(entry.cover));
  assert.ok(read('sitemap.xml').includes(entry.sharePath));
 }
});
