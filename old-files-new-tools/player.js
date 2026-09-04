(()=>{
  const audio=document.getElementById('oftAudio');
  const dock=document.getElementById('oftPlayer');
  const play=document.getElementById('oftPlay');
  const title=document.getElementById('oftTitle');
  const era=document.getElementById('oftEra');
  const status=document.getElementById('oftStatus');
  const progress=document.getElementById('oftProgress');
  const bar=document.getElementById('oftProgressBar');
  const tactileMount=document.getElementById('oftTactile');
  const localButtons=[...document.querySelectorAll('.tape-play,.ab-play')];
  const radio=window.CMDPlaylistRadio?.create({intent:'old-files'});
  const shareButton=document.createElement('button');
  shareButton.className='player-btn';
  shareButton.type='button';
  shareButton.setAttribute('aria-label','Share current song');
  shareButton.title='Share current song';
  shareButton.textContent='↗';
  play.after(shareButton);
  let currentButton=null;
  let currentRadioTrack=null;

  window.CMDTactileScrubber?.create({
    mount:tactileMount,
    getDuration:()=>audio.duration,
    getTime:()=>audio.currentTime,
    seek:time=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=Math.max(0,Math.min(audio.duration,time));},
    label:'DRAG TO SCAN',
    detail:'ONE TURN = WHOLE RECORDING',
    haptics:true
  });

  function updateArtworkState(){
    document.querySelectorAll('.release-art[data-play-target]').forEach(art=>{
      const target=document.getElementById(art.dataset.playTarget);
      const selected=target&&target===currentButton;
      const playing=selected&&!audio.paused&&!audio.ended;
      art.classList.toggle('is-selected',Boolean(selected));
      art.classList.toggle('is-playing',Boolean(playing));
      const cue=art.querySelector('.release-art-cue');
      if(cue)cue.textContent=playing?'❚❚ TAP ARTWORK TO PAUSE':selected?'▶ TAP ARTWORK TO RESUME':'▶ TAP ARTWORK TO PLAY';
      art.setAttribute('aria-pressed',playing?'true':'false');
    });
  }

  function clearActive(){
    document.querySelectorAll('.tape-play,.ab-play').forEach(btn=>{
      btn.classList.remove('is-playing');
      if(btn===currentButton){
        const base=btn.dataset.baseLabel||btn.textContent.replace(/^❚❚\s*/,'').replace(/^▶\s*/, '');
        btn.dataset.baseLabel=base;
        btn.textContent=`▶ ${base}`;
      }
    });
  }

  function updateButtonState(){
    if(!currentButton){updateArtworkState();return;}
    clearActive();
    const base=currentButton.dataset.baseLabel||currentButton.textContent.replace(/^❚❚\s*/,'').replace(/^▶\s*/, '');
    currentButton.dataset.baseLabel=base;
    if(!audio.paused&&!audio.ended){
      currentButton.classList.add('is-playing');
      currentButton.textContent=`❚❚ ${base}`;
    }else{
      currentButton.textContent=`▶ ${base}`;
    }
    updateArtworkState();
  }

  function setMediaSession(){
    if(!('mediaSession' in navigator)||typeof MediaMetadata==='undefined')return;
    const art=currentButton?.dataset.art;
    try{
      navigator.mediaSession.metadata=new MediaMetadata({
        title:title.textContent,
        artist:'MusicSubject',
        album:'Old Files / New Tools',
        artwork:art?[{src:new URL(art,location.href).href,sizes:'720x720',type:'image/webp'}]:[]
      });
    }catch{}
  }

  function choose(btn){
    const src=btn.dataset.src;
    if(!src)return;
    if(currentButton===btn&&audio.src){
      if(audio.paused)audio.play().catch(()=>{});else audio.pause();
      return;
    }
    currentRadioTrack=null;
    currentButton=btn;
    audio.src=src;
    title.textContent=btn.dataset.title||'Archive recording';
    era.textContent=btn.dataset.era||'Old Files / New Tools';
    status.textContent='Loading…';
    bar.style.width='0%';
    dock.hidden=false;
    document.body.classList.add('oft-player-open');
    setMediaSession();
    updateArtworkState();
    audio.play().catch(()=>{
      status.textContent='Ready · tap play';
      play.textContent='▶';
      updateButtonState();
    });
  }

  function loadRadioTrack(track){
    if(!track){status.textContent='Radio unavailable · open Music';play.textContent='▶';return;}
    currentButton=null;
    currentRadioTrack=track;
    clearActive();
    audio.src=track.audio;
    title.textContent=track.title;
    era.textContent=`Play the site${track.variantCount>1?` · ${track.variantLabel}`:''}`;
    status.textContent='Loading…';
    bar.style.width='0%';
    dock.hidden=false;
    document.body.classList.add('oft-player-open');
    if('mediaSession' in navigator&&typeof MediaMetadata!=='undefined'){
      try{navigator.mediaSession.metadata=new MediaMetadata({title:track.title,artist:track.artist||'Call Me Daddy',album:track.project||'Play the site',artwork:track.cover?[{src:new URL(track.cover,location.href).href}]:[]})}catch{}
    }
    audio.play().catch(()=>{status.textContent='Ready · tap play';play.textContent='▶'});
  }

  function loadRadio(){loadRadioTrack(radio?.next())}

  function nextTrack(){
    if(currentRadioTrack){loadRadio();return;}
    const index=localButtons.indexOf(currentButton);
    if(index>=0&&index<localButtons.length-1){choose(localButtons[index+1]);return;}
    loadRadio();
  }

  function previousTrack(){
    if(audio.currentTime>5){audio.currentTime=0;if(audio.paused)audio.play().catch(()=>{});return;}
    if(currentRadioTrack){const track=radio?.previous?.();if(track&&track!==currentRadioTrack)loadRadioTrack(track);else{audio.currentTime=0;if(audio.paused)audio.play().catch(()=>{})}return;}
    const index=localButtons.indexOf(currentButton);
    if(index>0)choose(localButtons[index-1]);else{audio.currentTime=0;if(audio.paused&&audio.src)audio.play().catch(()=>{})}
  }

  function currentTrack(){
    if(currentRadioTrack)return currentRadioTrack;
    if(!currentButton)return null;
    const card=currentButton.closest('article');
    return {id:currentButton.id||currentButton.dataset.title,songId:currentButton.id||currentButton.dataset.title,title:currentButton.dataset.title||'Archive recording',artist:'MusicSubject',project:'Old Files / New Tools',variantLabel:currentButton.dataset.era||'Archive',audio:currentButton.dataset.src,cover:currentButton.dataset.art||'',experience:`${location.pathname}${card?.id?`#${card.id}`:''}`};
  }

  document.querySelectorAll('.tape-play,.ab-play').forEach(btn=>{
    btn.dataset.baseLabel=btn.textContent.replace(/^▶\s*/, '');
    btn.addEventListener('click',()=>choose(btn));
  });

  document.querySelectorAll('.release-art[data-play-target]').forEach(art=>{
    art.setAttribute('aria-pressed','false');
    art.addEventListener('click',()=>{
      const target=document.getElementById(art.dataset.playTarget);
      if(target)target.click();
    });
  });

  play.addEventListener('click',()=>{
    if(!audio.src)return;
    if(audio.paused)audio.play().catch(()=>{});else audio.pause();
  });
  shareButton.addEventListener('click',()=>{
    if(currentRadioTrack){window.CMDPlaylistRadio?.share(currentRadioTrack);return;}
    currentButton?.closest('article')?.querySelector('[data-share] .share-btn')?.click();
  });

  audio.addEventListener('play',()=>{
    play.textContent='❚❚';
    play.setAttribute('aria-label','Pause');
    status.textContent='Playing';
    updateButtonState();
    if('mediaSession' in navigator){try{navigator.mediaSession.playbackState='playing'}catch{}}
  });
  audio.addEventListener('pause',()=>{
    play.textContent='▶';
    play.setAttribute('aria-label','Play');
    if(!audio.ended)status.textContent='Paused';
    updateButtonState();
    if('mediaSession' in navigator){try{navigator.mediaSession.playbackState='paused'}catch{}}
  });
  audio.addEventListener('waiting',()=>{status.textContent='Buffering…'});
  audio.addEventListener('canplay',()=>{if(audio.paused&&!audio.ended)status.textContent='Ready'});
  audio.addEventListener('ended',()=>{
    bar.style.width='100%';
    updateButtonState();
    nextTrack();
  });
  audio.addEventListener('error',()=>{
    status.textContent='Skipping unavailable track…';
    play.textContent='▶';
    updateButtonState();
    window.setTimeout(nextTrack,500);
  });
  audio.addEventListener('timeupdate',()=>{
    if(audio.duration){
      bar.style.width=`${Math.min(100,(audio.currentTime/audio.duration)*100)}%`;
      if('mediaSession' in navigator&&Number.isFinite(audio.duration)){
        try{navigator.mediaSession.setPositionState({duration:audio.duration,playbackRate:audio.playbackRate,position:Math.min(audio.currentTime,audio.duration)})}catch{}
      }
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
      navigator.mediaSession.setActionHandler('previoustrack',previousTrack);
      navigator.mediaSession.setActionHandler('nexttrack',nextTrack);
      navigator.mediaSession.setActionHandler('seekbackward',d=>{audio.currentTime=Math.max(0,audio.currentTime-(d.seekOffset||10))});
      navigator.mediaSession.setActionHandler('seekforward',d=>{audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+(d.seekOffset||10))});
      navigator.mediaSession.setActionHandler('seekto',d=>{if(typeof d.seekTime==='number')audio.currentTime=Math.max(0,Math.min(audio.duration||Infinity,d.seekTime))});
    }catch{}
  }
  window.CMDUniversalPlayer?.connect({
    id:'old-files-universal',media:audio,getTrack:currentTrack,getContext:track=>track?.variantLabel||'Old Files / New Tools',
    play:()=>audio.src&&audio.play(),pause:()=>audio.pause(),toggle:()=>audio.src&&(audio.paused?audio.play():audio.pause()),
    previous:previousTrack,next:nextTrack,share:()=>{if(currentRadioTrack)return window.CMDPlaylistRadio?.share(currentRadioTrack);return currentButton?.closest('article')?.querySelector('[data-share] .share-btn')?.click()},replaceElement:dock
  });
})();
