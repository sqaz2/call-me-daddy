(()=>{
  const playCoverSrc='/media/songs/2026/09/superstore-effect/cover.jpg';
  const player=document.getElementById('ssPlayer');
  const audio=document.getElementById('ssAudio');
  const cover=document.getElementById('ssPlayerCover');
  const label=document.getElementById('ssPlayerLabel');
  const title=document.getElementById('ssPlayerTitle');
  const status=document.getElementById('ssPlayerStatus');
  const play=document.getElementById('ssPlay');
  const previous=document.getElementById('ssPrev');
  const next=document.getElementById('ssNext');
  const share=document.getElementById('ssPlayerShare');
  const progress=document.getElementById('ssProgress');
  const bar=document.getElementById('ssProgressBar');
  const coverButton=document.querySelector('.ss-cover-button');
  const coverPlay=document.querySelector('.ss-cover-play');
  if(!player||!audio)return;

  const fallback={
    id:'superstore-effect',songId:'superstore-effect',variantId:'main',variantCount:1,
    title:'the superstore effect',artist:'Call Me Daddy',project:'Red Deer Civic Emergency',
    audio:'/media/songs/2026/09/superstore-effect/audio.mp3',
    cover:playCoverSrc,
    experience:'/superstore-effect/',radioIntent:'laugh'
  };
  const catalogSong=(window.CMD_SONGS||[]).find(song=>song.id===fallback.id);
  const local={...fallback,...catalogSong,songId:fallback.id,variantId:'main',variantCount:1,cover:playCoverSrc,radioIntent:'laugh'};
  const radio=window.CMDPlaylistRadio?.create({intent:'laugh',excludeIds:[local.id],lastSongId:local.id});
  const queue=[local];
  let index=-1;
  let current=null;
  let coverStarted=false;

  const syncCoverState=()=>{
    const localPlaying=index===0&&!audio.paused&&!audio.ended;
    if(localPlaying)coverStarted=true;
    if(coverPlay)coverPlay.hidden=coverStarted||localPlaying;
    if(coverButton?.setAttribute)coverButton.setAttribute('aria-label',localPlaying?'Pause the superstore effect':'Play the superstore effect');
  };
  const media=track=>{
    if(!track||!('mediaSession' in navigator)||typeof MediaMetadata==='undefined')return;
    try{navigator.mediaSession.metadata=new MediaMetadata({title:track.title,artist:track.artist||'Call Me Daddy',album:track.project||'Play the site',artwork:track.cover?[{src:new URL(track.cover,location.href).href}]:[]})}catch{}
  };
  const paint=track=>{
    current=track;
    cover.hidden=!track.cover;
    if(track.cover)cover.src=track.cover;
    label.textContent=index===0?'Red Deer civic satire':`Play the site${track.variantCount>1?` · ${track.variantLabel}`:''}`;
    title.textContent=track.title;
    title.href=track.experience||'/music/';
    status.textContent='Loading…';
    bar.style.width='0%';
    media(track);
    syncCoverState();
  };
  const load=(target,autoplay=true)=>{
    index=Math.max(0,Math.min(queue.length-1,target));
    const track=queue[index];
    paint(track);
    audio.src=track.audio;
    audio.load();
    player.hidden=false;
    document.body.classList.add('ss-player-open');
    window.CMDPersistentSite?.refreshClearance?.();
    if(autoplay)audio.play().catch(()=>{status.textContent='Ready · tap ▶ to continue';syncCoverState()});
  };
  const ensureNext=()=>{
    if(index<queue.length-1)return index+1;
    const track=radio?.next();
    if(!track)return -1;
    queue.push(track);
    return queue.length-1;
  };
  const advance=()=>{
    const target=ensureNext();
    if(target<0){status.textContent='Radio unavailable · open Music';play.textContent='▶';syncCoverState();return;}
    load(target,true);
  };
  const start=()=>{
    if(index!==0)load(0,true);
    else if(audio.paused)audio.play().catch(()=>{status.textContent='Ready · tap ▶ to continue';syncCoverState()});
  };

  document.querySelectorAll('[data-ss-play]').forEach(button=>button.addEventListener('click',()=>{
    if(index===0&&!audio.paused){audio.pause();return;}
    start();
  }));
  play.addEventListener('click',()=>{if(index<0){load(0,true);return}if(audio.paused)audio.play().catch(()=>{});else audio.pause()});
  next.addEventListener('click',advance);
  previous.addEventListener('click',()=>{if(index>0)load(index-1,true);else if(index===0){audio.currentTime=0;audio.play().catch(()=>{})}});
  share.addEventListener('click',()=>window.CMDPlaylistRadio?.share(current||local));
  progress.addEventListener('click',event=>{if(!audio.duration)return;const rect=progress.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(audio.duration,((event.clientX-rect.left)/rect.width)*audio.duration))});

  audio.addEventListener('play',()=>{play.textContent='❚❚';status.textContent='Playing';syncCoverState();window.CMDPersistentSite?.setSession(true);window.CMDPersistentSite?.refreshClearance?.();window.CMDCatalogCycle?.remember?.(current);try{navigator.mediaSession.playbackState='playing'}catch{}});
  audio.addEventListener('pause',()=>{if(!audio.ended){play.textContent='▶';status.textContent='Paused'}syncCoverState();try{navigator.mediaSession.playbackState='paused'}catch{}});
  audio.addEventListener('ended',()=>{syncCoverState();advance()});
  audio.addEventListener('timeupdate',()=>{if(audio.duration)bar.style.width=`${audio.currentTime/audio.duration*100}%`});
  audio.addEventListener('error',()=>{if(!audio.src)return;status.textContent='Skipping unavailable track…';syncCoverState();window.setTimeout(advance,500)});
  document.querySelector('.ss-lyrics details')?.addEventListener('toggle',event=>{const marker=event.currentTarget.querySelector('summary b');if(marker)marker.textContent=event.currentTarget.open?'−':'+'});

  if('mediaSession' in navigator){try{
    navigator.mediaSession.setActionHandler('play',()=>audio.play());
    navigator.mediaSession.setActionHandler('pause',()=>audio.pause());
    navigator.mediaSession.setActionHandler('nexttrack',advance);
    navigator.mediaSession.setActionHandler('previoustrack',()=>{if(index>0)load(index-1,true)});
    navigator.mediaSession.setActionHandler('seekbackward',details=>{audio.currentTime=Math.max(0,audio.currentTime-(details.seekOffset||10))});
    navigator.mediaSession.setActionHandler('seekforward',details=>{audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+(details.seekOffset||10))});
  }catch{}}
  syncCoverState();
})();
