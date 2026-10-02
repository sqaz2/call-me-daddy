import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {buildSongSocial} from '../scripts/build-song-social.mjs';
import {resolveSocial} from '../song-social.mjs';
import links from '../worker/song-links-data.mjs';
import {handleShortLink} from '../worker/short-links.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const bytes=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const {song,lyrics,update,previousUpdates}=JSON.parse(read('content/releases/2026-10-01-times-are-coming.json'));
const page=read('times-are-coming/index.html');
const original=song.variants.find(variant=>variant.id==='main');
const mastered=song.variants.find(variant=>variant.id==='mastered');
const hash=b=>createHash('sha256').update(b).digest('hex');

test('Times Are Coming preserves the uploaded recording, embedded artwork and complete lyrics',()=>{
 const source=bytes('Times Are Coming.mp3'),audio=bytes(original.audio.slice(1));
 assert.equal(hash(audio),hash(source));
 assert(source.includes(Buffer.from('228a361c-7ea5-4377-b8e8-f0203a411ae6')));
 assert(source.includes(bytes(song.cover.slice(1))),'the release uses the original embedded cover');
 assert(source.includes(Buffer.from(lyrics.text)),'words and repeated sections match the uploaded lyrics tag');
 assert.equal(original.duration,182.424);
 assert.equal(song.sunoUrl,'https://suno.com/song/228a361c-7ea5-4377-b8e8-f0203a411ae6');
 const inline=JSON.parse(page.match(/<script id="releaseLyricsData" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(inline.main,lyrics.text);
 assert.equal(inline.mastered,lyrics.text);
 assert.equal((lyrics.text.match(/\[Final Drop\]/g)||[]).length,2);
});

test('the new default preserves the mixed and mastered upload and credits the user’s DAW',()=>{
 assert.equal(hash(bytes(mastered.audio.slice(1))),hash(bytes('Times-Are-Coming (1).mp3')));
 assert.notEqual(hash(bytes(mastered.audio.slice(1))),hash(bytes(original.audio.slice(1))));
 assert.equal(mastered.duration,184.248);
 assert.equal(song.variants[0].id,'mastered');
 assert.equal(song.audio,mastered.audio);
 assert.equal(new URL(song.shareUrl,links.origin).searchParams.get('version'),'mastered');
 assert.match(page,/<[^>]+id="production-note"/);
 assert.match(page,/<a\b[^>]*href="https:\/\/generative\.download\/?"[^>]*>generative\.download<\/a>/);
 assert.match(page,/I mixed this song, then mastered it in/);
 assert.match(page,/the DAW I built/);
 const earlier=previousUpdates.find(entry=>entry.id==='release-times-are-coming');
 assert.equal(earlier.variantId,'main');assert.equal(earlier.featured,false);
 assert.equal(earlier.published,'2026-10-01T09:42:49-06:00');
 assert.equal(new URL(earlier.href,links.origin).searchParams.get('version'),'main');
 assert.equal(update.variantId,'mastered');
});

test('song discovery, newest-first playback and social previews resolve the new recording',()=>{
 const window={};const ctx=vm.createContext({window,Date,URL,URLSearchParams,location:{origin:links.origin}});
 for(const f of ['data/songs.js','data/song-lyrics.js','catalog-search.js','data/briefing.js','latest-releases.js'])vm.runInContext(read(f),ctx);
 assert.equal(window.CMD_SONGS.filter(s=>s.id===song.id).length,1);
 for(const query of ['Times Are Coming','Something good is coming',"How've you been?",'The rain lets go']){
  assert(window.CMDCatalogSearch.filterSongs(window.CMD_SONGS,query).some(s=>s.id===song.id),query);
 }
 assert.equal(window.CMD_SONG_LYRICS[song.id].lyrics,lyrics.text);
 const newest=window.CMDLatestReleases.build({songs:window.CMD_SONGS,entries:window.CMD_BRIEFING.entries,now:Date.parse(update.published)}).tracks[0];
 assert.equal(newest.songId,song.id);assert.equal(newest.variantId,'mastered');assert.equal(newest.audio,mastered.audio);
 const firstRelease=window.CMDLatestReleases.build({songs:window.CMD_SONGS,entries:window.CMD_BRIEFING.entries,now:Date.parse(previousUpdates[0].published)}).tracks[0];
 assert.equal(firstRelease.songId,song.id);assert.equal(firstRelease.variantId,'main');assert.equal(firstRelease.audio,original.audio);
 const social=resolveSocial(`${links.origin}${song.shareUrl}`,buildSongSocial({write:false}));
 assert.equal(new URL(social.image).pathname,song.cover);assert(social.title.includes(song.title));
 assert(read('sitemap.xml').includes(song.experience));assert(read('sitemap.xml').includes(update.sharePath));
 assert(page.includes(`rel="icon" href="${song.cover}"`));
});

test('mastered sharing uses dubstep.bid/64/2 while /64 retains the original recording',async()=>{
 const source=read('short-links/runtime.js').replace('/* SONG_LINK_DATA */',JSON.stringify(links));
 const window={};vm.runInNewContext(source,{window,URL,AbortSignal,location:{origin:links.origin},fetch:async()=>({ok:true,json:async()=>({service:'musicsubject-song-links',revision:links.revision})})});
 await window.CMDShortLinks.ready;
 for(const [variant,suffix] of [[original,'64'],[mastered,'64/2']]){
  const expected=`https://dubstep.bid/${suffix}`;
  assert.equal(window.CMDShortLinks.forTrack({songId:song.id,variantId:variant.id,audio:variant.audio}),expected);
  assert.equal(window.CMDShortLinks.forUrl(`${links.origin}${variant.shareUrl}`),expected);
  const response=handleShortLink(new Request(expected)),target=new URL(response.headers.get('location'));
  assert.equal(response.status,302);assert.equal(target.origin,links.origin);
  assert.equal(target.pathname,'/music/');assert.equal(target.searchParams.get('song'),song.id);
  assert.equal(target.searchParams.get('version'),variant.id);assert.equal(target.searchParams.get('share'),'1');
 }
 assert.equal(window.CMDShortLinks.forUrl(`${links.origin}${song.shareUrl}`),'https://dubstep.bid/64/2');
 assert.deepEqual(JSON.parse(read('content/song-links.json')).songs.find(row=>row.songId===song.id).versions,['main','mastered']);
 assert.equal(window.CMDShortLinks.forTrack({songId:song.id,variantId:'main',audio:mastered.audio}),'https://dubstep.bid/64/2','the actual recording wins over stale version metadata');
 assert.equal(window.CMDShortLinks.forTrack({songId:'since-before-youtube',variantId:'final'}),'https://dnb.fyi/63');
});
