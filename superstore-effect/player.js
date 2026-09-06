(()=>{
  const audio=document.getElementById('ssAudio');
  const player=document.getElementById('ssPlayer');
  if(!audio||!player)return;

  const buttons=[...document.querySelectorAll('[data-ss-play]')];
  const icon=document.querySelector('.ss-cover-play');
  const play=document.getElementById('ssPlay');
  const status=document.getElementById('ssPlayerStatus');
  const pageStatus=document.getElementById('ssPageStatus');
  const title=document.getElementById('ssPlayerTitle');
  const cover=document.getElementById('ssPlayerCover');
  const label=document.getElementById('ssPlayerLabel');
  const progress=document.getElementById('ssProgress');
  const bar=document.getElementById('ssProgressBar');
  const song=(window.CMD_SONGS||[]).find(item=>item.id==='superstore-effect');
  const local={
    title:'the superstore effect',artist:'MusicSubject × Call Me Daddy',
    project:'Red Deer Civic Emergency',
    audio:'/media/songs/2026/09/superstore-effect/audio.mp3',
    cover:'/media/songs/2026/09/superstore-effect/cover.jpg',
    experience:'/superstore-effect/',...song,
    id:'superstore-effect',songId:'superstore-effect',variantId:'main',variantCount:1
  };
  let current=local;
  let controller=null;

  const say=message=>{
    if(status)status.textContent=message;
    if(pageStatus)pageStatus.textContent=message;
  };
  const show=()=>{
    player.hidden=false;
    document.body.classList.add('ss-player-open');
    window.CMDPersistentSite?.refreshClearance?.();
  };
  const sync=()=>{
    const playing=!audio.paused&&!audio.ended;
    const localPlaying=playing&&(current.songId||current.id)===local.id;
    if(icon)icon.hidden=localPlaying;
    buttons.forEach(button=>{
      button.setAttribute('aria-label',`${localPlaying?'Pause':'Play'} the superstore effect`);
      button.setAttribute('aria-pressed',String(localPlaying));
      if(button.hasAttribute('data-ss-play-label'))button.textContent=localPlaying?'Pause song':'▶ Play full song';
    });
    if(play){play.textContent=playing?'❚❚':'▶';play.setAttribute('aria-label',playing?'Pause':'Play');}
  };
  const paint=(track,meta={})=>{
    current=track;
    if(title){title.textContent=track.title;title.href=track.experience||'/music/';}
    if(cover){cover.hidden=!track.cover;if(track.cover)cover.src=track.cover;}
    if(label)label.textContent=track.project||track.artist||'Play the site';
    if(bar)bar.style.width='0%';
    say(meta.reason==='ready'?'Ready — tap the cover or Play full song.':'Loading…');
    sync();
  };
  const needsTap=(_track,error)=>{
    if(error?.name==='AbortError'||!audio.paused)return;
    show();
    const message='Playback did not start — tap Play to retry.';
    say(message);
    window.CMDUniversalPlayer?.getActive?.()?.update?.({status:message,show:true});
    sync();
  };
  const fallbackPlay=()=>{
    if(!audio.getAttribute('src'))audio.src=local.audio;
    show();
    // Keep play() in the click handler; do not wait for metadata or navigation.
    try{audio.play()?.catch(error=>needsTap(current,error));}catch(error){needsTap(current,error);}
  };

  if(window.CMDContinuousPlayback?.create){
    controller=window.CMDContinuousPlayback.create({
      id:'superstore-effect',audio,tracks:[local],localCount:1,
      intent:'laugh',excludeIds:[local.id],lastSongId:local.id,
      replacePlayer:player,pageFollowSeconds:5,
      onTrack:paint,
      onNeedsTap:needsTap,
      onStatus:kind=>{
        if(kind==='waiting'||kind==='stalled')say('Buffering…');
        else if(kind==='failed'||kind==='unavailable')say('Playback unavailable — try again or open Music.');
      }
    });
  }else{
    paint(local,{reason:'ready'});
  }

  buttons.forEach(button=>button.addEventListener('click',()=>{
    audio.muted=false;
    show();
    if(controller){
      if((controller.current()?.songId||controller.current()?.id)!==local.id)controller.load(0,{autoplay:true,reason:'cover'});
      else controller.toggle();
    }else if(audio.paused||audio.ended)fallbackPlay();
    else audio.pause();
  }));
  play?.addEventListener('click',()=>{
    if(controller)controller.toggle();
    else if(audio.paused||audio.ended)fallbackPlay();
    else audio.pause();
  });
  document.getElementById('ssNext')?.addEventListener('click',()=>{
    if(controller)controller.next('button-next');
    else say('Open Music for more songs.');
  });
  document.getElementById('ssPrev')?.addEventListener('click',()=>{
    if(controller)controller.previous();
    else{audio.currentTime=0;fallbackPlay();}
  });
  document.getElementById('ssPlayerShare')?.addEventListener('click',()=>window.CMDPlaylistRadio?.share?.(current));
  progress?.addEventListener('click',event=>{
    const rect=progress.getBoundingClientRect();
    if(!Number.isFinite(audio.duration)||audio.duration<=0||rect.width<=0)return;
    audio.currentTime=Math.max(0,Math.min(audio.duration,(event.clientX-rect.left)/rect.width*audio.duration));
  });
  audio.addEventListener('play',()=>{
    show();say('Playing');sync();
    window.CMDPersistentSite?.setSession?.(true);
    window.CMDCatalogCycle?.remember?.(current);
  });
  audio.addEventListener('pause',()=>{if(!audio.ended)say('Paused');sync();});
  audio.addEventListener('ended',sync);
  audio.addEventListener('timeupdate',()=>{
    if(bar&&Number.isFinite(audio.duration)&&audio.duration>0)bar.style.width=`${audio.currentTime/audio.duration*100}%`;
  });
  document.querySelector('.ss-lyrics details')?.addEventListener('toggle',event=>{
    const marker=event.currentTarget.querySelector('summary b');
    if(marker)marker.textContent=event.currentTarget.open?'−':'+';
  });
  sync();
})();
