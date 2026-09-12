import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { loadCatalog } from '../scripts/sync-song-links.mjs';
const source=JSON.parse(fs.readFileSync('content/sources/make-me-an-animal-v6.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('content/releases/2026-09-12-make-me-an-animal-v6.json','utf8'));
const catalog=loadCatalog();
const song=catalog.find(item=>item.id==='make-me-an-animal');
const read=file=>fs.readFileSync(file,'utf8');
test('Animal v6 is one song family, with a new default and all earlier audio preserved',()=>{
  assert.equal(catalog.filter(item=>item.id===song.id).length,1);
  assert.equal(song.variants.length,4);
  assert.equal(song.variants[0].id,'suno-v6');
  assert.equal(song.audio,'/media/songs/2026/09/make-me-an-animal-v6/audio.mp3');
  assert.equal(song.originalYear,2025);
  assert.equal(song.date,'2026-09-12');
  for(const old of source.originalSong.variants){const current=song.variants.find(item=>item.id===old.id);assert.ok(current);assert.equal(current.audio,old.audio);assert.equal(current.cover,old.cover||source.originalSong.cover);assert.equal(current.video,old.video||source.originalSong.video);assert.ok(fs.existsSync('.'+old.audio));}
  assert.ok(fs.existsSync('updates/release-make-me-an-animal/index.html'));
});
test('new recording, artwork and background are exactly the three user uploads',()=>{
  for(const asset of source.assets){const data=fs.readFileSync('.'+asset.path);assert.equal(createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex'),asset.gitBlob);}
  assert.equal(song.sunoUrl,'https://suno.com/s/SAkaHGkSiHPbGl0Q');
  assert.equal(song.variants[0].sunoUrl,song.sunoUrl);
  for(const variant of song.variants.slice(1)) assert.notEqual(variant.audio,song.audio);
});
test('numbered links retain all three old slots and append v6',()=>{
  const registry=JSON.parse(read('content/song-links.json')).songs.find(item=>item.songId===song.id);
  assert.deepEqual(registry.versions.slice(0,3),['edm-switch-up-mix','late-night-warehouse-remastered','may-2026-remastered']);
  assert.equal(registry.versions[3],'suno-v6');
  const rows=JSON.parse(read('data/song-links.json')).rows.filter(item=>item.songId===song.id);
  assert.equal(rows.length,4);
  const current=rows.find(item=>item.version==='suno-v6');assert.equal(current.slot,4);assert.equal(current.audio,song.audio);assert.match(current.target,/version=suno-v6/);
});
test('new release discovery explicitly selects v6 and uses the new cover',()=>{
  assert.match(manifest.update.href,/version=suno-v6/);assert.equal(manifest.update.featured,true);
  assert.match(read('data/briefing.js'),/release-make-me-an-animal-v6/);
  assert.match(read('sitemap.xml'),/https:\/\/callmedaddy.musicsubject.com\/make-me-an-animal-v6\//);
  assert.match(read('updates/release-make-me-an-animal-v6/index.html'),/make-me-an-animal-v6\/cover.png/);
});
test('release page reuses the shared player, keeps video decorative and contains exact-version sharing',()=>{
  const html=read('make-me-an-animal-v6/index.html'),js=read('make-me-an-animal-v6/player.js'),css=read('make-me-an-animal-v6/page.css');
  assert.match(html,/muted loop playsinline preload="none"/);assert.doesNotMatch(html,/<audio[^>]*controls/);
  assert.match(html,/ME AN/);assert.match(html,/with Suno v6/);assert.match(html,/version=suno-v6/);
  assert.match(js,/CMDContinuousPlayback\.create/);assert.match(js,/controller\.load\(0, \{autoplay: true/);assert.match(js,/variantId: variant.id/);assert.match(js,/getMedia/);
  assert.doesNotMatch(js,/addEventListener\(['"]ended/);assert.match(js,/video.muted = true/);assert.match(js,/prefers-reduced-motion/);assert.match(css,/cmd-player-clearance/);
  for(const variant of song.variants)assert.ok(html.includes(`data-animal-version="${variant.id}"`));
});
