import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {loadCatalog} from '../scripts/sync-song-links.mjs';
import {buildCatalog,filterCatalog,makeQueue,shareURL,trackKey,GROUPS} from '../library/model.mjs';
import {buildLibraryCatalog} from '../library/catalog.mjs';
import {ARCHIVE_SONGS} from '../library/archive.mjs';
import {STARMUFF_TRACKS} from '../data/starmuff-playlist.mjs';
import {parseBrief,resolveShortlist,shortlistCSV,detailCoverage} from '../library/discovery.mjs';
import {librarySocial} from '../worker/library.mjs';
const sources=loadCatalog(),catalog=buildLibraryCatalog(sources,STARMUFF_TRACKS),tracks=catalog.flatMap(s=>s.tracks);
test('every published catalogue entry and exact audio version is discoverable, alongside existing archive music',()=>{
 for(const s of [...sources,...ARCHIVE_SONGS,...STARMUFF_TRACKS]){
  const found=catalog.find(x=>x.id===s.id);assert.ok(found,s.id);
  for(const v of s.variants?.some(v=>v.audio)?s.variants.filter(v=>v.audio):s.audio?[{id:'main',audio:s.audio}]:[])assert.equal(found.tracks.find(t=>t.variantId===v.id)?.audio,v.audio);
 }
 assert.equal(new Set(tracks.map(trackKey)).size,tracks.length);
 assert.equal(catalog.length,127);assert.equal(tracks.filter(t=>t.audio).length,169);assert.equal(tracks.filter(t=>t.external).length,4);
 assert.ok(!tracks.some(t=>t.audio?.includes('audiobook')||t.songId==='unwritten-skies-ambience'));
 assert.ok(catalog.every(s=>s.groups.some(id=>GROUPS.some(g=>g.id===id&&g.kind==='mood'))));
});
test('genre search follows the exact version and does not mistake a subject for a genre',()=>{
 assert.ok(!filterCatalog(catalog,{genre:'trap'}).some(s=>s.id==='numbness-as-a-trap'));
 const trap=filterCatalog(catalog,{q:'trap'}).find(s=>s.id==='keep-moving');assert.deepEqual(trap.visibleTracks.map(t=>t.variantId),['trap-mix']);
 const gospel=filterCatalog(catalog,{genre:'gospel'}).find(s=>s.id==='this-is-my-story');assert.deepEqual(gospel.visibleTracks.map(t=>t.variantId),['gospel']);
 assert.ok(filterCatalog(catalog,{genre:'dubstep'}).some(s=>s.id==='canadian-crop-dusting'));
 assert.ok(filterCatalog(catalog,{genre:'hiphop'}).some(s=>s.id==='cheap-to-inform'));
 assert.deepEqual(filterCatalog(catalog,{genre:'country'}).map(s=>s.id).sort(),['ashes-in-eastwood','big-dick-willy']);
});
test('combined filters are strict and unknown durations or vocals do not pass',()=>{
 const result=filterCatalog(catalog,{mood:'motivational',genre:'dubstep',length:'medium'});
 assert.ok(result.length);for(const s of result)for(const t of s.visibleTracks){assert.ok(t.groups.includes('motivational')&&t.groups.includes('dubstep'));assert.ok(t.facts.seconds>120&&t.facts.seconds<=240);}
 assert.equal(filterCatalog(catalog,{group:'starmuff',length:'short'}).length,0);
 assert.ok(filterCatalog(catalog,{q:'no vocals'}).flatMap(s=>s.visibleTracks).every(t=>t.vocals==='instrumental'));
 assert.ok(filterCatalog(catalog,{q:'hopeful without comedy'}).every(s=>s.visibleTracks.every(t=>!t.groups.includes('comedy'))));
});
test('search score reports matched and undocumented criteria instead of inventing quality',()=>{
 const result=filterCatalog(catalog,{q:'hopeful dubstep xylophone'}),first=result[0].visibleTracks[0];
 assert.equal(first.match.score,67);assert.deepEqual(first.match.missing,['xylophone']);assert.equal(first.match.matched.length,2);
 assert.equal(parseBrief('no vocals').vocals,'instrumental');
 const info=detailCoverage(first);assert.ok(info.available<info.total);assert.equal(info.checks.find(x=>x[0]==='Master & publishing clearance')[1],false);
});
test('external versions never inherit a parent audio file or enter playback queues',()=>{
 const external=catalog.find(s=>s.id==='i-need-love').tracks.filter(t=>t.external);assert.equal(external.length,2);assert.ok(external.every(t=>!t.audio));
 const first=tracks.find(t=>t.audio&&!t.manualOnly),queue=makeQueue(catalog,first);assert.ok(queue.every(t=>t.audio&&!t.external));assert.ok(queue.slice(1).every(t=>!t.manualOnly));
 assert.deepEqual(makeQueue(catalog,external[0]),[]);
 assert.ok(!queue.some(t=>['source-vocals','rough-copy'].includes(t.variantId)));
});
test('shortlist shares preserve exact versions and filters, reject unknown keys, and export safe cells',()=>{
 const song=catalog.find(s=>s.id==='big-dick-willy'),keys=song.tracks.map(trackKey),selected=resolveShortlist([...keys,keys[0],'bad:missing'],catalog);assert.equal(selected.length,2);
 const url=new URL(shareURL({mood:'comedy',genre:'country',scene:'comic',length:'short',vocals:'vocal',picks:keys}));assert.deepEqual(url.searchParams.getAll('pick'),keys);assert.equal(url.searchParams.get('genre'),'country');
 const social=librarySocial(url,null);assert.equal(social.canonical,url.href);assert.match(social.title,/Shortlist/);
 const csv=shortlistCSV([{...selected[0],title:'=HYPERLINK("bad")'}],t=>shareURL({track:t}));assert.match(csv,/"'=HYPERLINK/);assert.match(csv,/version=main/);
});
test('archived source recordings and their exact social previews keep their identity',()=>{
 const s=ARCHIVE_SONGS[0],v=s.variants[1],social=librarySocial(new URL(shareURL({track:{songId:s.id,variantId:v.id}})),null);assert.match(social.title,/nuRide Away.*Vocal Fix Cut/);assert.ok(social.image.endsWith('nuride-car.webp'));
});
test('measured facts belong to existing unchanged files and all local recording lengths are measured',()=>{
 for(const t of tracks.filter(t=>t.audio&&!t.audio.startsWith('/media/starmuff/'))){assert.ok(t.facts?.seconds>0,trackKey(t));const file=path.resolve(new URL('..',import.meta.url).pathname,'.'+t.audio);assert.equal(fs.statSync(file).size,t.facts.bytes,trackKey(t)+' changed; run measure-library-audio.mjs');}
});
