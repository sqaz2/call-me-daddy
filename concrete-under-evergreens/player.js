(()=>{
  const player=document.getElementById('concretePlayer');
  const audio=document.getElementById('concreteAudio');
  const cover=document.getElementById('concretePlayerCover');
  const label=document.getElementById('concretePlayerLabel');
  const title=document.getElementById('concretePlayerTitle');
  const status=document.getElementById('concretePlayerStatus');
  const play=document.getElementById('concretePlay');
  const previous=document.getElementById('concretePrev');
  const next=document.getElementById('concreteNext');
  const share=document.getElementById('concretePlayerShare');
  const progress=document.getElementById('concreteProgress');
  const bar=document.getElementById('concreteProgressBar');
  if(!player||!audio)return;

  const fallback={
    id:'concrete-under-evergreens',songId:'concrete-under-evergreens',variantId:'main',variantCount:1,
    title:'Concrete Under Evergreens',artist:'Call Me Daddy',project:'Lacombe Civic Emergency',
    audio:'/media/songs/2026/08/concrete-under-evergreens/audio.mp3',
    cover:'/media/songs/2026/08/concrete-under-evergreens/cover.jpg',
    experience:'/concrete-under-evergreens/',radioIntent:'laugh'
  };
  const catalogSong=(window.CMD_SONGS||[]).find(song=>song.id===fallback.id);
  const local={...fallback,...catalogSong,songId:fallback.id,variantId:'main',variantCount:1,radioIntent:'laugh'};
  const radio=window.CMDPlaylistRadio?.create({intent:'laugh',excludeIds:[local.id],lastSongId:local.id});
  const queue=[local];
  let index=-1;
  let current=null;

  const media=track=>{
    if(!track||!('mediaSession' in navigator)||typeof MediaMetadata==='undefined')return;
    try{navigator.mediaSession.metadata=new MediaMetadata({title:track.title,artist:track.artist||'Call Me Daddy',album:track.project||'Play the site',artwork:track.cover?[{src:new URL(track.cover,location.href).href}]:[]})}catch{}
  };
  const paint=track=>{
    current=track;
    cover.hidden=!track.cover;
    if(track.cover)cover.src=track.cover;
    label.textContent=index===0?'Lacombe civic ballad':`Play the site${track.variantCount>1?` · ${track.variantLabel}`:''}`;
    title.textContent=track.title;
    title.href=track.experience||'/music/';
    status.textContent='Loading…';
    bar.style.width='0%';
    media(track);
  };
  const load=(target,autoplay=true)=>{
    index=Math.max(0,Math.min(queue.length-1,target));
    const track=queue[index];
    paint(track);
    audio.src=track.audio;
    audio.load();
    player.hidden=false;
    document.body.classList.add('concrete-player-open');
    window.CMDPersistentSite?.refreshClearance?.();
    if(autoplay)audio.play().catch(()=>{status.textContent='Ready · tap ▶ to continue'});
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
    if(target<0){status.textContent='Radio unavailable · open Music';play.textContent='▶';return;}
    load(target,true);
  };
  const start=()=>{
    if(index!==0)load(0,true);
    else if(audio.paused)audio.play().catch(()=>{status.textContent='Ready · tap ▶ to continue'});
  };

  document.querySelectorAll('[data-concrete-play]').forEach(button=>button.addEventListener('click',start));
  play.addEventListener('click',()=>{if(index<0){load(0,true);return}if(audio.paused)audio.play().catch(()=>{});else audio.pause()});
  next.addEventListener('click',advance);
  previous.addEventListener('click',()=>{if(index>0)load(index-1,true);else if(index===0){audio.currentTime=0;audio.play().catch(()=>{})}});
  share.addEventListener('click',()=>window.CMDPlaylistRadio?.share(current));
  progress.addEventListener('click',event=>{if(!audio.duration)return;const rect=progress.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(audio.duration,((event.clientX-rect.left)/rect.width)*audio.duration))});

  audio.addEventListener('play',()=>{play.textContent='❚❚';status.textContent='Playing';window.CMDPersistentSite?.setSession(true);window.CMDPersistentSite?.refreshClearance?.();window.CMDCatalogCycle?.remember?.(current);try{navigator.mediaSession.playbackState='playing'}catch{}});
  audio.addEventListener('pause',()=>{if(!audio.ended){play.textContent='▶';status.textContent='Paused'}try{navigator.mediaSession.playbackState='paused'}catch{}});
  audio.addEventListener('ended',advance);
  audio.addEventListener('timeupdate',()=>{if(audio.duration)bar.style.width=`${audio.currentTime/audio.duration*100}%`});
  audio.addEventListener('error',()=>{if(!audio.src)return;status.textContent='Skipping unavailable track…';window.setTimeout(advance,500)});
  document.querySelector('.concrete-lyrics details')?.addEventListener('toggle',event=>{const marker=event.currentTarget.querySelector('summary b');if(marker)marker.textContent=event.currentTarget.open?'−':'+'});

  if('mediaSession' in navigator){try{
    navigator.mediaSession.setActionHandler('play',()=>audio.play());
    navigator.mediaSession.setActionHandler('pause',()=>audio.pause());
    navigator.mediaSession.setActionHandler('nexttrack',advance);
    navigator.mediaSession.setActionHandler('previoustrack',()=>{if(index>0)load(index-1,true)});
    navigator.mediaSession.setActionHandler('seekbackward',details=>{audio.currentTime=Math.max(0,audio.currentTime-(details.seekOffset||10))});
    navigator.mediaSession.setActionHandler('seekforward',details=>{audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+(details.seekOffset||10))});
  }catch{}}
})();
