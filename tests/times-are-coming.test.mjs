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
const {song,lyrics,update}=JSON.parse(read('content/releases/2026-10-01-times-are-coming.json'));
const page=read('times-are-coming/index.html');

test('Times Are Coming preserves the uploaded recording, embedded artwork and complete lyrics',()=>{
 const source=bytes('Times Are Coming.mp3'),audio=bytes(song.audio.slice(1));
 const hash=b=>createHash('sha256').update(b).digest('hex');
 assert.equal(hash(audio),hash(source));
 assert(source.includes(Buffer.from('228a361c-7ea5-4377-b8e8-f0203a411ae6')));
 assert(source.includes(bytes(song.cover.slice(1))),'the release uses the original embedded cover');
 assert(source.includes(Buffer.from(lyrics.text)),'words and repeated sections match the uploaded lyrics tag');
 assert.equal(song.variants[0].duration,182.424);
 assert.equal(song.sunoUrl,'https://suno.com/song/228a361c-7ea5-4377-b8e8-f0203a411ae6');
 const inline=JSON.parse(page.match(/<script id="releaseLyricsData" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(inline.main,lyrics.text);
 assert.equal((lyrics.text.match(/\[Final Drop\]/g)||[]).length,2);
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
 assert.equal(newest.songId,song.id);assert.equal(newest.variantId,'main');assert.equal(newest.audio,song.audio);
 const social=resolveSocial(`${links.origin}${song.shareUrl}`,buildSongSocial({write:false}));
 assert.equal(new URL(social.image).pathname,song.cover);assert(social.title.includes(song.title));
 assert(read('sitemap.xml').includes(song.experience));assert(read('sitemap.xml').includes(update.sharePath));
 assert(page.includes(`rel="icon" href="${song.cover}"`));
});

test('page and actual-audio sharing select dubstep.bid/64 and retain the earlier dnb link',async()=>{
 const source=read('short-links/runtime.js').replace('/* SONG_LINK_DATA */',JSON.stringify(links));
 const window={};vm.runInNewContext(source,{window,URL,AbortSignal,location:{origin:links.origin},fetch:async()=>({ok:true,json:async()=>({service:'musicsubject-song-links',revision:links.revision})})});
 await window.CMDShortLinks.ready;
 assert.equal(window.CMDShortLinks.forTrack({songId:song.id,variantId:'main',audio:song.audio}),'https://dubstep.bid/64');
 assert.equal(window.CMDShortLinks.forUrl(`${links.origin}${song.shareUrl}`),'https://dubstep.bid/64');
 assert.equal(window.CMDShortLinks.forTrack({songId:'since-before-youtube',variantId:'final'}),'https://dnb.fyi/63');
 const response=handleShortLink(new Request('https://dubstep.bid/64'));
 assert.equal(response.status,302);assert.equal(response.headers.get('location'),`${links.origin}${song.experience}`);
});
