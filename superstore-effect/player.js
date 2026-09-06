(()=>{
  const player=document.getElementById('ssPlayer');
  const audio=document.getElementById('ssAudio');
  if(!player||!audio)return;
  const byId=id=>document.getElementById(id);
  const coverButton=document.querySelector('.ss-cover-button');
  const coverPlay=document.querySelector('.ss-cover-play');
  const status=byId('ssPlayerStatus');
  const fallback={id:'superstore-effect',songId:'superstore-effect',variantId:'main',variantCount:1,title:'the superstore effect',artist:'Call Me Daddy',project:'Red Deer Civic Emergency',audio:'/media/songs/2026/09/superstore-effect/audio.mp3',cover:'/media/songs/2026/09/superstore-effect/cover.jpg',experience:'/superstore-effect/',radioIntent:'laugh'};
  const song=(window.CMD_SONGS||[]).find(song=>song.id===fallback.id);
  const local={...fallback,...song,songId:fallback.id,variantId:'main',variantCount:1,radioIntent:'laugh'};

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
  const shouldDelegateToShared=()=>{
    const media=liveMedia();
    return liveOwnsThisSong()&&Boolean(media)&&media!==audio;
  };

  let current=local,coverStarted=false,controller=null;
  const syncCover=()=>{
    const localTrack=controller?.current?.();
    const localPlaying=Boolean(localTrack&&abs(localTrack.audio)===abs(local.audio)&&!audio.paused&&!audio.ended);
    const playing=localPlaying||liveIsPlaying();
    if(playing)coverStarted=true;
    if(coverPlay)coverPlay.hidden=coverStarted||playing;
    coverButton?.setAttribute('aria-label',playing?'Pause the superstore effect':'Play the superstore effect');
  };
  const afterSharedControl=()=>{
    syncCover();
    if(status)status.textContent=liveIsPlaying()?'Playing':'Paused';
    const button=byId('ssPlay');
    if(button)button.textContent=liveIsPlaying()?'❚❚':'▶';
  };
  const ensureController=()=>{
    if(controller)return controller;
    if(!window.CMDContinuousPlayback?.create){if(status)status.textContent='Player did not load. Refresh to try again.';return null}
    // One queue, one audio owner, one dock. Do not add a second ended/error handler.
    controller=window.CMDContinuousPlayback.create({
      id:'superstore-effect',audio,tracks:[local],localCount:1,intent:'laugh',replacePlayer:player,pageFollowSeconds:0,
      onTrack:track=>{
        current=track;
        const cover=byId('ssPlayerCover'),title=byId('ssPlayerTitle'),label=byId('ssPlayerLabel');
        if(cover){cover.src=track.cover||'';cover.hidden=!track.cover}
        if(title){title.textContent=track.title;title.href=track.experience||`/now-playing/?song=${encodeURIComponent(track.songId||track.id)}&version=${encodeURIComponent(track.variantId||'main')}`}
        if(label)label.textContent=abs(track.audio)===abs(local.audio)?'Red Deer civic satire':'Play the site';
        if(status)status.textContent='Loading…';syncCover();
      },
      onPlayState:playing=>{const button=byId('ssPlay');if(button)button.textContent=playing?'❚❚':'▶';if(status)status.textContent=playing?'Playing':'Paused';syncCover()},
      onTime:(time,duration)=>{const bar=byId('ssProgressBar');if(bar)bar.style.width=`${duration>0?time/duration*100:0}%`},
      onStatus:kind=>{if(status)status.textContent=kind==='failed'?'Playback stopped. Tap play to retry.':kind==='error'?'Skipping unavailable track…':'Buffering…'},
      onNeedsTap:()=>{if(status)status.textContent='Ready · tap ▶ to continue';syncCover()}
    });
    return controller;
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

  document.querySelectorAll('[data-ss-play]').forEach(button=>button.addEventListener('click',toggle));
  byId('ssPlay')?.addEventListener('click',toggle);
  byId('ssPrev')?.addEventListener('click',()=>{
    if(shouldDelegateToShared()){ownerPlayer().control('previous');afterSharedControl();return}
    ensureController()?.previous();
  });
  byId('ssNext')?.addEventListener('click',()=>{
    if(shouldDelegateToShared()){ownerPlayer().control('next');afterSharedControl();return}
    ensureController()?.next('button-next');
  });
  byId('ssPlayerShare')?.addEventListener('click',()=>{
    const track=shouldDelegateToShared()?liveTrack():(controller?.current?.()||current);
    window.CMDPlaylistRadio?.share(track);
  });
  byId('ssProgress')?.addEventListener('click',event=>{
    const media=shouldDelegateToShared()?liveMedia():audio;
    if(!media||!Number.isFinite(media.duration)||media.duration<=0)return;
    const rect=event.currentTarget.getBoundingClientRect();
    if(rect.width>0)media.currentTime=Math.max(0,Math.min(media.duration,(event.clientX-rect.left)/rect.width*media.duration));
  });
  document.querySelector('.ss-lyrics details')?.addEventListener('toggle',event=>{const marker=event.currentTarget.querySelector('summary b');if(marker)marker.textContent=event.currentTarget.open?'−':'+'});

  if(liveOwnsThisSong()){
    current=liveTrack()||local;
    if(status)status.textContent=liveIsPlaying()?'Playing':'Paused';
    const button=byId('ssPlay');
    if(button)button.textContent=liveIsPlaying()?'❚❚':'▶';
  }
  // Cold start still needs a controller for dock wiring used by tests and first tap.
  if(!shouldDelegateToShared())ensureController();
  else{
    syncCover();
    const schedule=typeof setInterval==='function'?setInterval:window.setInterval.bind(window);
  const syncTimer=schedule(()=>{
      if(!liveOwnsThisSong())return;
      afterSharedControl();
      const media=liveMedia();
      const bar=byId('ssProgressBar');
      if(bar&&media&&Number.isFinite(media.duration)&&media.duration>0)bar.style.width=`${media.currentTime/media.duration*100}%`;
    },400);
    window.addEventListener('pagehide',()=>clearInterval(syncTimer));
  }
  syncCover();
})();
