import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadCatalog} from '../scripts/sync-song-links.mjs';
import {buildLibraryCatalog} from '../library/catalog.mjs';
import {buildCatalog,filterCatalog,GROUPS} from '../library/model.mjs';
import {GENRE_FAMILIES,expandGenreFamilies,genreLabels} from '../library/genres.mjs';
import {RECORDING_GENRES} from '../library/recording-genres.mjs';
const catalog=buildLibraryCatalog(loadCatalog());
const track=(id,version)=>catalog.find(s=>s.id===id).tracks.find(t=>!version||t.variantId===version);
test('every genre belongs to one visible family and parent classification is transitive',()=>{
 const ids=GENRE_FAMILIES.flatMap(f=>f.genres);assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(ids.sort(),GROUPS.filter(g=>g.kind==='genre').map(g=>g.id).sort());
 assert.deepEqual(expandGenreFamilies(['bass-house']),['bass-house','house','edm']);
 assert.deepEqual(expandGenreFamilies(['trap','hiphop']),['trap','hiphop']);
});
test('45 newly classified recordings have an exact MP3-to-source match',()=>{
 const sources=JSON.parse(fs.readFileSync('content/sources/library-genres-2026-10-24.json')).recordings;
 assert.equal(Object.keys(RECORDING_GENRES).length,45);
 for(const [audio,entry] of Object.entries(RECORDING_GENRES)){
  const source=sources.find(s=>s.audio===audio),t=catalog.flatMap(s=>s.tracks).find(t=>t.audio===audio);
  assert.ok(source&&t,audio);assert.ok(source.clipIds.includes(entry.clipId));
  assert.equal(entry.sourceUrl,'https://suno.com/song/'+entry.clipId);
  assert.ok(entry.genres.every(id=>t.genres.includes(id)));assert.ok(t.genreKnown);assert.ok(t.genreSourceUrl);
 }
 assert.equal(catalog.flatMap(s=>s.tracks).filter(t=>!t.genreKnown).length,0);
});
test('rap, techno, dubstep and house are searchable alongside lyrical moods',()=>{
 for(const [q,id] of [['techno','friction-the-what'],['rap','live-it-right'],['dubstep vulnerable','come-sit-here-with-me'],['winning dubstep','power-moves-only'],['bass house comedy','side-chick-finder'],['boom bap','find-your-people']])assert.ok(filterCatalog(catalog,{q}).some(s=>s.id===id),q);
 assert.ok(filterCatalog(catalog,{genre:'techno'}).some(s=>s.id==='broke-my-mug-not-my-song'));
 assert.ok(filterCatalog(catalog,{genre:'house',mood:'comedy'}).some(s=>s.id==='side-chick-finder'));
 assert.ok(track('side-chick-finder').genres.includes('edm'));
 assert.match(genreLabels(track('side-chick-finder'),GROUPS),/House.*Bass house.*Electronic/);
});
test('exact recordings retain different styles, and lyric subjects do not become genres',()=>{
 assert.ok(track('cloudlife','life-of-a-cloud').genres.includes('rock'));
 assert.ok(!track('cloudlife','life-of-a-cloud').genres.includes('rnb'));
 assert.ok(track('cloudlife','r-and-b-mix').genres.includes('rnb'));
 assert.ok(track('where-monsters-are','monster-and-maiden').genres.includes('dubstep'));
 assert.ok(!track('where-monsters-are','monster-and-maiden').genres.includes('dnb'));
 assert.ok(track('stomp-clamp','suno-v6-remix').genres.includes('blues'));
 assert.ok(!track('stomp-clamp','suno-v6-remix').genres.includes('techno'));
 assert.ok(track('numbness-as-a-trap','may-2026-remix').genres.includes('techno'));
 assert.ok(!track('numbness-as-a-trap','may-2026-remix').genres.includes('hiphop'));
 assert.deepEqual(track('this-is-my-story','gospel').genres,['gospel']);
 assert.deepEqual(track('did-armando-die-after-you-held-his-beer','earlier').genres,['dubstep','edm']);
 assert.deepEqual(track('archive-crocodile-shoes','rough-copy').genres,['pop']);
 assert.deepEqual(track('shooting-star','2019-cut').genres,['edm']);
 assert.deepEqual(track('the-loudest-one-in-my-head','remix').genres,['pop']);
 assert.deepEqual(track('i-need-love','2024-reimagined').genres,['pop']);
 assert.ok(track('i-need-love','dubstep-cinematic-terror').genres.includes('dubstep'));
 assert.ok(!track('i-need-love','busker-mix-1').genres.includes('dubstep'));
 assert.match(track('archive-nuride-away','source-vocals').genreSource,/tentative/);
 const sample=buildCatalog([{id:'title-test',title:'Techno House Trap',audio:'/not-real.mp3',kind:'song'}]);assert.equal(sample[0].tracks[0].genreKnown,false);
});
