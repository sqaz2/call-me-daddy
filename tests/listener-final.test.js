const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function loadScripts(files,extras={}){
  const storage=new Map();
  const window={};
  const context=vm.createContext({
    window,
    location:{search:extras.search||''},
    localStorage:{
      getItem:key=>storage.has(key)?storage.get(key):null,
      setItem:(key,value)=>storage.set(key,String(value)),
      removeItem:key=>storage.delete(key)
    },
    crypto:{getRandomValues:values=>{values[0]=123456789;values[1]=987654321;return values;}},
    URLSearchParams,Date,Math,Uint32Array,console
  });
  files.forEach(file=>vm.runInContext(read(file),context,{filename:file}));
  return {window,storage};
}

test('swipe helper defaults to a lower threshold and exposes attachMany',()=>{
  const source=read('swipe-nav.js');
  assert.ok(source.includes('threshold=40'));
  assert.ok(!source.includes("ignore.*img")||!/, img/.test(source));
  assert.ok(!source.includes(', img'));
  const sandbox={window:{},console};
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox);
  assert.equal(typeof sandbox.window.CMDSwipeNav.attach,'function');
  assert.equal(typeof sandbox.window.CMDSwipeNav.attachMany,'function');
});

test('music page attaches swipe to cover / player-inner and loads listener scripts',()=>{
  const html=read('music/index.html');
  assert.ok(html.includes('playerWhy'));
  assert.ok(html.includes('catalogLike'));
  assert.ok(html.includes('catalogSearch'));
  assert.ok(html.includes('lineageRail'));
  assert.ok(html.includes('/listener-taste.js'));
  assert.ok(html.includes('/catalog-search.js'));
  assert.ok(html.includes('/data/lineages.js'));
  assert.ok(html.includes('/music/lineages.js'));
  const music=read('music/music.js');
  assert.ok(music.includes('playerCover')||music.includes('cover'));
  assert.ok(music.includes('catalog-player-inner'));
  assert.ok(music.includes('threshold:40'));
  assert.ok(music.includes('renderWhy')||music.includes('playerWhy')||music.includes('whyText'));
});

test('listener taste persists likes and dislikes',()=>{
  const {window,storage}=loadScripts(['listener-taste.js']);
  assert.equal(window.CMDListenerTaste.like('armando'),'like');
  assert.equal(window.CMDListenerTaste.get('armando'),'like');
  assert.equal(window.CMDListenerTaste.weightMultiplier('armando'),1.85);
  assert.equal(window.CMDListenerTaste.dislike('armando'),'dislike');
  assert.equal(window.CMDListenerTaste.weightMultiplier('armando'),0.08);
  assert.ok(storage.get('cmd-listener-taste-v1').includes('armando'));
});

test('catalog search matches titles projects and intent-like tokens',()=>{
  const {window}=loadScripts(['catalog-search.js']);
  const songs=[
    {id:'armando',title:'Armando',project:'Armando',description:'character song',kind:'Single'},
    {id:'under-watch',title:'Under Watch',project:'When Things Got Heavy',kind:'dubstep survival',description:'grunge-pop'},
    {id:'wild-ways',title:'Wild Ways',project:'Old files',aliases:['Wild Ways 2019']}
  ];
  assert.equal(window.CMDCatalogSearch.filterSongs(songs,'armando').length,1);
  assert.equal(window.CMDCatalogSearch.filterSongs(songs,'When Things Got Heavy').length,1);
  assert.equal(window.CMDCatalogSearch.filterSongs(songs,'dubstep').length,1);
  assert.equal(window.CMDCatalogSearch.filterSongs(songs,'nope-xyz').length,0);
  const hints=window.CMDCatalogSearch.buildHints(songs,[{id:'heavy',label:'Give me heavy'}]);
  assert.ok(hints.includes('Armando'));
  assert.ok(hints.some(h=>/heavy/i.test(h)));
});

test('lineage song IDs resolve against the merged catalog',()=>{
  const files=['data/songs.js','data/archive-catalog.js','data/radio-intents.js','data/2026-08-25-uploads.js','data/2026-08-26-uploads.js','data/2026-08-27-uploads.js','data/2026-08-29-uploads.js','data/2026-09-02-uploads.js','data/lineages.js'];
  const {window}=loadScripts(files);
  assert.ok(Array.isArray(window.CMD_LINEAGES));
  assert.ok(window.CMD_LINEAGES.length>=5);
  const ids=new Set(window.CMD_SONGS.map(song=>song.id));
  window.CMD_LINEAGES.forEach(family=>{
    assert.ok(family.songIds?.length,`${family.id} needs songIds`);
    family.songIds.forEach(id=>assert.ok(ids.has(id),`${family.id} unresolved id ${id}`));
  });
});

test('catalog cycle attaches why explanations and respects taste weights',()=>{
  const files=['data/songs.js','data/archive-catalog.js','data/radio-intents.js','data/2026-08-25-uploads.js','data/2026-08-26-uploads.js','data/2026-08-27-uploads.js','listener-taste.js','catalog-cycle.js'];
  const {window}=loadScripts(files);
  window.CMDListenerTaste.like('find-your-people');
  window.CMDListenerTaste.dislike('youtube-W47ebCMfrBI');
  const cycle=window.CMDCatalogCycle.build(window.CMD_SONGS,{intent:'think',seed:'why-route',cycleNumber:1,ignoreHistory:true});
  assert.ok(cycle.length>0);
  assert.ok(cycle.every(track=>Array.isArray(track.why)&&track.why.length));
  assert.ok(cycle.every(track=>String(track.whyText||'').includes('Why this song')));
  const liked=cycle.find(track=>track.songId==='find-your-people');
  assert.ok(liked);
  assert.ok(liked.why.includes('you liked this')||liked.whyText.includes('liked'));
});

test('home page wires continue listening script',()=>{
  const html=read('index.html');
  assert.ok(html.includes('/home-listening.js'));
  assert.ok(read('home-listening.js').includes('cmd-radio-history-v1'));
});

test('wild ways player uses lower swipe threshold on copy/player',()=>{
  const source=read('archive/wild-ways/player.js');
  assert.ok(source.includes('threshold:40'));
  assert.ok(source.includes('archive-player-copy'));
  const html=read('archive/wild-ways/index.html');
  assert.ok(html.includes('swipe-nav.js?v=20260905-listener'));
});
