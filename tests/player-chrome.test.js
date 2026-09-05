const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function loadMusicChromeHelpers(){
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
      if(prop==='contains')return()=>false;
      if(prop==='getBoundingClientRect')return()=>({top:0,left:0,right:0,bottom:0,width:0,height:0});
      return null;
    },
    set(target,prop,value){target[prop]=value;return true}
  };
  const node=()=>new Proxy({hidden:true,textContent:'',innerHTML:'',value:'',className:'',dataset:{}},handler);
  const nodes=new Map();
  sandbox.document.getElementById=id=>{
    if(!nodes.has(id))nodes.set(id,node());
    return nodes.get(id);
  };
  sandbox.document.createElement=()=>node();
  sandbox.window.addEventListener=()=>{};
  sandbox.addEventListener=()=>{};
  sandbox.window.matchMedia=q=>({matches:String(q).includes('620'),addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  const tab=mode=>{
    const n=node();
    n.dataset={pane:mode};
    n.classList={add(){},remove(){},toggle(){},contains:()=>false};
    n.setAttribute=()=>{};
    return n;
  };
  const tabs=node();
  tabs.querySelectorAll=()=>[tab('lyrics'),tab('search'),tab('page')];
  nodes.set('catalogPaneTabs',tabs);
  try{
    vm.runInNewContext(js,sandbox,{filename:'music/music.js'});
  }catch(err){}
  return sandbox.window.CMDPlayerChrome;
}

test('pane modes are lyrics / search / page with direct setMode + storage key',()=>{
  const js=read('music/music.js');
  assert.ok(js.includes("PANE_MODES=['lyrics','search','page']"));
  assert.ok(js.includes('cmd-player-pane-v1'));
  assert.ok(js.includes('selectPaneMode'));
  assert.ok(js.includes('updatePaneTabsUi'));
  assert.ok(!js.includes('catalogPaneCycle'));
  assert.ok(!js.includes('cyclePaneMode'));
  const chrome=loadMusicChromeHelpers();
  assert.ok(chrome,'CMDPlayerChrome should export');
  assert.equal(Array.from(chrome.MODES).join(','),'lyrics,search,page');
  assert.equal(typeof chrome.setMode,'function');
  assert.equal(chrome.STORAGE_KEY,'cmd-player-pane-v1');
  assert.equal(chrome.nextMode('lyrics'),'search');
  assert.equal(chrome.nextMode('search'),'page');
  assert.equal(chrome.nextMode('page'),'lyrics');
});

test('search hints capped at 3 until More hints',()=>{
  const js=read('music/music.js');
  assert.ok(js.includes('HINT_VISIBLE_CAP=3')||js.includes('HINT_VISIBLE_CAP = 3'));
  assert.ok(js.includes('More hints'));
  assert.ok(js.includes('data-more-hints'));
  assert.ok(js.includes('slice(0,HINT_VISIBLE_CAP)')||js.includes('slice(0, 3)')||js.includes('HINT_VISIBLE_CAP'));
  const chrome=loadMusicChromeHelpers();
  assert.equal(chrome.HINT_CAP,3);
  assert.equal(chrome.SEARCH_RESULT_CAP,6);
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
  assert.ok(js.includes('THRESH')||js.includes('threshold'));
  assert.ok(js.includes('COOLDOWN_MS'));
  assert.ok(js.includes('scroll'));
});

test('music page wires pane tabs + player search + search-play cache bust',()=>{
  const html=read('music/index.html');
  assert.ok(html.includes('id="catalogPaneTabs"'));
  assert.ok(html.includes('data-pane="lyrics"'));
  assert.ok(html.includes('data-pane="search"'));
  assert.ok(html.includes('data-pane="page"'));
  assert.ok(!html.includes('id="catalogPaneCycle"'));
  assert.ok(html.includes('id="catalogPlayerPane"'));
  assert.ok(html.includes('id="catalogPlayerSearch"'));
  assert.ok(html.includes('id="catalogPlayerSearchInput"'));
  assert.ok(html.includes('id="catalogSearchExpand"'));
  assert.ok(html.includes('id="catalogLyricsEmpty"'));
  assert.ok(html.includes('id="catalogSheetChrome"'));
  assert.ok(html.includes('id="catalogSheetExpand"'));
  assert.ok(html.includes('id="catalogSheetCollapse"'));
  assert.ok(html.includes('id="catalogSheetFullLyrics"'));
  assert.ok(html.includes('id="catalogSheetDone"'));
  assert.ok(html.includes('Full lyrics'));
  assert.ok(html.includes('/music/music.js?v=20260905-search-play'));
  assert.ok(html.includes('/music/music.css?v=20260905-search-play'));
  const css=read('music/music.css');
  assert.ok(css.includes('.catalog-player.is-minimized'));
  assert.ok(css.includes('.catalog-player.sheet-mini'));
  assert.ok(css.includes('.catalog-player.sheet-dock'));
  assert.ok(css.includes('.catalog-player.sheet-info'));
  assert.ok(css.includes('.catalog-player.sheet-full'));
  assert.ok(css.includes('.catalog-search-bar.is-collapsed'));
  assert.ok(css.includes('.catalog-pane-tabs'));
  assert.ok(css.includes('.catalog-pane-tab'));
  assert.ok(!css.includes('.catalog-pane-cycle'));
  assert.ok(css.includes('27vh')||css.includes('max-height:min(27vh'));
  assert.ok(css.includes('45vh')||css.includes('max-height:min(45vh'));
  assert.ok(css.includes('92vh')||css.includes('max-height:min(92vh'));
  assert.ok(css.includes('minmax(0,1fr)'));
  assert.ok(css.includes('text-overflow:ellipsis'));
});

test('sheet height API: classes, Full lyrics, Page→mini, persist demotes full',()=>{
  const js=read('music/music.js');
  assert.ok(js.includes("SHEET_HEIGHTS=['mini','dock','info','full']"));
  assert.ok(js.includes('cmd-player-sheet-v1'));
  assert.ok(js.includes("classList.add('sheet-'+sheetHeight)")||js.includes("add('sheet-'"));
  assert.ok(js.includes('jumpFullLyrics'));
  assert.ok(js.includes('applySheetHeight'));
  assert.ok(js.includes("applySheetHeight('full'")||js.includes('applySheetHeight("full"'));
  // Page tab → mini
  assert.ok(js.includes("applySheetHeight('mini'")||js.includes("mode==='page'"));
  // Lyrics from mini bumps to dock, not full
  assert.ok(js.includes("applySheetHeight('dock'"));
  // Reload: full demoted to dock
  assert.ok(js.includes("raw==='full'")||js.includes('raw==="full"'));
  const chrome=loadMusicChromeHelpers();
  assert.ok(chrome,'CMDPlayerChrome should export');
  assert.equal(Array.from(chrome.SHEET_HEIGHTS).join(','),'mini,dock,info,full');
  assert.equal(chrome.SHEET_STORAGE_KEY,'cmd-player-sheet-v1');
  assert.equal(typeof chrome.setSheetHeight,'function');
  assert.equal(typeof chrome.jumpFullLyrics,'function');
  assert.equal(typeof chrome.expandSheet,'function');
  assert.equal(typeof chrome.collapseSheet,'function');
  assert.equal(typeof chrome.doneSheet,'function');
  // Page clamps info/full → dock; exercise heights on Lyrics.
  chrome.setMode('page');
  assert.equal(chrome.getSheetHeight(),'mini');
  chrome.setSheetHeight('info');
  assert.equal(chrome.getSheetHeight(),'dock');
  chrome.setMode('lyrics');
  assert.equal(chrome.getSheetHeight(),'dock'); // mini bumped to dock, not full
  chrome.setSheetHeight('info');
  assert.equal(chrome.getSheetHeight(),'info');
  chrome.jumpFullLyrics();
  assert.equal(chrome.getSheetHeight(),'full');
  chrome.doneSheet();
  assert.equal(chrome.getSheetHeight(),'mini');
  chrome.setMode('lyrics');
  assert.notEqual(chrome.getSheetHeight(),'mini');
  chrome.setSheetHeight('full');
  chrome.collapseSheet();
  assert.equal(chrome.getSheetHeight(),'info');
  chrome.collapseSheet();
  assert.equal(chrome.getSheetHeight(),'dock');
  chrome.collapseSheet();
  assert.equal(chrome.getSheetHeight(),'mini');
});

test('keyboard dock uses visualViewport + scroll hysteresis',()=>{
  const js=read('music/music.js');
  assert.ok(js.includes('visualViewport'));
  assert.ok(js.includes('keyboard-open'));
  assert.ok(js.includes('--vv-keyboard-inset'));
  assert.ok(js.includes('mountKeyboardDock')||js.includes('requestAnimationFrame'));
  assert.ok(js.includes('COOLDOWN_MS=300')||js.includes('COOLDOWN_MS = 300'));
  assert.ok(js.includes('THRESH=48')||js.includes('THRESH = 48'));
  assert.ok(js.includes('keyboardOpen'));
  const css=read('music/music.css');
  assert.ok(css.includes('.catalog-player.keyboard-open'));
  assert.ok(css.includes('--vv-keyboard-inset')||css.includes('cmd-keyboard-open'));
  const html=read('music/index.html');
  assert.ok(html.includes('?v=20260905-search-play'));
});

test('player previews the next song for five seconds without delaying handoff',()=>{
  const js=read('music/music.js');
  assert.ok(js.includes('remaining<=5'));
  assert.ok(js.includes('Up next in'));
  assert.ok(js.includes("audio.addEventListener('ended',()=>{bar.style.width='100%';nextTrack();})"));
});
