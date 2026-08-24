(()=>{
  const songs=Array.isArray(window.CMD_SONGS)?window.CMD_SONGS:[];
  const cycleEngine=window.CMDCatalogCycle;
  const variantsFor=song=>cycleEngine?cycleEngine.variants(song):(song?.audio?[{id:'main',label:song.kind||'Main version',audio:song.audio}]:[]);
  const playableSongs=songs.filter(song=>variantsFor(song).length);
  const totalVersions=cycleEngine?cycleEngine.count(playableSongs):playableSongs.length;
  const grid=document.getElementById('songGrid');
  const count=document.getElementById('catalogCount');
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

  if(!window.CMDPersistentSite){
    const script=document.createElement('script');
    script.src='/persistent-site-browser.js?v=20260823-1';
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

  count.textContent=`${playableSongs.length} songs · ${totalVersions} playable versions · endless shuffle`;

  if(!songs.length){
    grid.innerHTML='<p class="catalog-empty">No tracks have been added yet.</p>';
    return;
  }

  const safe=(value='')=>String(value).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const buildCycle=()=>{
    cycleNumber+=1;
    cycle=cycleEngine?cycleEngine.build(playableSongs,{lastSongId}):playableSongs.map(song=>({...song,songId:song.id,variantLabel:song.kind||'Main version',variantCount:1}));
    cycleIndex=-1;
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
    return `${prefix} · cycle ${cycleNumber} · ${cycleIndex+1}/${cycle.length}`;
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
    window.CMDPersistentSite?.setSession(true);
    if('mediaSession' in navigator)navigator.mediaSession.playbackState='playing';
  });
  audio.addEventListener('pause',()=>{
    play.textContent='▶';
    play.setAttribute('aria-label','Play');
    if(current&&!audio.ended)status.textContent=statusText('Paused');
    setActiveCard(lastSongId);
    if('mediaSession' in navigator)navigator.mediaSession.playbackState='paused';
  });
  audio.addEventListener('waiting',()=>{if(current)status.textContent=statusText('Buffering')});
  audio.addEventListener('canplay',()=>{if(current&&audio.paused&&!audio.ended){status.textContent=statusText('Ready');setActiveCard(lastSongId)}});
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

  buildCycle();
})();