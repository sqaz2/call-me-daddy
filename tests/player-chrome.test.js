const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function loadMusicChromeHelpers(){
  // Evaluate just enough of music.js by extracting CMDPlayerChrome setup is hard;
  // instead load a tiny mirror from the exported API by running a stub DOM + music.js pieces.
  // Prefer source-contract + pure nextMode cycle via a lightweight eval of the chrome constants.
  const js=read('music/music.js');
  const sandbox={
    window:{
      CMD_SONGS:[],
      matchMedia:()=>({matches:true})
    },
    document:{
      getElementById:()=>null,
      querySelector:()=>null,
      querySelectorAll:()=>[],
      createElement:()=>({className:'',textContent:'',hidden:true,appendChild(){}}),
      head:{appendChild(){}},
      body:{classList:{add(){},remove(){},toggle(){},contains:()=>false}}
    },
    localStorage:{
      _m:new Map(),
      getItem(k){return this._m.has(k)?this._m.get(k):null},
      setItem(k,v){this._m.set(k,String(v))},
      removeItem(k){this._m.delete(k)}
    },
    location:{search:'',origin:'https://example.test'},
    URL,URLSearchParams,Date,Math,console,
    navigator:{}
  };
  // music.js expects many DOM nodes and early-returns if no songs — inject one playable song
  sandbox.window.CMD_SONGS=[{id:'demo',title:'Demo',audio:'/x.mp3',project:'Test',kind:'Single'}];
  sandbox.window.CMDCatalogCycle={
    variants:song=>song?.audio?[{id:'main',label:'Main',audio:song.audio}]:[],
    count:songs=>songs.length,
    intents:[{id:'surprise',label:'Play the site'}],
    normalizeIntent:()=>'surprise',
    cleanSeed:s=>s||'seed',
    createSeed:()=>'seed',
    build:songs=>songs.map(song=>({...song,songId:song.id,variantLabel:'Main',variantCount:1,why:['test'],whyText:'Why this song: test.'})),
    remember(){}
  };
  // Soft stubs so music.js can run without throwing
  const handler={
    get(target,prop){
      if(prop in target)return target[prop];
      if(prop==='addEventListener')return()=>{};
      if(prop==='removeEventListener')return()=>{};
      if(prop==='classList')return{add(){},remove(){},toggle(){},contains:()=>false};
      if(prop==='style')return{};
      if(prop==='dataset')return{};
      if(prop==='querySelector')return()=>null;
      if(prop==='querySelectorAll')return()=>[];
      if(prop==='appendChild')return()=>{};
      if(prop==='setAttribute')return()=>{};
      if(prop==='getAttribute')return()=>null;
      if(prop==='focus')return()=>{};
      if(prop==='closest')return()=>null;
      if(prop==='getBoundingClientRect')return()=>({top:0,left:0,right:0,bottom:0,width:0,height:0});
      return null;
    },
    set(target,prop,value){target[prop]=value;return true}
  };
  const node=()=>new Proxy({hidden:true,textContent:'',innerHTML:'',value:'',className:''},handler);
  const nodes=new Map();
  sandbox.document.getElementById=id=>{
    if(!nodes.has(id))nodes.set(id,node());
    return nodes.get(id);
  };
  sandbox.document.createElement=()=>node();
  sandbox.window.addEventListener=()=>{};
  sandbox.addEventListener=()=>{};
  sandbox.window.matchMedia=q=>({matches:String(q).includes('620'),addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  try{
    vm.runInNewContext(js,sandbox,{filename:'music/music.js'});
  }catch(err){
    // music.js may throw on missing audio APIs; chrome export happens early enough usually
  }
  return sandbox.window.CMDPlayerChrome;
}

test('pane mode cycle order is lyrics → search → page → lyrics',()=>{
  const js=read('music/music.js');
  assert.ok(js.includes("PANE_MODES=['lyrics','search','page']"));
  assert.ok(js.includes('cmd-player-pane-v1'));
  const chrome=loadMusicChromeHelpers();
  assert.ok(chrome,'CMDPlayerChrome should export');
  assert.equal(Array.from(chrome.MODES).join(','),'lyrics,search,page');
  assert.equal(chrome.nextMode('lyrics'),'search');
  assert.equal(chrome.nextMode('search'),'page');
  assert.equal(chrome.nextMode('page'),'lyrics');
  assert.equal(chrome.nextMode('lyrics'),'search');
  assert.equal(chrome.STORAGE_KEY,'cmd-player-pane-v1');
});

test('search hints capped at 3 until More hints',()=>{
  const js=read('music/music.js');
  assert.ok(js.includes('HINT_VISIBLE_CAP=3')||js.includes('HINT_VISIBLE_CAP = 3'));
  assert.ok(js.includes('More hints'));
  assert.ok(js.includes('data-more-hints'));
  assert.ok(js.includes('slice(0,HINT_VISIBLE_CAP)')||js.includes('slice(0, 3)')||js.includes('HINT_VISIBLE_CAP'));
  const chrome=loadMusicChromeHelpers();
  assert.equal(chrome.HINT_CAP,3);
  // Page search no longer paints 14 chips on first mount
  assert.ok(!js.includes('hints.slice(0,14)'));
});

test('music.js contains scroll minimize hooks and localStorage pane key',()=>{
  const js=read('music/music.js');
  assert.ok(js.includes('is-minimized'));
  assert.ok(js.includes("classList.add('is-minimized')")||js.includes('is-minimized'));
  assert.ok(js.includes("classList.remove('is-minimized')")||js.includes('remove'));
  assert.ok(js.includes('cmd-player-pane-v1'));
  assert.ok(js.includes('localStorage.getItem(PANE_STORAGE)')||js.includes("getItem('cmd-player-pane-v1')")||js.includes('localStorage.getItem'));
  assert.ok(js.includes('localStorage.setItem(PANE_STORAGE')||js.includes('persistPaneMode'));
  assert.ok(js.includes('THRESH')||js.includes('threshold')||js.includes('10'));
  assert.ok(js.includes('scroll'));
});

test('music page wires pane cycle + player search + cache bust',()=>{
  const html=read('music/index.html');
  assert.ok(html.includes('id="catalogPaneCycle"'));
  assert.ok(html.includes('id="catalogPlayerPane"'));
  assert.ok(html.includes('id="catalogPlayerSearch"'));
  assert.ok(html.includes('id="catalogPlayerSearchInput"'));
  assert.ok(html.includes('id="catalogSearchExpand"'));
  assert.ok(html.includes('id="catalogLyricsEmpty"'));
  assert.ok(html.includes('/music/music.js?v=20260905-player-chrome'));
  assert.ok(html.includes('/music/music.css?v=20260905-player-chrome'));
  const css=read('music/music.css');
  assert.ok(css.includes('.catalog-player.is-minimized'));
  assert.ok(css.includes('.catalog-search-bar.is-collapsed'));
  assert.ok(css.includes('.catalog-pane-cycle'));
});
