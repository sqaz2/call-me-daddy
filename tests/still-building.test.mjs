import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('Still Building ships two real V6 recordings under existing song identities',()=>{
  const context={window:{CMD_SONGS:[],CMD_RADIO_CONFIG:{profiles:{}},CMD_SAD_MUSIC:[]}};
  vm.createContext(context);
  vm.runInContext(read('data/songs.js'),context);
  vm.runInContext(read('data/sad-music.js'),context);
  vm.runInContext(read('data/2026-08-25-uploads.js'),context);
  const sound=context.window.CMD_SONGS.find(song=>song.id==='stomp-clamp');
  const survival=context.window.CMD_SONGS.find(song=>song.id==='survival-mode');
  assert.equal(sound.title,'I Need That Sound');
  assert.ok(sound.aliases.includes('Stomp Clamp'));
  assert.ok(sound.variants.some(version=>version.id==='suno-v6-remix'));
  assert.ok(survival.variants.some(version=>version.id==='suno-v6-remix'));
  for(const song of [sound,survival])for(const version of song.variants)assert.ok(fs.existsSync(new URL(`..${version.audio}`,import.meta.url)),version.audio);
});

test('Still Building page starts both recordings and stays on the shared player',()=>{
  const html=read('still-building/index.html'),script=read('still-building/player.js');
  assert.match(html,/data\/2026-08-25-uploads\.js/);
  assert.match(html,/survival-mode-background\.mp4/);
  assert.match(html,/survival-mode-v6\.jpg/);
  assert.match(html,/data-play="stomp-clamp"/);
  assert.match(html,/data-play="survival-mode"/);
  assert.match(html,/id="buildingAudio"/);
  assert.match(html,/continuous-playback\.js/);
  assert.match(script,/CMDContinuousPlayback/);
  assert.doesNotMatch(html,/<audio[^>]*controls/);
});
