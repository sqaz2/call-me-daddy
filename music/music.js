(()=>{
  const songs=Array.isArray(window.CMD_SONGS)?window.CMD_SONGS:[];
  const archiveLove=songs.find(song=>song.id==='i-need-love');
  if(archiveLove){
    archiveLove.project='Archive · song lineage';
    archiveLove.description='Older recording → 2024 AI reimagining → two 2026 busker versions.';
    archiveLove.experience='/archive/i-need-love/';
  }
  const cycleEngine=window.CMDCatalogCycle;
  const variantsFor=song=>cycleEngine?cycleEngine.variants(song):(song?.audio?[{id:'main',label:song.kind||'Main version',audio:song.audio}]:[]);
  const playableSongs=songs.filter(song=>variantsFor(song).length);
  const totalVersions=cycleEngine?cycleEngine.count(playableSongs):playableSongs.length;
  const intents=cycleEngine?.intents||[];
  const intentById=new Map(intents.map(intent=>[intent.id,intent]));
  const initialQuery=(()=>{try{return new URLSearchParams(location.search)}catch{return new URLSearchParams()}})();
  let activeIntent=cycleEngine?.normalizeIntent(initialQuery.get('intent'))||'surprise';
  let radioSeed=cycleEngine?.cleanSeed(initialQuery.get('seed'))||cycleEngine?.createSeed?.()||Date.now().toString(36);
  let deterministicRoute=initialQuery.get('share')==='1';
  const grid=document.getElementById('songGrid');
  const count=document.getElementById('catalogCount');
  const intentMount=document.getElementById('intentRadio');
  const player=document.getElementById('catalogPlayer');
  const audio=document.getElementById('catalogAudio');
  const play=document.getElementById('catalogPlay');
  const prev=document.getElementById('catalogPrev');
  const next=document.getElementById('catalogNext');
  const title=document.getElementById('playerTitle');
  const label=document.getElementById('playerLabel');
  const status=document.getElementById('playerStatus');
  const whyLine=document.getElementById('playerWhy');
  const clusterChip=document.getElementById('playerCluster');
  const cover=document.getElementById('playerCover');
  const likeBtn=document.getElementById('catalogLike');
  const dislikeBtn=document.getElementById('catalogDislike');
  const searchInput=document.getElementById('catalogSearch');
  const searchHints=document.getElementById('catalogSearchHints');
  const searchEmpty=document.getElementById('catalogSearchEmpty');
  const searchDatalist=document.getElementById('catalogSearchList');
  const lyricsPanel=document.getElementById('catalogLyrics');
  const lyricsToggle=document.getElementById('catalogLyricsToggle');
  const lyricsBody=document.getElementById('catalogLyricsBody');
  const lyricsSuno=document.getElementById('catalogLyricsSuno');
  const lyricsEmpty=document.getElementById('catalogLyricsEmpty');
  const playerPane=document.getElementById('catalogPlayerPane');
  const playerSearch=document.getElementById('catalogPlayerSearch');
  const playerSearchInput=document.getElementById('catalogPlayerSearchInput');
  const playerSearchHints=document.getElementById('catalogPlayerSearchHints');
  const paneTabs=document.getElementById('catalogPaneTabs');
  const paneTabButtons=paneTabs?Array.from(paneTabs.querySelectorAll('[data-pane]')):[];
  const sheetHandle=document.getElementById('catalogSheetHandle');
  const sheetExpandBtn=document.getElementById('catalogSheetExpand');
  const sheetCollapseBtn=document.getElementById('catalogSheetCollapse');
  const sheetFullLyricsBtn=document.getElementById('catalogSheetFullLyrics');
  const sheetFullLyricsInline=document.getElementById('catalogSheetFullLyricsInline');
  const sheetDoneBtn=document.getElementById('catalogSheetDone');
  const searchBar=document.getElementById('catalogSearchBar');
  const searchExpand=document.getElementById('catalogSearchExpand');
  const progress=document.getElementById('catalogProgress');
  const bar=document.getElementById('catalogProgressBar');
  const tactileMount=document.getElementById('catalogTactile');
  let current=null;
  let cycle=[];
  let cycleIndex=-1;
  let cycleNumber=0;
  let lastSongId=null;

  const activeIntentInfo=()=>intentById.get(activeIntent)||intents[0]||{id:'surprise',label:'Play the site',kicker:'Controlled chaos',description:'The catalog decides what happens next.',shareText:'Press play and let Call Me Daddy decide what happens next.'};

  if(!window.CMDPersistentSite){
    const script=document.createElement('script');
    script.src='/persistent-site-browser.js?v=20260827-1';
    document.head.appendChild(script);
  }

  const playerCopy=player?.querySelector('.player-copy');
  const songLink=document.createElement('a');
  songLink.className='cmd-now-song-link';
  songLink.textContent='Open this song →';
  songLink.hidden=true;
  playerCopy?.appendChild(songLink);

  window.CMDTactileScrubber?.create({
    mount:tactileMount,
    getDuration:()=>audio.duration,
    getTime:()=>audio.currentTime,
    seek:time=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=Math.max(0,Math.min(audio.duration,time));},
    label:'DRAG TO SCAN',
    detail:'ONE TURN = WHOLE SONG',
    haptics:true
  });

  count.textContent=`${playableSongs.length} songs · ${totalVersions} playable versions · intention radio`;

  if(!songs.length){
    grid.innerHTML='<p class="catalog-empty">No tracks have been added yet.</p>';
    return;
  }

  const safe=(value='')=>String(value).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const songIdOf=song=>song?.songId||song?.id||'';
  const lyricEntry=id=>window.CMDSongLyrics?.get?.(id)||window.CMD_SONG_LYRICS?.[id]||null;
  const resolveLyrics=song=>{
    const id=songIdOf(song);
    const fromHelper=window.CMDSongLyrics?.lyrics?.(id);
    if(fromHelper)return fromHelper;
    const entry=lyricEntry(id);
    return entry&&entry.lyrics?String(entry.lyrics):'';
  };
  const resolveSunoUrl=song=>{
    if(song?.sunoUrl)return String(song.sunoUrl);
    const id=songIdOf(song);
    const fromHelper=window.CMDSongLyrics?.sunoUrl?.(id);
    if(fromHelper)return String(fromHelper);
    const entry=lyricEntry(id);
    return entry&&entry.sunoUrl?String(entry.sunoUrl):'';
  };
  const formatLyricsHtml=(text='')=>{
    const escaped=safe(text).replace(/\r\n?/g,'\n');
    return escaped
      .replace(/\[([^\]]+)\]/g,'<span class="lyric-tag">[$1]</span>')
      .replace(/\n/g,'<br>');
  };
  const sunoLinkLabel=hasLyrics=>hasLyrics?'Lyrics on Suno ↗':'Suno ↗';

  const PANE_STORAGE='cmd-player-pane-v1';
  const SHEET_STORAGE='cmd-player-sheet-v1';
  const PANE_MODES=['lyrics','search','page'];
  const SHEET_HEIGHTS=['mini','dock','info','full'];
  const SHEET_CLASSES=SHEET_HEIGHTS.map(h=>'sheet-'+h);
  const HINT_VISIBLE_CAP=3;
  const MODE_META={
    lyrics:{icon:'Aa',label:'Lyrics'},
    search:{icon:'🔍',label:'Search'},
    page:{icon:'▭',label:'Page'}
  };
  let searchHintsAll=[];
  let hintsExpanded=false;
  let syncingSearch=false;
  let paneMode='page';
  let sheetHeight='dock';
  let sheetHeightBeforeMini='dock';
  let playerPointerDown=false;
  let keyboardOpen=false;

  function isSmallScreen(){
    try{return window.matchMedia('(max-width:620px)').matches}catch{return false}
  }
  function nextPaneMode(mode){
    const i=PANE_MODES.indexOf(mode);
    return PANE_MODES[(i<0?0:i+1)%PANE_MODES.length];
  }
  function readStoredPaneMode(){
    try{
      const raw=localStorage.getItem(PANE_STORAGE);
      if(PANE_MODES.includes(raw))return raw;
    }catch{}
    return null;
  }
  function defaultPaneMode(){
    // Mobile: start on Page so the catalog stays visible; desktop: Lyrics.
    return isSmallScreen()?'page':'lyrics';
  }
  function persistPaneMode(mode){
    try{localStorage.setItem(PANE_STORAGE,mode)}catch{}
  }
  function defaultSheetHeight(){
    return isSmallScreen()?'dock':'dock';
  }
  function readStoredSheetHeight(){
    try{
      const raw=localStorage.getItem(SHEET_STORAGE);
      if(!SHEET_HEIGHTS.includes(raw))return null;
      // Reloading into a near-fullscreen sheet is jarring — demote full→dock.
      if(raw==='full')return 'dock';
      return raw;
    }catch{}
    return null;
  }
  function persistSheetHeight(height){
    try{
      // Persist the usable height; full is demoted on next load via readStoredSheetHeight.
      localStorage.setItem(SHEET_STORAGE,height);
    }catch{}
  }
  function sheetStep(from,dir){
    const i=SHEET_HEIGHTS.indexOf(from);
    const idx=i<0?SHEET_HEIGHTS.indexOf('dock'):i;
    const next=Math.max(0,Math.min(SHEET_HEIGHTS.length-1,idx+dir));
    return SHEET_HEIGHTS[next];
  }
  function renderHintChips(target,hints,{expanded=false}={}){
    if(!target)return;
    const list=hints||[];
    const visible=expanded?list:list.slice(0,HINT_VISIBLE_CAP);
    const moreNeeded=!expanded&&list.length>HINT_VISIBLE_CAP;
    const chips=visible.map(hint=>`<button type="button" class="catalog-hint" data-hint="${safe(hint)}">${safe(hint)}</button>`).join('');
    const more=moreNeeded?`<button type="button" class="catalog-hint catalog-hint-more" data-more-hints="1">More hints</button>`:'';
    target.innerHTML=chips+more;
  }
  function setHintsExpanded(on){
    hintsExpanded=!!on;
    renderHintChips(searchHints,searchHintsAll,{expanded:hintsExpanded});
    renderHintChips(playerSearchHints,searchHintsAll,{expanded:hintsExpanded});
  }
  function updateSheetChromeUi(){
    if(!player)return;
    SHEET_CLASSES.forEach(cls=>player.classList.remove(cls));
    player.classList.add('sheet-'+sheetHeight);
    player.dataset.sheet=sheetHeight;
    const isMini=sheetHeight==='mini';
    player.classList.toggle('is-minimized',isMini);
    const showFullLyrics=paneMode==='lyrics'&&sheetHeight!=='full';
    if(sheetFullLyricsBtn)sheetFullLyricsBtn.hidden=!showFullLyrics;
    if(sheetFullLyricsInline)sheetFullLyricsInline.hidden=!showFullLyrics;
    const showDone=sheetHeight==='full'||sheetHeight==='info';
    if(sheetDoneBtn)sheetDoneBtn.hidden=!showDone;
    if(sheetExpandBtn){
      sheetExpandBtn.disabled=sheetHeight==='full'||(paneMode==='page'&&sheetHeight==='dock');
      sheetExpandBtn.setAttribute('aria-disabled',sheetExpandBtn.disabled?'true':'false');
    }
    if(sheetCollapseBtn){
      sheetCollapseBtn.disabled=sheetHeight==='mini';
      sheetCollapseBtn.setAttribute('aria-disabled',sheetCollapseBtn.disabled?'true':'false');
    }
    if(sheetHandle){
      sheetHandle.setAttribute('aria-label',`Player height: ${sheetHeight}. Tap to expand`);
      sheetHandle.dataset.sheet=sheetHeight;
    }
  }
  function updatePaneTabsUi(){
    paneTabButtons.forEach(btn=>{
      const active=btn.dataset.pane===paneMode;
      btn.classList.toggle('is-active',active);
      btn.setAttribute('aria-selected',active?'true':'false');
      btn.tabIndex=active?0:-1;
    });
    if(player){
      player.dataset.pane=paneMode;
      player.classList.toggle('pane-lyrics',paneMode==='lyrics');
      player.classList.toggle('pane-search',paneMode==='search');
      player.classList.toggle('pane-page',paneMode==='page');
    }
  }
  function applySheetHeight(height,{persist=true,fromScroll=false}={}){
    let next=SHEET_HEIGHTS.includes(height)?height:defaultSheetHeight();
    // Page tab content never needs full/info — keep browsing usable.
    if(paneMode==='page'&&(next==='full'||next==='info'))next='dock';
    if(sheetHeight!=='mini'&&next==='mini')sheetHeightBeforeMini=sheetHeight;
    sheetHeight=next;
    if(persist)persistSheetHeight(sheetHeight);
    updateSheetChromeUi();
    const showPane=(paneMode==='lyrics'||paneMode==='search')&&sheetHeight!=='mini';
    if(playerPane)playerPane.hidden=!showPane;
    if(showPane&&paneMode==='lyrics')refreshLyricsVisibility();
    if(showPane&&paneMode==='search')setHintsExpanded(hintsExpanded);
  }
  function applyPaneMode(mode,{persist=true}={}){
    paneMode=PANE_MODES.includes(mode)?mode:defaultPaneMode();
    if(persist)persistPaneMode(paneMode);
    updatePaneTabsUi();
    // Page → mini (site usable). Lyrics/Search bump mini→dock; never surprise-jump to full.
    if(paneMode==='page'){
      applySheetHeight('mini',{persist});
    }else if(sheetHeight==='mini'){
      applySheetHeight('dock',{persist});
    }else{
      applySheetHeight(sheetHeight,{persist:false});
    }
    const showPane=(paneMode==='lyrics'||paneMode==='search')&&sheetHeight!=='mini';
    if(playerPane)playerPane.hidden=!showPane;
    if(lyricsPanel){
      const showLyrics=paneMode==='lyrics';
      lyricsPanel.hidden=!showLyrics;
      if(showLyrics)refreshLyricsVisibility();
    }
    if(playerSearch)playerSearch.hidden=paneMode!=='search';
    if(paneMode==='search'&&showPane){
      setHintsExpanded(hintsExpanded);
      if(playerSearchInput&&document.activeElement!==searchInput){
        try{playerSearchInput.focus({preventScroll:true})}catch{playerSearchInput.focus()}
      }
    }
    updateSheetChromeUi();
  }
  function refreshLyricsVisibility(){
    if(!lyricsPanel||paneMode!=='lyrics')return;
    const hasText=!!(lyricsBody&&lyricsBody.innerHTML&&lyricsBody.innerHTML.trim());
    lyricsPanel.hidden=false;
    if(lyricsBody&&hasText)lyricsBody.hidden=false;
    if(lyricsToggle)lyricsToggle.setAttribute('aria-expanded',String(hasText&&lyricsBody&&!lyricsBody.hidden));
  }
  function selectPaneMode(mode){
    if(mode==='page'){
      paneMode='page';
      persistPaneMode('page');
      updatePaneTabsUi();
      applySheetHeight('mini');
      if(lyricsPanel)lyricsPanel.hidden=true;
      if(playerSearch)playerSearch.hidden=true;
      if(playerPane)playerPane.hidden=true;
      updateSheetChromeUi();
      return;
    }
    applyPaneMode(mode);
  }
  function expandSheet(){
    if(paneMode==='page'&&sheetHeight==='mini'){
      applySheetHeight('dock');
      return;
    }
    if(paneMode==='lyrics'&&sheetHeight==='dock'){
      // From dock on Lyrics, expand goes to info (see more), not surprise-full.
      applySheetHeight('info');
      return;
    }
    applySheetHeight(sheetStep(sheetHeight,1));
  }
  function collapseSheet(){
    applySheetHeight(sheetStep(sheetHeight,-1));
  }
  function jumpFullLyrics(){
    if(paneMode!=='lyrics')applyPaneMode('lyrics');
    applySheetHeight('full');
  }
  function doneSheet(){
    // Return to regular scrolling / browse the page.
    applyPaneMode('page');
  }
  function setSearchQuery(query,{from=null}={}){
    if(syncingSearch)return;
    syncingSearch=true;
    try{
      const value=String(query||'');
      if(searchInput&&from!=='page'&&searchInput.value!==value)searchInput.value=value;
      if(playerSearchInput&&from!=='player'&&playerSearchInput.value!==value)playerSearchInput.value=value;
      applySearchFilter(value);
    }finally{
      syncingSearch=false;
    }
  }
  function setSearchBarCollapsed(collapsed){
    if(!searchBar)return;
    searchBar.classList.toggle('is-collapsed',!!collapsed);
    if(searchExpand){
      searchExpand.hidden=!collapsed;
      searchExpand.setAttribute('aria-expanded',String(!collapsed));
    }
  }
  function expandSearchBar(){
    setSearchBarCollapsed(false);
    try{searchInput?.focus({preventScroll:true})}catch{searchInput?.focus()}
  }

  window.CMDPlayerChrome={
    STORAGE_KEY:PANE_STORAGE,
    SHEET_STORAGE_KEY:SHEET_STORAGE,
    MODES:PANE_MODES.slice(),
    SHEET_HEIGHTS:SHEET_HEIGHTS.slice(),
    HINT_CAP:HINT_VISIBLE_CAP,
    nextMode:nextPaneMode,
    setMode:selectPaneMode,
    defaultMode:defaultPaneMode,
    modeMeta:MODE_META,
    setSheetHeight:h=>applySheetHeight(h),
    expandSheet,
    collapseSheet,
    jumpFullLyrics,
    doneSheet,
    getSheetHeight:()=>sheetHeight,
    isKeyboardOpen:()=>keyboardOpen
  };

  const buildCycle=()=>{
    cycleNumber+=1;
    const guard=window.CMDContentIntensity?.readPolicy?.({intent:activeIntent})||{};
    cycle=cycleEngine?cycleEngine.build(playableSongs,{lastSongId,intent:activeIntent,seed:radioSeed,cycleNumber,ignoreHistory:deterministicRoute,includeHeavy:guard.includeHeavy,unlockedByTaste:guard.unlockedByTaste}):playableSongs.map(song=>({...song,songId:song.id,variantLabel:song.kind||'Main version',variantCount:1}));
    cycleIndex=-1;
  };

  function stationUrl(){
    const url=new URL('/music/',location.origin);
    url.searchParams.set('intent',activeIntent);
    url.searchParams.set('seed',radioSeed);
    url.searchParams.set('share','1');
    return url.href;
  }

  function songShareUrl(song,variant){
    if(!variant)return new URL(song.experience||song.youtubeUrl||'/music/',location.origin).href;
    const url=new URL('/music/',location.origin);
    url.searchParams.set('song',song.id);
    if(variant.id)url.searchParams.set('version',variant.id);
    url.searchParams.set('intent',activeIntent);
    url.searchParams.set('seed',radioSeed);
    url.searchParams.set('share','1');
    return url.href;
  }

  async function shareSong(song,variant){
    const detail=variant&&variantsFor(song).length>1?` — ${variant.label||song.kind||'Version'}`:'';
    const data={title:`${song.title}${detail}`,text:`Listen to ${song.title}${detail}.`,url:songShareUrl(song,variant)};
    if(window.CMDShare?.nativeShare)return window.CMDShare.nativeShare(data);
    try{if(navigator.share)return navigator.share(data);await navigator.clipboard?.writeText(`${data.text}\n${data.url}`)}catch{}
  }

  function syncUrl(){
    try{
      const url=new URL(location.href);
      ['song','version','share'].forEach(key=>url.searchParams.delete(key));
      url.searchParams.set('intent',activeIntent);
      url.searchParams.set('seed',radioSeed);
      history.replaceState({},'',url);
    }catch{}
  }

  function renderIntentState(message=''){
    if(!intentMount)return;
    const info=activeIntentInfo();
    intentMount.querySelectorAll('[data-intent]').forEach(button=>{
      const selected=button.dataset.intent===activeIntent;
      button.classList.toggle('is-active',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    const labelNode=intentMount.querySelector('[data-radio-label]');
    const descriptionNode=intentMount.querySelector('[data-radio-description]');
    const playNode=intentMount.querySelector('[data-radio-play]');
    const statusNode=intentMount.querySelector('[data-radio-status]');
    if(labelNode)labelNode.textContent=`${info.kicker} · ${info.label}`;
    if(descriptionNode)descriptionNode.textContent=info.description;
    if(playNode)playNode.textContent=`▶ ${info.label}`;
    if(statusNode)statusNode.textContent=message;
  }

  function mountIntentionRadio(){
    if(!intentMount||!intents.length)return;
    intentMount.innerHTML=`
      <div class="intent-radio-head">
        <div><div class="kicker">Tell the station what you came for</div><h2>PLAY WITH INTENTION.</h2></div>
        <p>Not a playlist. A weighted route through old files, new ideas and the stories hiding between songs.</p>
      </div>
      <div class="intent-grid" role="group" aria-label="Choose a listening intention">
        ${intents.map(intent=>`<button class="intent-choice" type="button" data-intent="${safe(intent.id)}" aria-pressed="false"><small>${safe(intent.kicker)}</small><strong>${safe(intent.label)}</strong></button>`).join('')}
      </div>
      <div class="intent-now">
        <div class="intent-now-copy"><small data-radio-label></small><p data-radio-description></p><span data-radio-status aria-live="polite"></span></div>
        <div class="intent-now-actions"><button class="btn primary" type="button" data-radio-play></button><button class="btn" type="button" data-radio-share>↗ Share this route</button></div>
      </div>
      <div class="vibe-guard" data-vibe-guard>
        <button type="button" class="vibe-guard-toggle" data-vibe-toggle aria-pressed="false">
          <span data-vibe-label>Include the heavy stuff</span>
        </button>
        <p class="vibe-guard-note" data-vibe-note>Keeping it lighter until you ask for the heavy lane.</p>
      </div>`;
    intentMount.addEventListener('click',event=>{
      const intentButton=event.target.closest('[data-intent]');
      if(intentButton){startIntent(intentButton.dataset.intent);return;}
      if(event.target.closest('[data-radio-play]')){startIntent(activeIntent);return;}
      if(event.target.closest('[data-radio-share]'))shareStation();
      if(event.target.closest('[data-vibe-toggle]')){toggleVibeGuard();return;}
    });
    renderIntentState();
    renderVibeGuard();
  }

  function vibePolicy(){
    return {intent:activeIntent};
  }

  function renderVibeGuard(){
    if(!intentMount)return;
    const api=window.CMDContentIntensity;
    const toggle=intentMount.querySelector('[data-vibe-toggle]');
    const label=intentMount.querySelector('[data-vibe-label]');
    const note=intentMount.querySelector('[data-vibe-note]');
    if(!toggle||!api)return;
    const policy=api.readPolicy?.(vibePolicy())||{includeHeavy:false,unlocked:false,safeMode:true};
    const heavy=!!policy.includeHeavy;
    toggle.classList.toggle('is-active',heavy);
    toggle.setAttribute('aria-pressed',String(heavy));
    // Label is the action available from the current state.
    if(label)label.textContent=heavy?'Keep it lighter':'Include the heavy stuff';
    if(note){
      note.textContent=heavy
        ?(api.HEAVY_LANE_COPY||'You opened the heavy lane.')
        :(api.RAW_COPY||'Keeping it lighter until you ask for the heavy lane.');
    }
  }

  function toggleVibeGuard(){
    const api=window.CMDContentIntensity;
    if(!api?.toggleIncludeHeavy)return;
    api.toggleIncludeHeavy();
    renderVibeGuard();
    // Rebuild the current intention route with the new gate.
    radioSeed=cycleEngine?.createSeed?.()||Date.now().toString(36);
    deterministicRoute=false;
    cycle=[];
    cycleIndex=-1;
    cycleNumber=0;
    syncUrl();
    const policy=api.readPolicy?.(vibePolicy())||{};
    renderIntentState(policy.includeHeavy?'Heavy lane open.':'Keeping it lighter.');
    window.CMDTasteRail?.refresh?.();
    if(current)nextTrack();
  }

  function startIntent(intent){
    activeIntent=cycleEngine?.normalizeIntent(intent)||'surprise';
    radioSeed=cycleEngine?.createSeed?.()||Date.now().toString(36);
    deterministicRoute=false;
    cycle=[];
    cycleIndex=-1;
    cycleNumber=0;
    syncUrl();
    renderVibeGuard();
    renderIntentState('New route built.');
    window.CMDTasteRail?.refresh?.();
    nextTrack();
  }

  async function shareStation(){
    const info=activeIntentInfo();
    const data={title:`${info.label} — Call Me Daddy Radio`,text:info.shareText,url:stationUrl()};
    if(window.CMDShare?.nativeShare)await window.CMDShare.nativeShare(data);
    else try{await navigator.clipboard?.writeText(`${data.text}\n${data.url}`)}catch{}
    renderIntentState('Route ready to send. The same seed rebuilds the same order.');
  }

  window.CMDRadio={
    getState:()=>({...activeIntentInfo(),intent:activeIntent,seed:radioSeed,url:stationUrl(),cycle:cycleNumber}),
    start:startIntent
  };

  function updateMediaSession(){
    if(!current||!('mediaSession' in navigator))return;
    try{
      navigator.mediaSession.metadata=new MediaMetadata({
        title:current.title||'Call Me Daddy',
        artist:current.artist||'Call Me Daddy',
        album:[current.project,current.variantCount>1?current.variantLabel:''].filter(Boolean).join(' · '),
        artwork:current.cover?[{src:new URL(current.cover,location.href).href}]:[]
      });
    }catch{}
  }

  function statusText(prefix='Playing'){
    if(!current||!cycle.length)return prefix;
    return `${prefix} · ${activeIntentInfo().label} · cycle ${cycleNumber} · ${cycleIndex+1}/${cycle.length}`;
  }

  async function hydrateYoutubeCard(song,card){
    if(!song.youtubeUrl)return;
    try{
      const endpoint=`https://www.youtube.com/oembed?url=${encodeURIComponent(song.youtubeUrl)}&format=json`;
      const res=await fetch(endpoint,{mode:'cors'});
      if(!res.ok)throw new Error('oEmbed unavailable');
      const data=await res.json();
      if(data.title){
        song.title=data.title;
        card.querySelector('h3').textContent=data.title;
        const art=card.querySelector('.song-art-hit');
        if(art)art.setAttribute('aria-label',variantsFor(song).length?`Play ${data.title}`:`Open ${data.title}`);
      }
      if(data.author_name)card.querySelector('.song-meta span:first-child').textContent=data.author_name;
      const img=card.querySelector('.song-cover');
      if(data.thumbnail_url&&img){img.src=data.thumbnail_url;img.alt=`${data.title||song.title} cover`;}
    }catch{}
  }

  songs.forEach(song=>{
    const card=document.createElement('article');
    card.className='song-card';
    card.dataset.song=song.id;
    const songVariants=variantsFor(song);
    const playable=Boolean(songVariants.length);
    const hasBackgroundVideo=Boolean(song.catalogVideo&&song.video);
    if(hasBackgroundVideo)card.classList.add('has-video');
    if(hasBackgroundVideo&&song.cover)card.classList.add('has-cover');

    const destination=song.experience||song.youtubeUrl||'';
    const artAction=playable
      ? `<button class="song-art-hit" type="button" aria-label="Play ${safe(song.title)}"><span class="song-art-cue">▶ Tap artwork to play</span></button>`
      : destination
        ? `<a class="song-art-hit" href="${safe(destination)}" aria-label="Open ${safe(song.title)}"><span class="song-art-cue">↗ Tap artwork to open</span></a>`
        : `<span class="song-art-hit is-disabled" aria-hidden="true"><span class="song-art-cue">Audio coming soon</span></span>`;
    const experienceLabel=song.youtubeUrl?'Song page →':'Open experience →';
    const backgroundVideo=hasBackgroundVideo
      ? `<video class="song-bg-video" autoplay muted loop playsinline preload="metadata"${song.cover?` poster="${safe(song.cover)}"`:''}><source src="${safe(song.video)}" type="video/mp4"></video>`
      : '';
    const versionMeta=songVariants.length>1?`${songVariants.length} versions`:song.kind||'song';
    const cardLyrics=resolveLyrics(song);
    const cardSunoUrl=resolveSunoUrl(song);

    card.innerHTML=`
      ${backgroundVideo}
      <img class="song-cover" src="${safe(song.cover||'')}" alt="${safe(song.title)} cover" loading="lazy">
      ${artAction}
      <div class="song-card-body">
        <div class="song-meta"><span>${safe(song.artist||'Call Me Daddy')}</span><span>${safe(song.year||'')}</span><span>${safe(versionMeta)}</span></div>
        <h3>${safe(song.title)}</h3>
        <p>${safe(song.description||'')}</p>
        <div class="song-actions">
          <button class="song-link song-share-action" type="button">↗ Share song</button>
          ${song.experience&&playable?`<a class="song-link" href="${safe(song.experience)}">${experienceLabel}</a>`:''}
          ${song.youtubeUrl?`<a class="song-link" href="${safe(song.youtubeUrl)}" target="_blank" rel="noopener">YouTube ↗</a>`:''}
          ${song.youtubeMusicUrl?`<a class="song-link" href="${safe(song.youtubeMusicUrl)}" target="_blank" rel="noopener">YouTube Music ↗</a>`:''}
          ${song.spotifyUrl?`<a class="song-link" href="${safe(song.spotifyUrl)}" target="_blank" rel="noopener">Spotify ↗</a>`:''}
          ${cardSunoUrl?`<a class="song-link" href="${safe(cardSunoUrl)}" target="_blank" rel="noopener">${safe(sunoLinkLabel(Boolean(cardLyrics)))}</a>`:''}
        </div>
        ${cardLyrics?`<details class="song-lyrics-details"><summary>Lyrics</summary><div class="song-lyrics-text">${formatLyricsHtml(cardLyrics)}</div></details>`:''}
      </div>`;

    const img=card.querySelector('.song-cover');
    if(!song.cover&&!hasBackgroundVideo)card.classList.add('fallback');
    if(!song.cover&&hasBackgroundVideo)img?.remove();
    img?.addEventListener('error',()=>card.classList.add('fallback'),{once:true});
    card.querySelector('button.song-art-hit')?.addEventListener('click',()=>selectSong(song));
    card.querySelector('.song-share-action')?.addEventListener('click',()=>shareSong(song,songVariants[0]||null));
    grid.appendChild(card);
    hydrateYoutubeCard(song,card);
  });

  function setActiveCard(id){
    document.querySelectorAll('.song-card').forEach(card=>{
      const selected=card.dataset.song===id;
      const playing=selected&&!audio.paused&&!audio.ended;
      card.classList.toggle('is-selected',selected);
      card.classList.toggle('is-playing',playing);
      const cue=card.querySelector('button.song-art-hit .song-art-cue');
      if(cue)cue.textContent=playing?'❚❚ Tap artwork to pause':selected?'▶ Tap artwork to resume':'▶ Tap artwork to play';
    });
  }

  function updateSongLink(){
    const href=current?.experience||'';
    songLink.hidden=!href;
    if(href)songLink.href=href;
  }

  function currentVariantId(){
    return current?.variantId||'';
  }

  function syncTasteButtons(){
    const taste=window.CMDListenerTaste?.get?.(lastSongId,currentVariantId())||null;
    likeBtn?.classList.toggle('is-active',taste==='like');
    dislikeBtn?.classList.toggle('is-active',taste==='dislike'||taste==='killed');
    if(likeBtn)likeBtn.setAttribute('aria-pressed',String(taste==='like'));
    if(dislikeBtn)dislikeBtn.setAttribute('aria-pressed',String(taste==='dislike'||taste==='killed'));
  }

  function renderClusterChip(track){
    if(!clusterChip)return;
    const label=track?.clusterLabel||window.CMDTasteClusters?.clusterFor?.(track?.songId||track?.id)?.label||'';
    clusterChip.textContent=label||'';
    clusterChip.hidden=!label;
  }

  function refreshTrackWhy(track){
    if(!track)return track;
    const songId=track.songId||track.id;
    const variantId=track.variantId||'';
    const cluster=window.CMDTasteClusters?.clusterFor?.(songId)||null;
    const clusterWhy=window.CMDTasteClusters?.explainClusterWhy?.(songId,window.CMDListenerTaste,activeIntent,variantId)||[];
    const why=[];
    const taste=window.CMDListenerTaste?.get?.(songId,variantId)||null;
    if(taste==='killed')why.push('Second skip — parked this version');
    else if(taste==='like')why.push('you liked this');
    clusterWhy.forEach(reason=>{if(reason&&!why.includes(reason))why.push(reason)});
    try{
      const intensity=window.CMDContentIntensity;
      if(intensity?.isRaw?.(songId)){
        const guard=intensity.whyGuardCopy?.(vibePolicy())||'';
        if(guard&&!why.includes(guard))why.push(guard);
      }
    }catch{}
    (Array.isArray(track.why)?track.why:[]).forEach(reason=>{
      if(!reason||why.includes(reason))return;
      if(reason==='you liked this'||reason==='Second skip — parked this version')return;
      why.push(reason);
    });
    if(!why.length)why.push('controlled chaos');
    track.why=why;
    track.whyText=why.length===1?`Why this song: ${why[0]}.`:`Why this song: ${why.slice(0,3).join(' · ')}.`;
    track.clusterId=cluster?.id||track.clusterId||'';
    track.clusterLabel=cluster?.label||track.clusterLabel||'';
    return track;
  }

  function renderWhy(track){
    if(whyLine){
      const text=track?.whyText||(Array.isArray(track?.why)&&track.why.length?`Why this song: ${track.why.slice(0,3).join(' · ')}.`:'');
      whyLine.textContent=text||'';
      whyLine.hidden=!text;
    }
    renderClusterChip(track);
  }


  function renderPlayerLyrics(track){
    if(!lyricsPanel)return;
    const text=resolveLyrics(track);
    const suno=resolveSunoUrl(track);
    if(lyricsSuno){
      if(suno){
        lyricsSuno.hidden=false;
        lyricsSuno.href=suno;
        lyricsSuno.textContent=sunoLinkLabel(!!text);
      }else{
        lyricsSuno.hidden=true;
        lyricsSuno.removeAttribute('href');
      }
    }
    if(!text){
      if(lyricsBody){lyricsBody.innerHTML='';lyricsBody.hidden=true;}
      if(lyricsEmpty)lyricsEmpty.hidden=false;
      if(lyricsToggle)lyricsToggle.setAttribute('aria-expanded','false');
      // In Lyrics mode keep the panel visible with empty state; otherwise hide.
      lyricsPanel.hidden=paneMode!=='lyrics';
      return;
    }
    if(lyricsEmpty)lyricsEmpty.hidden=true;
    if(lyricsBody){
      lyricsBody.innerHTML=formatLyricsHtml(text);
      // Lyrics mode shows body prominently; otherwise keep collapsed until toggled.
      lyricsBody.hidden=paneMode!=='lyrics';
    }
    if(lyricsToggle)lyricsToggle.setAttribute('aria-expanded',String(paneMode==='lyrics'));
    lyricsPanel.hidden=paneMode!=='lyrics';
  }

  lyricsToggle?.addEventListener('click',()=>{
    if(!lyricsBody)return;
    if(paneMode!=='lyrics'){
      applyPaneMode('lyrics');
      return;
    }
    const open=lyricsBody.hidden;
    lyricsBody.hidden=!open;
    if(lyricsEmpty&&!lyricsEmpty.hidden){/* empty state stays */}
    lyricsToggle.setAttribute('aria-expanded',String(open));
  });

  paneTabs?.addEventListener('click',event=>{
    const btn=event.target?.closest?.('[data-pane]');
    if(!btn||!paneTabs.contains(btn))return;
    event.preventDefault();
    event.stopPropagation();
    selectPaneMode(btn.dataset.pane);
  });

  sheetExpandBtn?.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    expandSheet();
  });
  sheetCollapseBtn?.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    collapseSheet();
  });
  sheetDoneBtn?.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    doneSheet();
  });
  const onFullLyrics=event=>{
    event.preventDefault();
    event.stopPropagation();
    jumpFullLyrics();
  };
  sheetFullLyricsBtn?.addEventListener('click',onFullLyrics);
  sheetFullLyricsInline?.addEventListener('click',onFullLyrics);
  sheetHandle?.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    if(sheetHeight==='full'||sheetHeight==='info')collapseSheet();
    else expandSheet();
  });

  function loadTrack(track,autoplay=true){
    if(!track?.audio)return;
    current=track;
    lastSongId=track.songId||track.id;
    audio.src=track.audio;
    title.textContent=track.title;
    const parts=[track.artist,track.project];
    if(track.variantCount>1)parts.push(track.variantLabel);
    label.textContent=parts.filter(Boolean).join(' · ');
    status.textContent=autoplay?statusText('Loading'):statusText('Ready');
    refreshTrackWhy(track);
    renderWhy(track);
    renderPlayerLyrics(track);
    cover.src=track.cover||'';
    cover.alt=`${track.title} cover`;
    cover.onerror=()=>{cover.removeAttribute('src');cover.alt='';};
    bar.style.width='0%';
    player.hidden=false;
    document.body.classList.add('catalog-player-open');
    applyPaneMode(paneMode,{persist:false});
    updateSongLink();
    setActiveCard(lastSongId);
    syncTasteButtons();
    updateMediaSession();

    if(autoplay){
      audio.play().catch(()=>{
        status.textContent=statusText('Tap play to start');
        play.textContent='▶';
        setActiveCard(lastSongId);
      });
    }
  }

  function ensureCycle(){if(!cycle.length)buildCycle();}

  function selectSong(song){
    if(!variantsFor(song).length)return;
    ensureCycle();
    let targetIndex=cycle.findIndex(track=>(track.songId||track.id)===song.id);
    if(targetIndex<0){
      // Intentional pick (search / card) still plays raw even when safe-mode gated the route.
      const forced=cycleEngine?cycleEngine.build([song],{
        lastSongId,
        intent:activeIntent,
        seed:radioSeed,
        cycleNumber:Math.max(1,cycleNumber),
        ignoreHistory:true,
        includeHeavy:true
      }):[{...song,songId:song.id}];
      if(forced[0]){
        cycle=[forced[0],...cycle];
        targetIndex=0;
      }
    }
    if(targetIndex<0)return;
    const track=cycle[targetIndex];
    if(current&&(current.songId||current.id)===song.id){
      if(audio.paused)audio.play().catch(()=>{});else audio.pause();
      return;
    }
    cycleIndex=targetIndex;
    loadTrack(track,true);
  }

  function nextTrack(){
    ensureCycle();
    if(cycleIndex>=cycle.length-1){
      buildCycle();
    }
    cycleIndex+=1;
    loadTrack(cycle[cycleIndex],true);
  }

  function previous(){
    if(!current){nextTrack();return;}
    if(audio.currentTime>5){audio.currentTime=0;if(audio.paused)audio.play().catch(()=>{});return;}
    if(cycleIndex>0){cycleIndex-=1;loadTrack(cycle[cycleIndex],true);return;}
    audio.currentTime=0;
  }

  play.addEventListener('click',()=>{
    if(!current){nextTrack();return;}
    if(audio.paused)audio.play().catch(()=>{});else audio.pause();
  });
  prev?.addEventListener('click',previous);
  next?.addEventListener('click',nextTrack);

  const swipeIgnore='.tactile-scrubber-shell, .tactile-scrubber, [data-no-swipe], button, a, input, textarea, select, #catalogProgress, .catalog-progress';
  const swipeTargets=[cover,player?.querySelector('.catalog-player-inner'),player?.querySelector('.player-copy')].filter(Boolean);
  if(window.CMDSwipeNav?.attachMany){
    window.CMDSwipeNav.attachMany(swipeTargets,{onPrev:previous,onNext:nextTrack,threshold:40,ignore:swipeIgnore});
  }else{
    swipeTargets.forEach(target=>window.CMDSwipeNav?.attach({target,onPrev:previous,onNext:nextTrack,threshold:40,ignore:swipeIgnore}));
  }
  if(grid){
    window.CMDSwipeNav?.attach({
      target:grid,
      onPrev:previous,
      onNext:nextTrack,
      threshold:40,
      ignore:'button, a, input, textarea, select'
    });
  }

  likeBtn?.addEventListener('click',()=>{
    if(!lastSongId)return;
    window.CMDListenerTaste?.like?.(lastSongId,currentVariantId());
    window.CMDContentIntensity?.noteTasteChange?.();
    syncTasteButtons();
    renderVibeGuard();
    if(current){
      refreshTrackWhy(current);
      renderWhy(current);
    }
    window.CMDTasteRail?.refresh?.();
  });
  dislikeBtn?.addEventListener('click',()=>{
    if(!lastSongId)return;
    const result=window.CMDListenerTaste?.dislike?.(lastSongId,currentVariantId());
    syncTasteButtons();
    if(result==='killed'&&status){
      status.textContent=statusText('Parked this version');
    }
    window.CMDTasteRail?.refresh?.();
    nextTrack();
  });

  function applySearchFilter(query){
    const matcher=window.CMDCatalogSearch?.matchesSong;
    let visible=0;
    document.querySelectorAll('.song-card').forEach(card=>{
      const song=songs.find(item=>item.id===card.dataset.song);
      const ok=matcher?matcher(song,query):true;
      card.hidden=!ok;
      if(ok)visible+=1;
    });
    if(searchEmpty){
      searchEmpty.hidden=visible>0;
    }
    if(count&&!query){
      count.textContent=`${playableSongs.length} songs · ${totalVersions} playable versions · intention radio`;
    }else if(count){
      count.textContent=`${visible} match${visible===1?'':'es'} · ${query.trim()||'search'}`;
    }
  }

  function onHintClick(event){
    const more=event.target.closest('[data-more-hints]');
    if(more){
      setHintsExpanded(true);
      return;
    }
    const chip=event.target.closest('[data-hint]');
    if(!chip)return;
    setSearchQuery(chip.dataset.hint||'');
    if(paneMode!=='search'&&searchInput){
      try{searchInput.focus({preventScroll:true})}catch{searchInput.focus()}
    }else if(playerSearchInput){
      try{playerSearchInput.focus({preventScroll:true})}catch{playerSearchInput.focus()}
    }
  }

  function mountSearch(){
    if(!searchInput&&!playerSearchInput)return;
    searchHintsAll=window.CMDCatalogSearch?.buildHints?.(songs,intents)||[];
    if(searchDatalist){
      searchDatalist.innerHTML=searchHintsAll.map(hint=>`<option value="${safe(hint)}"></option>`).join('');
    }
    setHintsExpanded(false);
    searchHints?.addEventListener('click',onHintClick);
    playerSearchHints?.addEventListener('click',onHintClick);
    searchInput?.addEventListener('input',()=>setSearchQuery(searchInput.value,{from:'page'}));
    playerSearchInput?.addEventListener('input',()=>setSearchQuery(playerSearchInput.value,{from:'player'}));
    document.getElementById('catalogSearchClear')?.addEventListener('click',()=>{
      setSearchQuery('');
      searchInput?.focus();
    });
    document.getElementById('catalogPlayerSearchClear')?.addEventListener('click',()=>{
      setSearchQuery('');
      playerSearchInput?.focus();
    });
    searchExpand?.addEventListener('click',()=>expandSearchBar());

    // Collapse page search after scrolling past it
    if(searchBar&&'IntersectionObserver' in window){
      const io=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          if(entry.target!==searchBar)return;
          // Once the bar leaves the top of the viewport, collapse to a slim chip
          if(!entry.isIntersecting&&entry.boundingClientRect.top<0){
            setSearchBarCollapsed(true);
          }
        });
      },{root:null,threshold:0,rootMargin:'-8px 0px 0px 0px'});
      io.observe(searchBar);
    }else if(searchBar){
      let lastY=window.scrollY||0;
      window.addEventListener('scroll',()=>{
        const y=window.scrollY||0;
        const rect=searchBar.getBoundingClientRect();
        if(y>lastY+4&&rect.bottom<12)setSearchBarCollapsed(true);
        lastY=y;
      },{passive:true});
    }
  }
  mountSearch();

  // Mini player: scroll down → mini; scroll up restores. Hysteresis avoids twitchy toggles.
  (function mountPlayerScrollChrome(){
    if(!player)return;
    let lastY=window.scrollY||0;
    let accum=0; // signed: + down, − up
    let dir=0; // -1|0|1 current accumulation direction
    let cooldownUntil=0;
    const THRESH=48; // px accumulated in one direction before toggle
    const COOLDOWN_MS=300;
    player.addEventListener('pointerdown',()=>{playerPointerDown=true},{passive:true});
    player.addEventListener('pointerup',()=>{playerPointerDown=false},{passive:true});
    player.addEventListener('pointercancel',()=>{playerPointerDown=false},{passive:true});
    window.addEventListener('scroll',()=>{
      if(player.hidden||playerPointerDown||keyboardOpen)return;
      // Don't fight an intentional full/info sheet with scroll chrome.
      if(sheetHeight==='full'||sheetHeight==='info'){lastY=window.scrollY||0;accum=0;dir=0;return}
      // Don't toggle while typing in search.
      const ae=document.activeElement;
      if(ae&&(ae===playerSearchInput||ae===searchInput)){lastY=window.scrollY||0;accum=0;dir=0;return}
      const now=Date.now();
      if(now<cooldownUntil){lastY=window.scrollY||0;return}
      const y=window.scrollY||0;
      const dy=y-lastY;
      lastY=y;
      if(!dy)return;
      const stepDir=dy>0?1:-1;
      if(dir&&stepDir!==dir){
        // Opposite direction: ignore until we rebuild threshold the other way.
        accum=dy;
        dir=stepDir;
        return;
      }
      dir=stepDir;
      accum+=dy;
      if(Math.abs(accum)<THRESH)return;
      accum=0;
      dir=0;
      cooldownUntil=now+COOLDOWN_MS;
      if(stepDir>0){
        if(sheetHeight!=='mini')applySheetHeight('mini',{fromScroll:true});
      }else if(sheetHeight==='mini'){
        const restore=SHEET_HEIGHTS.includes(sheetHeightBeforeMini)&&sheetHeightBeforeMini!=='mini'
          ?sheetHeightBeforeMini
          :'dock';
        applySheetHeight(restore,{fromScroll:true,persist:false});
        // Re-apply pane visibility without Page→mini clamp undoing the restore.
        if(paneMode!=='page')applyPaneMode(paneMode,{persist:false});
      }
    },{passive:true});
    // Ignore primarily-horizontal touch moves used for scrub / swipe-nav
    let touchStartX=0,touchStartY=0;
    window.addEventListener('touchstart',e=>{
      const t=e.changedTouches?.[0];
      if(!t)return;
      touchStartX=t.clientX;touchStartY=t.clientY;
    },{passive:true});
    window.addEventListener('touchmove',e=>{
      const t=e.changedTouches?.[0];
      if(!t)return;
      const dx=Math.abs(t.clientX-touchStartX);
      const dy=Math.abs(t.clientY-touchStartY);
      if(dx>dy&&dx>8)playerPointerDown=true; // treat as horizontal gesture briefly
    },{passive:true});
    window.addEventListener('touchend',()=>{window.setTimeout(()=>{playerPointerDown=false},50)},{passive:true});
  })();

  // Soft keyboard: keep active search input above the keyboard via visualViewport.
  (function mountKeyboardDock(){
    const inputs=[playerSearchInput,searchInput].filter(Boolean);
    if(!inputs.length||!player)return;
    const vv=window.visualViewport;
    let raf=0;
    let listening=false;
    const onVv=()=>{
      if(raf)return;
      raf=window.requestAnimationFrame(()=>{
        raf=0;
        if(!keyboardOpen)return;
        const inset=vv
          ?Math.max(0,(window.innerHeight||0)-vv.height-vv.offsetTop)
          :0;
        document.documentElement.style.setProperty('--vv-keyboard-inset',inset+'px');
        player.style.bottom=inset+'px';
        // Keep focused search visible (page search may sit under chrome).
        const ae=document.activeElement;
        if(ae&&inputs.includes(ae)){
          try{ae.scrollIntoView({block:'nearest',inline:'nearest'})}catch{}
        }
      });
    };
    const start=()=>{
      if(listening)return;
      listening=true;
      keyboardOpen=true;
      player.classList.add('keyboard-open');
      document.body.classList.add('cmd-keyboard-open');
      if(vv){
        vv.addEventListener('resize',onVv);
        vv.addEventListener('scroll',onVv);
      }else{
        window.addEventListener('resize',onVv);
      }
      onVv();
    };
    const stop=()=>{
      if(!listening)return;
      listening=false;
      keyboardOpen=false;
      if(raf){window.cancelAnimationFrame(raf);raf=0}
      if(vv){
        vv.removeEventListener('resize',onVv);
        vv.removeEventListener('scroll',onVv);
      }else{
        window.removeEventListener('resize',onVv);
      }
      player.classList.remove('keyboard-open');
      document.body.classList.remove('cmd-keyboard-open');
      player.style.bottom='';
      document.documentElement.style.removeProperty('--vv-keyboard-inset');
    };
    inputs.forEach(el=>{
      el.addEventListener('focus',start);
      el.addEventListener('blur',()=>{
        // blur→focus between related fields: defer stop
        window.setTimeout(()=>{
          if(!inputs.includes(document.activeElement))stop();
        },0);
      });
    });
  })();

  // Restore / choose initial pane + sheet height (full demoted→dock on reload)
  paneMode=readStoredPaneMode()||defaultPaneMode();
  sheetHeight=readStoredSheetHeight()||defaultSheetHeight();
  if(paneMode==='page')sheetHeight='mini';
  applyPaneMode(paneMode,{persist:false});
  // applyPaneMode may have adjusted height; re-apply stored non-page height when appropriate
  if(paneMode!=='page'){
    const stored=readStoredSheetHeight()||defaultSheetHeight();
    if(stored!=='mini')applySheetHeight(stored,{persist:false});
  }
  updateSheetChromeUi();

  audio.addEventListener('play',()=>{
    play.textContent='❚❚';
    play.setAttribute('aria-label','Pause');
    status.textContent=statusText('Playing');
    setActiveCard(lastSongId);
    cycleEngine?.remember?.(current);
    window.CMDPersistentSite?.setSession(true);
    if('mediaSession' in navigator)navigator.mediaSession.playbackState='playing';
  });
  audio.addEventListener('playing',()=>{
    if(current)status.textContent=statusText('Playing');
    setActiveCard(lastSongId);
  });
  audio.addEventListener('pause',()=>{
    play.textContent='▶';
    play.setAttribute('aria-label','Play');
    if(current&&!audio.ended)status.textContent=statusText('Paused');
    setActiveCard(lastSongId);
    if('mediaSession' in navigator)navigator.mediaSession.playbackState='paused';
  });
  audio.addEventListener('waiting',()=>{if(current)status.textContent=statusText('Buffering')});
  audio.addEventListener('canplay',()=>{
    if(!current||audio.ended)return;
    status.textContent=statusText(audio.paused?'Ready':'Playing');
    setActiveCard(lastSongId);
  });
  audio.addEventListener('ended',()=>{bar.style.width='100%';nextTrack();});
  audio.addEventListener('error',()=>{
    status.textContent='This version could not be loaded. Skipping…';
    play.textContent='▶';
    setActiveCard(lastSongId);
    window.setTimeout(nextTrack,500);
  });
  audio.addEventListener('timeupdate',()=>{
    if(audio.duration)bar.style.width=`${(audio.currentTime/audio.duration)*100}%`;
    if('mediaSession' in navigator&&audio.duration&&Number.isFinite(audio.duration)){
      try{navigator.mediaSession.setPositionState({duration:audio.duration,playbackRate:audio.playbackRate,position:Math.min(audio.currentTime,audio.duration)})}catch{}
    }
  });

  progress.addEventListener('click',e=>{
    if(!audio.duration)return;
    const r=progress.getBoundingClientRect();
    const ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    audio.currentTime=ratio*audio.duration;
  });

  if('mediaSession' in navigator){
    try{
      navigator.mediaSession.setActionHandler('play',()=>audio.play().catch(()=>{}));
      navigator.mediaSession.setActionHandler('pause',()=>audio.pause());
      navigator.mediaSession.setActionHandler('previoustrack',previous);
      navigator.mediaSession.setActionHandler('nexttrack',nextTrack);
      navigator.mediaSession.setActionHandler('seekbackward',details=>{audio.currentTime=Math.max(0,audio.currentTime-(details.seekOffset||10))});
      navigator.mediaSession.setActionHandler('seekforward',details=>{audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+(details.seekOffset||10))});
    }catch{}
  }

  mountIntentionRadio();
  buildCycle();

  window.CMDMusicCatalog={
    selectSong,
    playSongId(id){
      const song=songs.find(item=>item.id===id);
      if(song)selectSong(song);
    },
    getCurrent:()=>current,
    next:nextTrack,
    previous
  };
})();
