import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {buildSongSocial} from '../scripts/build-song-social.mjs';
import {resolveSocial} from '../song-social.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const manifest=JSON.parse(read('content/releases/2026-09-30-since-before-youtube.json'));
const {song,lyrics,update}=manifest;
const page=read('since-before-youtube/index.html');
test('the final upload keeps its exact audio and verified Suno song identity',()=>{
 const bytes=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
 const hash=p=>createHash('sha256').update(bytes(p)).digest('hex');
 assert.equal(hash(song.audio.slice(1)),hash('since before YouTube .mp3'));
 assert(bytes(song.audio.slice(1)).includes(Buffer.from('f36cd380-558e-4ed4-a539-e16ffe77d1ef')));
 assert.equal(song.sunoUrl,'https://suno.com/s/LwgadsoEOqZGTwPK');
 assert.equal(song.variants.length,1);assert.equal(song.variants[0].id,'final');assert.equal(song.variants[0].duration,120.432);
 assert.equal(bytes(song.cover.slice(1)).subarray(0,2).toString('hex'),'ffd8');
});
test('title, aliases and final lyrics all find the same catalog song',()=>{
 const window={};const ctx=vm.createContext({window});
 for(const file of ['data/songs.js','data/song-lyrics.js','catalog-search.js'])vm.runInContext(read(file),ctx);
 assert.equal(window.CMD_SONGS.filter(s=>s.id===song.id).length,1);
 for(const query of ['since before YouTube','Before YouTube','Tell me something that I don’t know','Hit the wrong damn button','You finding me now don’t mean I just got here']){
  assert(window.CMDCatalogSearch.filterSongs(window.CMD_SONGS,query).some(s=>s.id===song.id),query);
 }
 const words=JSON.parse(page.match(/<script id="releaseLyricsData" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(words.final,lyrics.text);assert.equal(window.CMD_SONG_LYRICS[song.id].lyrics,lyrics.text);
 assert(lyrics.text.endsWith('It ain’t new— It’s new to you'));
});
test('the exact final version owns its artwork, social links and new announcement',()=>{
 const social=resolveSocial('https://callmedaddy.musicsubject.com/since-before-youtube/?version=final',buildSongSocial({write:false}));
 assert.equal(new URL(social.image).pathname,song.cover);assert(social.title.includes(song.title));
 const registry=JSON.parse(read('content/song-links.json'));const row=registry.songs.find(s=>s.songId===song.id);
 assert.equal(row.number,63);assert.deepEqual(row.versions,['final']);
 const window={};const ctx=vm.createContext({window,Date,URL,URLSearchParams,location:{origin:'https://callmedaddy.musicsubject.com'}});
 for(const file of ['data/songs.js','data/briefing.js','latest-releases.js'])vm.runInContext(read(file),ctx);
 const entry=window.CMD_BRIEFING.entries.find(e=>e.id===update.id);
 assert(entry.featured);assert.equal(entry.variantId,'final');
 const newest=window.CMDLatestReleases.build({songs:window.CMD_SONGS,entries:[entry],now:Date.parse('2026-10-01T00:00:00Z')}).tracks;
 assert.equal(newest.length,1);assert.equal(newest[0].audio,song.audio);assert.equal(newest[0].variantId,'final');
 assert(read('sitemap.xml').includes(song.experience));assert(read('sitemap.xml').includes(update.sharePath));
 assert(page.includes(`rel="icon" href="${song.cover}"`));
});
test('the page preserves the drive-through note and uses the existing continuous player',()=>{
 assert(page.includes('I&#x27;ve been in the McDonald&#x27;s drive-through while I got this page built. That&#x27;s how slow the line was moving.'));
 assert(page.includes('preload="none" hidden'));
 assert(page.indexOf('/continuous-playback.js')<page.indexOf('/release-page/player.js'));
 assert(page.includes('data-song-id="since-before-youtube"'));
 assert(page.includes('id="releaseShare"'));
 assert(page.includes('https://suno.com/s/LwgadsoEOqZGTwPK'));
});
