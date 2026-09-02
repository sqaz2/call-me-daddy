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
  const cover=document.getElementById('playerCover');
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
    script.src='/persistent-site-browser.js?v=20260902-1';
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
  const buildCycle=()=>{
    cycleNumber+=1;
    cycle=cycleEngine?cycleEngine.build(playableSongs,{lastSongId,intent:activeIntent,seed:radioSeed,cycleNumber,ignoreHistory:deterministicRoute}):playableSongs.map(song=>({...song,songId:song.id,variantLabel:song.kind||'Main version',variantCount:1}));
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
      </div>`;
    intentMount.addEventListener('click',event=>{
      const intentButton=event.target.closest('[data-intent]');
      if(intentButton){startIntent(intentButton.dataset.intent);return;}
      if(event.target.closest('[data-radio-play]')){startIntent(activeIntent);return;}
      if(event.target.closest('[data-radio-share]'))shareStation();
    });
    renderIntentState();
  }

  function startIntent(intent){
    activeIntent=cycleEngine?.normalizeIntent(intent)||'surprise';
    radioSeed=cycleEngine?.createSeed?.()||Date.now().toString(36);
    deterministicRoute=false;
    cycle=[];
    cycleIndex=-1;
    cycleNumber=0;
    syncUrl();
    renderIntentState('New route built.');
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
          ${song.sunoUrl?`<a class="song-link" href="${safe(song.sunoUrl)}" target="_blank" rel="noopener">Suno ↗</a>`:''}
        </div>
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
    cover.src=track.cover||'';
    cover.alt=`${track.title} cover`;
    cover.onerror=()=>{cover.removeAttribute('src');cover.alt='';};
    bar.style.width='0%';
    player.hidden=false;
    document.body.classList.add('catalog-player-open');
    updateSongLink();
    setActiveCard(lastSongId);
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
      buildCycle();
      targetIndex=cycle.findIndex(track=>(track.songId||track.id)===song.id);
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
})();
