import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {loadCatalog} from '../scripts/sync-song-links.mjs';
import {buildLibraryCatalog} from '../library/catalog.mjs';
import links from '../worker/song-links-data.mjs';
import {handleShortLink} from '../worker/short-links.mjs';

const bytes=path=>fs.readFileSync(new URL('../'+path,import.meta.url));
const read=path=>bytes(path).toString('utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
const {song,lyrics}=JSON.parse(read('content/releases/2026-10-22-calculated-grind.json'));
const page=read('calculated-grind/index.html');
const original=song.variants.find(variant=>variant.id==='main');
const short=song.variants.find(variant=>variant.id==='short-version');

test('Calculated Grind exposes both supplied short recordings without restoring the removed long mix',()=>{
 assert.deepEqual(song.variants.map(variant=>variant.id),['main','short-version']);
 assert.equal(song.audio,original.audio,'the two-minute recording remains the default');
 assert.equal(original.duration,120.024);
 assert.equal(short.duration,114.024,'use the measured upload duration, not an estimated label');
 assert.equal(short.audio,'/media/songs/2026/10/calculated-grind/short-version.mp3');
 assert.equal(hash(bytes(original.audio.slice(1))),hash(bytes('Calculated Grind (2min).mp3')));
 assert.equal(hash(bytes(short.audio.slice(1))),hash(bytes('Calculated Grind (1m54).mp3')));
 assert.notEqual(hash(bytes(short.audio.slice(1))),hash(bytes(original.audio.slice(1))));
 assert.ok(song.variants.every(variant=>variant.id!=='focused-trap'&&!variant.audio.endsWith('/focused-trap.mp3')));
});

test('the shared catalogue and library resolve the replacement audio with its measured facts',()=>{
 const sources=loadCatalog(),published=sources.filter(item=>item.id===song.id);
 assert.equal(published.length,1);
 assert.deepEqual(published[0].variants.map(variant=>({id:variant.id,audio:variant.audio,duration:variant.duration})),song.variants.map(variant=>({id:variant.id,audio:variant.audio,duration:variant.duration})));
 const entry=buildLibraryCatalog(sources,[]).find(item=>item.id===song.id);
 assert.deepEqual(entry.tracks.map(track=>track.variantId),['main','short-version']);
 for(const variant of [original,short]){
  const track=entry.tracks.find(item=>item.variantId===variant.id);
  assert.equal(track.audio,variant.audio);
  assert.ok(Math.abs(track.facts.seconds-variant.duration)<0.01);
  assert.equal(track.facts.bytes,bytes(variant.audio.slice(1)).length);
 }
});

test('exact-version sharing preserves slot one, reserves removed slot two and assigns the replacement slot three',async()=>{
 const registry=JSON.parse(read('content/song-links.json')).songs.find(item=>item.songId===song.id);
 assert.equal(registry.number,76);
 assert.deepEqual(registry.versions,['main','focused-trap','short-version']);
 assert.deepEqual(links.rows.filter(row=>row.songId===song.id).map(row=>[row.slot,row.version]),[[1,'main'],[3,'short-version']]);
 const window={};
 vm.runInNewContext(read('short-links/runtime.js').replace('/* SONG_LINK_DATA */',JSON.stringify(links)),{
  window,URL,AbortSignal,location:{origin:links.origin},
  fetch:async()=>({ok:true,json:async()=>({service:'musicsubject-song-links',revision:links.revision})})
 });
 await window.CMDShortLinks.ready;
 for(const [variant,suffix] of [[original,'76'],[short,'76/3']]){
  const url=`https://hiphop.bid/${suffix}`;
  assert.equal(window.CMDShortLinks.forTrack({songId:song.id,variantId:variant.id,audio:variant.audio}),url);
  assert.equal(window.CMDShortLinks.forUrl(`${links.origin}${variant.shareUrl}`),url);
  const response=handleShortLink(new Request(url));
  assert.equal(response.status,302);
  const target=new URL(response.headers.get('location'));
  assert.equal(target.origin,links.origin);
  assert.equal(target.pathname,'/calculated-grind/');
  assert.equal(target.searchParams.get('version')||'main',variant.id);
 }
 assert.equal(handleShortLink(new Request('https://hiphop.bid/76/2')).status,404,'an old long-mix link must not silently become another recording');
 assert.equal(window.CMDShortLinks.forTrack({songId:song.id,variantId:'main',audio:short.audio}),'https://hiphop.bid/76/3','the actual audio wins over stale version metadata');
});

test('mobile visitors can choose either recording beside the artwork using the shared player',()=>{
 const stage=page.indexOf('class="release-stage"'),cover=page.indexOf('id="releasePlay"');
 assert.ok(stage>=0&&cover>stage);
 const selector=page.slice(stage,cover);
 for(const variant of [original,short])assert.ok(selector.includes(`data-cut="${variant.id}"`),`${variant.id} is selectable before the artwork`);
 assert.equal((page.match(/data-cut=/g)||[]).length,2);
 assert.ok(page.includes('1:54'));
 assert.equal((page.match(/<audio\b/g)||[]).length,1);
 assert.ok(!/<audio[^>]*controls/.test(page));
 assert.ok(page.includes('/universal-player.js'));
 assert.ok(page.indexOf('/continuous-playback.js')<page.indexOf('/release-page/player.js'));
 assert.ok(page.includes('data-song-id="calculated-grind"'));
});

test('adding the replacement preserves the artist-supplied lyrics and keeps their version attribution',()=>{
 assert.equal(hash(lyrics.text),'1a6f36bff9402361cf631076643caa0aceba76fec9afd1a9c47dc22b641a8d1e');
 const inline=JSON.parse(page.match(/<script id="releaseLyricsData" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(inline.main,lyrics.text);
 assert.match(page,/<pre\b(?=[^>]*\bid="releaseLyrics")(?=[^>]*\bdata-lyrics-version="main")[^>]*>/);
 assert.equal(inline['short-version'],undefined,'the replacement must not be assigned unverified recording-specific lyrics');
 const window={};vm.runInNewContext(read('data/song-lyrics.js'),{window});
 assert.equal(window.CMD_SONG_LYRICS[song.id].lyrics,lyrics.text);
});
