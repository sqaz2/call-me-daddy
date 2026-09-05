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
  'listener-taste.js',
  'catalog-cycle.js'
];

function loadScripts(files,extras={}){
  const storage=new Map();
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

test('every catalog song lands in at least one taste cluster',()=>{
  const {window}=loadScripts(catalogFiles);
  const ids=window.CMD_SONGS.map(song=>song.id);
  const missing=[...window.CMDTasteClusters.uncoveredSongIds(ids)];
  assert.equal(missing.length,0,'uncovered: '+missing.join(', '));
  assert.ok(window.CMDTasteClusters.clusters.length>=6);
});

test('dislike will-to-live crushes melancholy peers; comedy stays isolated',()=>{
  const {window}=loadScripts(['data/taste-clusters.js','listener-taste.js']);
  const taste=window.CMDListenerTaste;
  const clusters=window.CMDTasteClusters;

  taste.dislike('will-to-live');
  const locked=clusters.applyTasteToWeight({songId:'locked-in-these-walls',baseWeight:1,taste});
  const seven=clusters.applyTasteToWeight({songId:'seven-days-locked',baseWeight:1,taste});
  const self=clusters.applyTasteToWeight({songId:'will-to-live',baseWeight:1,taste});
  assert.ok(locked<0.2,'locked-in-these-walls should drop hard, got '+locked);
  assert.ok(seven<0.2,'seven-days-locked should drop hard, got '+seven);
  assert.ok(self<0.1,'will-to-live itself crushed');

  taste.clear('will-to-live');
  taste.dislike('side-chick-finder');
  const million=clusters.applyTasteToWeight({songId:'one-million-dollars',baseWeight:1,taste});
  const side=clusters.applyTasteToWeight({songId:'side-chick-finder',baseWeight:1,taste});
  assert.ok(million>0.9,'comedy peer must not be crushed, got '+million);
  assert.ok(side<0.1,'disliked comedy song itself crushed');
});

test('like will-to-live boosts melancholy cluster peers',()=>{
  const {window}=loadScripts(['data/taste-clusters.js','listener-taste.js']);
  const taste=window.CMDListenerTaste;
  const clusters=window.CMDTasteClusters;
  taste.like('will-to-live');
  const locked=clusters.applyTasteToWeight({songId:'locked-in-these-walls',baseWeight:1,taste});
  const seven=clusters.applyTasteToWeight({songId:'seven-days-locked',baseWeight:1,taste});
  assert.ok(locked>1.2,'melancholy peer should boost, got '+locked);
  assert.ok(seven>1.2,'melancholy peer should boost, got '+seven);
  assert.equal(taste.weightMultiplier('locked-in-these-walls'),locked);
});

test('like one comedy gently boosts other comedies; dislike does not',()=>{
  const {window}=loadScripts(['data/taste-clusters.js','listener-taste.js']);
  const taste=window.CMDListenerTaste;
  const clusters=window.CMDTasteClusters;
  taste.like('armando');
  const boosted=clusters.applyTasteToWeight({songId:'funhouse-meltdown',baseWeight:1,taste});
  assert.ok(boosted>1.05,'liked comedy should gently boost peers, got '+boosted);
  taste.clear('armando');
  taste.dislike('armando');
  const isolated=clusters.applyTasteToWeight({songId:'funhouse-meltdown',baseWeight:1,taste});
  assert.ok(Math.abs(isolated-1)<0.001,'disliked comedy must not tank peers, got '+isolated);
});

test('whyText mentions cluster when taste applies',()=>{
  const {window}=loadScripts(catalogFiles);
  window.CMDListenerTaste.like('will-to-live');
  const cycle=window.CMDCatalogCycle.build(window.CMD_SONGS,{
    intent:'heavy',
    seed:'cluster-why',
    cycleNumber:1,
    ignoreHistory:true
  });
  const locked=cycle.find(track=>track.songId==='locked-in-these-walls');
  assert.ok(locked,'locked-in-these-walls should appear in heavy cycle');
  assert.ok(
    locked.why.some(reason=>/Melancholy\/Heavy/i.test(reason))||/Melancholy\/Heavy/i.test(locked.whyText),
    'expected Melancholy/Heavy in why, got '+locked.whyText
  );
  assert.ok(locked.clusterLabel==='Melancholy/Heavy'||locked.clusterId==='melancholy-heavy');
});

test('comedy isolate why copy when a peer is disliked',()=>{
  const {window}=loadScripts(['data/taste-clusters.js','listener-taste.js']);
  window.CMDListenerTaste.dislike('side-chick-finder');
  const reasons=window.CMDTasteClusters.explainClusterWhy('one-million-dollars',window.CMDListenerTaste,'laugh');
  assert.ok(reasons.some(reason=>/kept separate/i.test(reason)),reasons.join(' | '));
});

test('most-likely rail soft-hides strongly disliked full-bleed clusters',()=>{
  const {window}=loadScripts(catalogFiles);
  const songs=window.CMD_SONGS;
  window.CMDListenerTaste.like('level-up');
  window.CMDListenerTaste.dislike('will-to-live');
  const ranked=window.CMDTasteClusters.rankMostLikely(songs,window.CMDListenerTaste,20);
  const ids=ranked.map(song=>song.id);
  assert.ok(!ids.includes('locked-in-these-walls'),'soft-hide melancholy peer');
  assert.ok(!ids.includes('will-to-live'),'soft-hide disliked song');
  assert.ok(ids.includes('keep-moving')||ids.includes('one-brick')||ids.includes('find-your-people'));
});

test('music page wires taste cluster assets',()=>{
  const html=read('music/index.html');
  assert.ok(html.includes('/data/taste-clusters.js'));
  assert.ok(html.includes('/music/taste-rail.js'));
  assert.ok(html.includes('id="tasteRail"'));
  assert.ok(html.includes('id="playerCluster"'));
  assert.ok(html.includes('20260905-clusters'));
  assert.ok(fs.existsSync(path.join(root,'music/taste-rail.js')));
  assert.ok(fs.existsSync(path.join(root,'data/taste-clusters.js')));
});
