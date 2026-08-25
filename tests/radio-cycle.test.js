const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const sourceFiles=[
  'data/songs.js',
  'data/archive-catalog.js',
  'data/radio-intents.js',
  'data/2026-08-25-uploads.js',
  'catalog-cycle.js'
];

function loadRadio(search=''){
  const storage=new Map();
  const window={};
  const context=vm.createContext({
    window,
    location:{search},
    localStorage:{
      getItem:key=>storage.has(key)?storage.get(key):null,
      setItem:(key,value)=>storage.set(key,String(value))
    },
    crypto:{getRandomValues:values=>{values[0]=123456789;values[1]=987654321;return values;}},
    URLSearchParams,
    Date,
    Math,
    Uint32Array
  });
  sourceFiles.forEach(file=>{
    const source=fs.readFileSync(path.join(root,file),'utf8');
    vm.runInContext(source,context,{filename:file});
  });
  return {window,storage};
}

function build(search='',options={}){
  const {window}=loadRadio(search);
  const cycle=window.CMDCatalogCycle.build(window.CMD_SONGS,{
    intent:'surprise',
    seed:'route-test-42',
    cycleNumber:1,
    ignoreHistory:true,
    ...options
  });
  return {window,cycle};
}

const ids=cycle=>Array.from(cycle,track=>track.songId);

test('the same intention and seed rebuild the same route and versions',()=>{
  const first=build('',{intent:'laugh',seed:'same-route'}).cycle;
  const second=build('',{intent:'laugh',seed:'same-route'}).cycle;
  assert.deepEqual(
    Array.from(first,track=>[track.songId,track.variantId]),
    Array.from(second,track=>[track.songId,track.variantId])
  );
});

test('a cycle contains each playable song identity once',()=>{
  const {window,cycle}=build('',{intent:'surprise'});
  const playable=window.CMD_SONGS.filter(song=>window.CMDCatalogCycle.variants(song).length);
  assert.equal(cycle.length,playable.length);
  assert.equal(new Set(ids(cycle)).size,cycle.length);
});

test('August 25 uploads are catalogued and song families stay grouped',()=>{
  const {window}=loadRadio();
  ['where-monsters-are','hard-earned-light','survival-mode','the-tune-of-magical-song','side-chick-finder','one-brick'].forEach(id=>{
    assert.ok(window.CMD_SONGS.some(song=>song.id===id),`${id} should exist`);
  });
  const oneBrick=window.CMD_SONGS.find(song=>song.id==='one-brick');
  assert.equal(oneBrick.variants.length,1);
  const monsters=window.CMD_SONGS.find(song=>song.id==='where-monsters-are');
  assert.equal(monsters.variants.length,1);
  const magical=window.CMD_SONGS.find(song=>song.id==='the-tune-of-magical-song');
  assert.equal(magical.variants.length,1);
  const numbness=window.CMD_SONGS.find(song=>song.id==='numbness-as-a-trap');
  assert.equal(numbness.variants.length,3);
  assert.ok(numbness.variants.some(version=>version.id==='barbershop-wobble-edit'));
});

test('Level me up protects the trilogy order and skips unavailable audio',()=>{
  const {cycle}=build('',{intent:'level-up'});
  assert.deepEqual(ids(cycle).slice(0,2),['back-to-sticks','level-up']);
  assert.ok(!ids(cycle).includes('the-musician-police'));
});

test('Make me think protects the intended three-song rise',()=>{
  const {cycle}=build('',{intent:'think'});
  assert.deepEqual(ids(cycle).slice(0,3),[
    'hell-has-people-too',
    'cut-from-the-same-fabric-instrumental',
    'find-your-people'
  ]);
});

test('Give me heavy moves from defeat through numbness to pushback',()=>{
  const {cycle}=build('',{intent:'heavy'});
  assert.deepEqual(ids(cycle).slice(0,3),[
    'never-come-back-down',
    'numbness-as-a-trap',
    'will-to-live'
  ]);
});

test('Show old files opens with the protected memory route',()=>{
  const {cycle}=build('',{intent:'old-files'});
  assert.deepEqual(ids(cycle).slice(0,3),[
    '2010-wows',
    'i-need-love',
    'i-wont-let-the-wifi-go'
  ]);
});

test('alternate versions rotate deterministically between cycles',()=>{
  const {window}=loadRadio();
  const base={intent:'heavy',seed:'variant-route',ignoreHistory:true};
  const first=window.CMDCatalogCycle.build(window.CMD_SONGS,{...base,cycleNumber:1});
  const second=window.CMDCatalogCycle.build(window.CMD_SONGS,{...base,cycleNumber:2});
  const firstTrack=first.find(track=>track.songId==='numbness-as-a-trap');
  const secondTrack=second.find(track=>track.songId==='numbness-as-a-trap');
  assert.notEqual(firstTrack.variantId,secondTrack.variantId);
});

test('legacy exact song/version links still take the first slot',()=>{
  const search='?song=i-need-love&version=dubstep-cinematic-terror&intent=think&seed=shared-route&share=1';
  const {cycle}=build(search,{intent:'think',seed:'shared-route'});
  assert.equal(cycle[0].songId,'i-need-love');
  assert.equal(cycle[0].variantId,'dubstep-cinematic-terror');
});

test('unknown intentions fall back to Play the site',()=>{
  const {window}=loadRadio();
  assert.equal(window.CMDCatalogCycle.normalizeIntent('make-me-a-sandwich'),'surprise');
  const cycle=window.CMDCatalogCycle.build(window.CMD_SONGS,{
    intent:'make-me-a-sandwich',
    seed:'fallback-route',
    cycleNumber:1,
    ignoreHistory:true
  });
  assert.ok(cycle.every(track=>track.radioIntent==='surprise'));
});

test('every catalog identity has an explicit intention profile',()=>{
  const {window}=loadRadio();
  const profileIds=Object.keys(window.CMD_RADIO_CONFIG.profiles).sort();
  const songIds=Array.from(window.CMD_SONGS,song=>song.id).sort();
  assert.deepEqual(profileIds,songIds);
});
