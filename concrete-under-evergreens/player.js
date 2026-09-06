(()=>{
  if(document.createElement&&document.head?.appendChild){
    const compactStyle=document.createElement('link');
    compactStyle.rel='stylesheet';
    compactStyle.href='/concrete-under-evergreens/compact.css?v=20260827-2';
    document.head.appendChild(compactStyle);
  }

  const playCoverSrc='/media/songs/2026/08/concrete-under-evergreens/evergreens-cover.png';
  const pageCover=document.querySelector('.concrete-cover-button img');
  if(pageCover){pageCover.src=playCoverSrc;pageCover.alt='Concrete patches beneath evergreen trees';}
  const heroVideo=document.querySelector('.concrete-hero-video');
  if(heroVideo)heroVideo.poster=playCoverSrc;

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
  const coverButton=document.querySelector('.concrete-cover-button');
  const coverPlay=document.querySelector('.concrete-cover-play');
  if(!player||!audio)return;

  const fallback={
    id:'concrete-under-evergreens',songId:'concrete-under-evergreens',variantId:'main',variantCount:1,
    title:'Concrete Under Evergreens',artist:'Call Me Daddy',project:'Lacombe Civic Emergency',
    audio:'/media/songs/2026/08/concrete-under-evergreens/audio.mp3',
    cover:playCoverSrc,
    experience:'/concrete-under-evergreens/',radioIntent:'laugh'
  };
  const catalogSong=(window.CMD_SONGS||[]).find(song=>song.id===fallback.id);
  const local={...fallback,...catalogSong,songId:fallback.id,variantId:'main',variantCount:1,cover:playCoverSrc,radioIntent:'laugh'};

  const abs=value=>{try{return new URL(value,location.href).href}catch{return String(value||'')}};
  const ownerPlayer=()=>{
    try{
      if(window.top&&window.top!==window.self&&window.top.location.origin===location.origin){
        return window.top.CMDUniversalPlayer||window.CMDUniversalPlayer;
      }
    }catch{}
    return window.CMDUniversalPlayer;
  };
  const liveTrack=()=>ownerPlayer()?.getTrack?.()||null;
  const liveMedia=()=>ownerPlayer()?.getMedia?.()||null;
  const liveOwnsThisSong=()=>{
    const track=liveTrack();
    return Boolean(track?.audio&&abs(track.audio)===abs(local.audio));
  };
  const liveIsPlaying=()=>{
    const media=liveMedia();
    return liveOwnsThisSong()&&Boolean(media&&!media.paused&&!media.ended);
  };
  // Another frame already owns this recording — never start a second audio or claimPlayback race.
  const shouldDelegateToShared=()=>{
    const media=liveMedia();
    return liveOwnsThisSong()&&Boolean(media)&&media!==audio;
  };

  let coverStarted=false;
  let controller=null;
  let current=local;

  const syncCover=()=>{
    const localTrack=controller?.current?.();
    const localPlaying=Boolean(localTrack&&abs(localTrack.audio)===abs(local.audio)&&!audio.paused&&!audio.ended);
    const playing=localPlaying||liveIsPlaying();
    if(playing)coverStarted=true;
    if(coverPlay)coverPlay.hidden=coverStarted||playing;
    coverButton?.setAttribute?.('aria-label',playing?'Pause Concrete Under Evergreens':'Play Concrete Under Evergreens');
  };

  const paintTrack=track=>{
    current=track||local;
    if(cover){
      cover.hidden=!current.cover;
      if(current.cover)cover.src=current.cover;
    }
    if(label)label.textContent=abs(current.audio)===abs(local.audio)?'Lacombe civic ballad':`Play the site${current.variantCount>1?` · ${current.variantLabel}`:''}`;
    if(title){
      title.textContent=current.title;
      title.href=current.experience||`/now-playing/?song=${encodeURIComponent(current.songId||current.id)}&version=${encodeURIComponent(current.variantId||'main')}`;
    }
    syncCover();
  };

  const ensureController=()=>{
    if(controller)return controller;
    if(!window.CMDContinuousPlayback?.create){
      if(status)status.textContent='Player did not load. Refresh to try again.';
      return null;
    }
    // One queue, one audio owner, one dock. Do not add a second ended/error handler.
    controller=window.CMDContinuousPlayback.create({
      id:'concrete-under-evergreens',audio,tracks:[local],localCount:1,intent:'laugh',replacePlayer:player,pageFollowSeconds:0,
      onTrack:track=>{
        paintTrack(track);
        if(status)status.textContent='Loading…';
        player.hidden=false;
        document.body.classList?.add?.('concrete-player-open');
        window.CMDPersistentSite?.refreshClearance?.();
      },
      onPlayState:playing=>{
        if(play)play.textContent=playing?'❚❚':'▶';
        if(status)status.textContent=playing?'Playing':'Paused';
        syncCover();
      },
      onTime:(time,duration)=>{if(bar)bar.style.width=`${duration>0?time/duration*100:0}%`},
      onStatus:kind=>{if(status)status.textContent=kind==='failed'?'Playback stopped. Tap play to retry.':kind==='error'?'Skipping unavailable track…':'Buffering…'},
      onNeedsTap:()=>{if(status)status.textContent='Ready · tap ▶ to continue';syncCover()}
    });
    return controller;
  };

  const afterSharedControl=()=>{
    syncCover();
    if(status)status.textContent=liveIsPlaying()?'Playing':'Paused';
    if(play)play.textContent=liveIsPlaying()?'❚❚':'▶';
  };

  const toggle=()=>{
    if(shouldDelegateToShared()){
      ownerPlayer().control('toggle');
      afterSharedControl();
      setTimeout(afterSharedControl,50);
      setTimeout(afterSharedControl,250);
      return;
    }
    const active=ensureController();
    if(!active)return;
    if(abs(active.current()?.audio)===abs(local.audio))active.toggle();
    else active.load(0,{autoplay:true,reason:'cover'});
  };

  document.querySelectorAll('[data-concrete-play]').forEach(button=>button.addEventListener('click',toggle));
  play?.addEventListener('click',toggle);
  next?.addEventListener('click',()=>{
    if(shouldDelegateToShared()){ownerPlayer().control('next');afterSharedControl();return}
    ensureController()?.next('button-next');
  });
  previous?.addEventListener('click',()=>{
    if(shouldDelegateToShared()){ownerPlayer().control('previous');afterSharedControl();return}
    ensureController()?.previous();
  });
  share?.addEventListener('click',()=>{
    const track=shouldDelegateToShared()?liveTrack():(controller?.current?.()||current||local);
    window.CMDPlaylistRadio?.share(track);
  });
  progress?.addEventListener('click',event=>{
    const media=shouldDelegateToShared()?liveMedia():audio;
    if(!media||!Number.isFinite(media.duration)||media.duration<=0)return;
    const rect=event.currentTarget.getBoundingClientRect();
    if(rect.width>0)media.currentTime=Math.max(0,Math.min(media.duration,(event.clientX-rect.left)/rect.width*media.duration));
  });
  document.querySelector('.concrete-lyrics details')?.addEventListener('toggle',event=>{
    const marker=event.currentTarget.querySelector('summary b');
    if(marker)marker.textContent=event.currentTarget.open?'−':'+';
  });

  // Page opened while continuous already plays this song: mirror dock state, do not create a competing controller.
  if(liveOwnsThisSong()){
    paintTrack(liveTrack()||local);
    player.hidden=false;
    document.body.classList?.add?.('concrete-player-open');
    window.CMDPersistentSite?.refreshClearance?.();
    if(status)status.textContent=liveIsPlaying()?'Playing':'Paused';
    if(play)play.textContent=liveIsPlaying()?'❚❚':'▶';
    const media=liveMedia();
    if(bar&&media&&Number.isFinite(media.duration)&&media.duration>0)bar.style.width=`${media.currentTime/media.duration*100}%`;
  }
  syncCover();
  const schedule=typeof setInterval==='function'?setInterval:window.setInterval.bind(window);
  const syncTimer=schedule(()=>{
    if(!liveOwnsThisSong())return;
    afterSharedControl();
    const media=liveMedia();
    if(bar&&media&&Number.isFinite(media.duration)&&media.duration>0)bar.style.width=`${media.currentTime/media.duration*100}%`;
  },400);
  window.addEventListener('pagehide',()=>clearInterval(syncTimer));
})();
