const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const sandbox={window:{}};
vm.createContext(sandbox);
[
  'data/songs.js',
  'data/archive-catalog.js',
  'data/radio-intents.js',
  'data/2026-08-25-uploads.js',
  'data/briefing.js',
  'data/2026-08-26-uploads.js',
  'data/2026-08-27-uploads.js',
  'data/2026-08-29-uploads.js'
].forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file}));

const songs=sandbox.window.CMD_SONGS;
const feed=sandbox.window.CMD_BRIEFING;
const profiles=sandbox.window.CMD_RADIO_CONFIG.profiles;
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('August 29 upload families stay together',()=>{
  const keep=songs.find(song=>song.id==='keep-moving');
  const thirty=songs.find(song=>song.id==='thirty-six');
  const brick=songs.find(song=>song.id==='one-brick');
  assert.ok(keep);
  assert.ok(thirty);
  assert.ok(brick);
  assert.deepEqual(Array.from(keep.variants,version=>version.id),['v2','trap-mix']);
  assert.deepEqual(Array.from(thirty.variants,version=>version.id),['main']);
  assert.ok(thirty.aliases.includes('Running Out of Versions'));
  assert.deepEqual(Array.from(brick.variants,version=>version.id),['barbershop-dubstep-acappella','extended-v1']);
  assert.ok(brick.aliases.includes('One Brick at a Time'));
  assert.equal(new Set(songs.map(song=>song.id)).size,songs.length);
});

test('August 29 songs have radio profiles',()=>{
  assert.equal(profiles['keep-moving']['level-up'],100);
  assert.equal(profiles['thirty-six'].think,100);
});

test('August 29 feed entries are ordered and shareable',()=>{
  assert.equal(feed.entries[0].id,'release-keep-moving');
  assert.equal(feed.entries[0].featuredOrder,1);
  assert.equal(feed.entries[1].id,'release-thirty-six');
  assert.equal(feed.entries[1].featuredOrder,2);
  assert.equal(feed.entries.find(entry=>entry.id==='archive-wild-ways').featuredOrder,3);
  const brickUpdate=feed.entries.find(entry=>entry.id==='one-brick-extended-v1');
  assert.ok(brickUpdate);
  assert.equal(brickUpdate.songId,'one-brick');
  assert.equal(brickUpdate.featured,undefined);
  ['release-keep-moving','release-thirty-six','one-brick-extended-v1'].forEach(id=>{
    const page=path.join(root,'updates',id,'index.html');
    assert.ok(fs.existsSync(page),`${id} needs a static update page`);
    const html=fs.readFileSync(page,'utf8');
    assert.match(html,/property="og:title"/);
    assert.match(html,/property="og:description"/);
    assert.match(html,/property="og:url"/);
    assert.ok(read('sitemap.xml').includes(`https://callmedaddy.musicsubject.com/updates/${id}/`));
  });
});

test('August 29 raw uploads were moved into media folders',()=>{
  [' Keep Moving (Trap Mix) (1).mp3','keep moving (v2).mp3','Thirty Six (1).mp3','one brick at a time (EXTENDED v1) (1).mp3']
    .forEach(file=>assert.equal(fs.existsSync(path.join(root,file)),false,`${file} should not remain at repository root`));
  ['media/songs/2026/08/keep-moving/v2.mp3','media/songs/2026/08/keep-moving/trap-mix.mp3','media/songs/2026/08/thirty-six/main.mp3','media/songs/2026/08/one-brick/extended-v1.mp3']
    .forEach(file=>assert.ok(fs.existsSync(path.join(root,file)),`${file} should exist`));
});

test('public entry points load the August 29 extension',()=>{
  ['index.html','music/index.html','updates/index.html'].forEach(file=>{
    assert.ok(read(file).includes('/data/2026-08-29-uploads.js?v=20260829-1'),`${file} needs August 29 uploads`);
  });
});
