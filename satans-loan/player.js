(()=>{
  const player=document.getElementById('ssPlayer');
  const audio=document.getElementById('ssAudio');
  if(!player||!audio)return;
  const byId=id=>document.getElementById(id);
  const coverButton=document.querySelector('.ss-cover-button');
  const coverPlay=document.querySelector('.ss-cover-play');
  const status=byId('ssPlayerStatus');
  const fallback={id:'satans-loan',songId:'satans-loan',variantId:'main',variantCount:1,title:"Satan's Loan",artist:'Call Me Daddy',project:"Satan's Loan",audio:'/media/songs/2026/09/satans-loan/audio.mp3',cover:'/media/songs/2026/09/satans-loan/cover.jpg',experience:'/satans-loan/',radioIntent:'think'};
  const song=(window.CMD_SONGS||[]).find(song=>song.id===fallback.id);
  const local={...fallback,...song,songId:fallback.id,variantId:'main',variantCount:1,radioIntent:'think'};

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
    coverButton?.setAttribute('aria-label',playing?"Pause Satan's Loan":"Play Satan's Loan");
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
      id:'satans-loan',audio,tracks:[local],localCount:1,intent:'think',replacePlayer:player,pageFollowSeconds:0,
      onTrack:track=>{
        current=track;
        const cover=byId('ssPlayerCover'),title=byId('ssPlayerTitle'),label=byId('ssPlayerLabel');
        if(cover){cover.src=track.cover||'';cover.hidden=!track.cover}
        if(title){title.textContent=track.title;title.href=track.experience||`/now-playing/?song=${encodeURIComponent(track.songId||track.id)}&version=${encodeURIComponent(track.variantId||'main')}`}
        if(label)label.textContent=abs(track.audio)===abs(local.audio)?'Highlight release':'Play the site';
        if(status)status.textContent='Loading…';syncCover();
      },
      onPlayState:playing=>{const button=byId('ssPlay');if(button)button.textContent=playing?'❚❚':'▶';if(status)status.textContent=playing?'Playing':'Paused';syncCover()},
      onTime:(time,duration)=>{const ratio=duration>0?time/duration*100:0;const bar=byId('ssProgressBar'),thumb=byId('ssProgressThumb'),track=byId('ssProgress');if(bar)bar.style.width=`${ratio}%`;if(thumb)thumb.style.left=`${ratio}%`;if(track){track.style.setProperty?.('--progress',`${ratio}%`);track.setAttribute('aria-valuenow',String(Math.round(ratio)))}},
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
  const progressEl=byId('ssProgress');
  let scrubbing=false;
  const seekProgress=event=>{
    const media=shouldDelegateToShared()?liveMedia():audio;
    if(!media||!Number.isFinite(media.duration)||media.duration<=0)return;
    const target=event.currentTarget||progressEl;const rect=target.getBoundingClientRect();const x=event.clientX;
    if(rect.width>0&&typeof x==='number')media.currentTime=Math.max(0,Math.min(media.duration,(x-rect.left)/rect.width*media.duration));
  };
  progressEl?.addEventListener('pointerdown',event=>{
    if(event.button!=null&&event.button!==0)return;scrubbing=true;progressEl.classList.add('is-scrubbing');
    try{progressEl.setPointerCapture(event.pointerId)}catch{}seekProgress(event);event.preventDefault();
  });
  progressEl?.addEventListener('pointermove',event=>{if(!scrubbing)return;seekProgress(event);event.preventDefault()});
  const endScrub=event=>{if(!scrubbing)return;scrubbing=false;progressEl.classList.remove('is-scrubbing');try{if(event&&event.pointerId!=null)progressEl.releasePointerCapture(event.pointerId)}catch{}};
  progressEl?.addEventListener('pointerup',endScrub);progressEl?.addEventListener('pointercancel',endScrub);
  progressEl?.addEventListener('click',event=>{if(scrubbing)return;seekProgress(event)});
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
      const bar=byId('ssProgressBar'),thumb=byId('ssProgressThumb'),track=byId('ssProgress');
      if(media&&Number.isFinite(media.duration)&&media.duration>0){const ratio=media.currentTime/media.duration*100;if(bar)bar.style.width=`${ratio}%`;if(thumb)thumb.style.left=`${ratio}%`;track?.style?.setProperty?.('--progress',`${ratio}%`)}
    },400);
    window.addEventListener('pagehide',()=>clearInterval(syncTimer));
  }
  syncCover();
})();
