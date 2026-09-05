const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const fallback='/media/site/image-coming-soon.jpg';
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('fallback artwork fills only missing song covers',()=>{
  const sandbox={window:{CMD_SONGS:[
    {id:'missing',cover:''},
    {id:'real',cover:'/media/real-cover.jpg'}
  ],CMD_BRIEFING:{entries:[{id:'a',songId:'missing'},{id:'b',songId:'real'}]}}};
  vm.createContext(sandbox);
  vm.runInContext(read('data/artwork-fallback.js'),sandbox);
  assert.equal(sandbox.window.CMD_SONGS[0].cover,fallback);
  assert.equal(sandbox.window.CMD_SONGS[0].coverIsFallback,true);
  assert.equal(sandbox.window.CMD_SONGS[1].cover,'/media/real-cover.jpg');
  assert.equal(sandbox.window.CMD_BRIEFING.entries[0].cover,fallback);
  assert.equal(sandbox.window.CMD_BRIEFING.entries[1].cover,'/media/real-cover.jpg');
});

test('site entry points use a real share preview and load artwork fallback',()=>{
  const placeholder='https://callmedaddy.musicsubject.com/media/site/image-coming-soon.jpg';
  ['index.html','music/index.html','updates/index.html'].forEach(file=>{
    const html=read(file);
    assert.ok(html.includes('property="og:image"'),`${file} should declare og:image`);
    assert.equal(html.includes(`content="${placeholder}"`),false,`${file} should not use the placeholder as OG/Twitter preview`);
    assert.ok(html.includes('/data/artwork-fallback.js?v=20260829-1'),`${file} should load the artwork fallback before rendering`);
  });
});

test('uploaded placeholder is stored once and root upload is cleaned',()=>{
  assert.ok(fs.existsSync(path.join(root,'media/site/image-coming-soon.jpg')));
  assert.equal(fs.existsSync(path.join(root,'grok_1788007267974.jpg')),false);
});

test('playlist radio gives missing artwork the same fallback',()=>{
  const source=read('playlist-radio.js');
  assert.ok(source.includes("'/media/site/image-coming-soon.jpg'"));
  assert.ok(source.includes('song.cover=fallbackCover'));
});

test('placeholder artwork is visibly subdued without changing real covers',()=>{
  const css=read('placeholder-art.css');
  const js=read('placeholder-art.js');
  assert.match(css,/\.song-card\.is-placeholder-cover \.song-cover/);
  assert.match(css,/\.release-card\.is-placeholder-cover img/);
  assert.match(css,/opacity:\s*\.16/);
  assert.match(css,/\.catalog-player\.is-placeholder-cover \.player-cover/);
  assert.ok(js.includes("'/media/site/image-coming-soon.jpg'"));
  assert.ok(js.includes("label.textContent='Cover coming soon'"));
  assert.ok(js.includes('MutationObserver'));
  ['index.html','music/index.html'].forEach(file=>{
    const html=read(file);
    assert.ok(html.includes('/placeholder-art.css?v=20260901-1'),`${file} should load placeholder styling`);
    assert.ok(html.includes('/placeholder-art.js?v=20260901-1'),`${file} should load placeholder detection`);
  });
});
