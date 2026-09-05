const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const catalogFiles=[
  'data/songs.js',
  'data/archive-catalog.js',
  'data/radio-intents.js',
  'data/2026-08-25-uploads.js',
  'data/2026-08-26-uploads.js',
  'data/2026-08-27-uploads.js',
  'data/2026-08-29-uploads.js',
  'data/2026-09-02-uploads.js',
  'data/taste-clusters.js',
  'data/content-intensity.js',
  'listener-taste.js',
  'catalog-cycle.js'
];

function loadScripts(files,extras={}){
  const storage=new Map();
  if(extras.storage){
    Object.entries(extras.storage).forEach(([key,value])=>storage.set(key,String(value)));
  }
  const window={};
  const context=vm.createContext({
    window,
    location:{pathname:'/music/',search:extras.search||''},
    document:{
      readyState:'complete',
      addEventListener(){},
      querySelector(){return null},
      getElementById(){return null}
    },
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

function ids(cycle){
  return Array.from(cycle,track=>track.songId||track.id);
}

test('every catalog song has an intensity level',()=>{
  const {window}=loadScripts(catalogFiles);
  const missing=window.CMDContentIntensity.uncoveredSongIds(window.CMD_SONGS.map(song=>song.id));
  assert.equal(missing.length,0,'missing intensity: '+missing.join(', '));
  window.CMD_SONGS.forEach(song=>{
    const level=window.CMDContentIntensity.intensityFor(song.id);
    assert.ok(['light','deep','raw'].includes(level),song.id+' → '+level);
  });
});

test('required despair-core tracks are tagged raw',()=>{
  const {window}=loadScripts(['data/content-intensity.js']);
  const required=[
    'will-to-live',
    'locked-in-these-walls',
    'seven-days-locked',
    'under-watch',
    'never-come-back-down',
    'numbness-as-a-trap'
  ];
  required.forEach(id=>{
    assert.equal(window.CMDContentIntensity.intensityFor(id),'raw');
    assert.equal(window.CMDContentIntensity.isRaw(id),true);
  });
});

test('safe-mode surprise build never includes will-to-live',()=>{
  const {window}=loadScripts(catalogFiles);
  const cycle=window.CMDCatalogCycle.build(window.CMD_SONGS,{
    intent:'surprise',
    seed:'vibe-safe-surprise',
    cycleNumber:1,
    ignoreHistory:true
  });
  assert.equal(ids(cycle).includes('will-to-live'),false);
  assert.equal(ids(cycle).includes('numbness-as-a-trap'),false);
  assert.equal(ids(cycle).includes('locked-in-these-walls'),false);
});

test('laugh intent also excludes raw while safe',()=>{
  const {window}=loadScripts(catalogFiles);
  const cycle=window.CMDCatalogCycle.build(window.CMD_SONGS,{
    intent:'laugh',
    seed:'vibe-safe-laugh',
    cycleNumber:1,
    ignoreHistory:true
  });
  assert.equal(ids(cycle).some(id=>window.CMDContentIntensity.isRaw(id)),false);
});

test('level-up and old-files exclude raw unless unlocked',()=>{
  const {window}=loadScripts(catalogFiles);
  for(const intent of ['level-up','old-files']){
    const cycle=window.CMDCatalogCycle.build(window.CMD_SONGS,{
      intent,
      seed:'vibe-'+intent,
      cycleNumber:1,
      ignoreHistory:true
    });
    assert.equal(ids(cycle).includes('will-to-live'),false,intent+' should exclude raw');
  }
});

test('heavy intent can include will-to-live',()=>{
  const {window}=loadScripts(catalogFiles);
  const cycle=window.CMDCatalogCycle.build(window.CMD_SONGS,{
    intent:'heavy',
    seed:'vibe-heavy',
    cycleNumber:1,
    ignoreHistory:true
  });
  assert.ok(ids(cycle).includes('will-to-live'));
  assert.deepEqual(ids(cycle).slice(0,3),['never-come-back-down','numbness-as-a-trap','will-to-live']);
});

test('think intent allows raw',()=>{
  const {window}=loadScripts(catalogFiles);
  const cycle=window.CMDCatalogCycle.build(window.CMD_SONGS,{
    intent:'think',
    seed:'vibe-think',
    cycleNumber:1,
    ignoreHistory:true
  });
  assert.ok(ids(cycle).includes('will-to-live'));
});

test('unlock via toggle allows raw on surprise',()=>{
  const {window}=loadScripts(catalogFiles);
  window.CMDContentIntensity.setIncludeHeavy(true);
  const cycle=window.CMDCatalogCycle.build(window.CMD_SONGS,{
    intent:'surprise',
    seed:'vibe-unlocked-surprise',
    cycleNumber:1,
    ignoreHistory:true,
    includeHeavy:true
  });
  assert.ok(ids(cycle).includes('will-to-live'));
});

test('liking a melancholy-heavy track unlocks raw for surprise',()=>{
  const {window}=loadScripts(catalogFiles);
  window.CMDListenerTaste.like('shooting-star');
  window.CMDContentIntensity.noteTasteChange();
  const policy=window.CMDContentIntensity.readPolicy({intent:'surprise'});
  assert.equal(policy.unlocked,true);
  const cycle=window.CMDCatalogCycle.build(window.CMD_SONGS,{
    intent:'surprise',
    seed:'vibe-like-unlock',
    cycleNumber:1,
    ignoreHistory:true
  });
  assert.ok(ids(cycle).includes('will-to-live'));
});

test('raw soft-hides from Most likely while safe',()=>{
  const {window}=loadScripts(catalogFiles);
  window.CMDListenerTaste.like('keep-moving');
  const ranked=window.CMDTasteClusters.rankMostLikely(window.CMD_SONGS,window.CMDListenerTaste,40);
  const visible=ranked.filter(song=>!window.CMDContentIntensity.shouldSoftHideRaw(song.id,{intent:'surprise'}));
  assert.equal(visible.some(song=>song.id==='will-to-live'),false);
});

test('isAllowed and why copy stay brand-safe',()=>{
  const {window}=loadScripts(['data/content-intensity.js']);
  const api=window.CMDContentIntensity;
  assert.equal(api.isAllowed('will-to-live',{intent:'surprise'}),false);
  assert.equal(api.isAllowed('will-to-live',{intent:'heavy'}),true);
  assert.equal(api.isAllowed('namaste-hamster',{intent:'surprise'}),true);
  assert.match(api.whyGuardCopy({intent:'surprise'}),/lighter|heavy lane/i);
  assert.equal(api.STORAGE,'cmd-vibe-guard-v1');
});

test('music page loads vibe-guard script and toggle copy',()=>{
  const html=read('music/index.html');
  assert.match(html,/content-intensity\.js\?v=20260905-vibe-guard/);
  assert.match(html,/catalog-cycle\.js\?v=20260905-vibe-guard/);
  assert.match(html,/music\.js\?v=20260905-vibe-guard/);
  const music=read('music/music.js');
  assert.match(music,/Include the heavy stuff/);
  assert.match(music,/Keep it lighter/);
  assert.match(music,/CMDContentIntensity/);
});
