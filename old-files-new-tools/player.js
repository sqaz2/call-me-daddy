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
  let currentButton=null;

  window.CMDTactileScrubber?.create({
    mount:tactileMount,
    getDuration:()=>audio.duration,
    getTime:()=>audio.currentTime,
    seek:time=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=Math.max(0,Math.min(audio.duration,time));},
    label:'DRAG TO SCAN',
    detail:'ONE TURN = WHOLE RECORDING',
    haptics:true
  });

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
    if(!currentButton)return;
    clearActive();
    const base=currentButton.dataset.baseLabel||currentButton.textContent.replace(/^❚❚\s*/,'').replace(/^▶\s*/, '');
    currentButton.dataset.baseLabel=base;
    if(!audio.paused&&!audio.ended){
      currentButton.classList.add('is-playing');
      currentButton.textContent=`❚❚ ${base}`;
    }else{
      currentButton.textContent=`▶ ${base}`;
    }
  }

  function setMediaSession(){
    if(!('mediaSession' in navigator)||typeof MediaMetadata==='undefined')return;
    try{
      navigator.mediaSession.metadata=new MediaMetadata({
        title:title.textContent,
        artist:'MusicSubject',
        album:'Old Files / New Tools'
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
    currentButton=btn;
    audio.src=src;
    title.textContent=btn.dataset.title||'Archive recording';
    era.textContent=btn.dataset.era||'Old Files / New Tools';
    status.textContent='Loading…';
    bar.style.width='0%';
    dock.hidden=false;
    document.body.classList.add('oft-player-open');
    setMediaSession();
    audio.play().catch(()=>{
      status.textContent='Ready · tap play';
      play.textContent='▶';
      updateButtonState();
    });
  }

  document.querySelectorAll('.tape-play,.ab-play').forEach(btn=>{
    btn.dataset.baseLabel=btn.textContent.replace(/^▶\s*/, '');
    btn.addEventListener('click',()=>choose(btn));
  });

  play.addEventListener('click',()=>{
    if(!audio.src)return;
    if(audio.paused)audio.play().catch(()=>{});else audio.pause();
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
    status.textContent='Finished';
    play.textContent='▶';
    bar.style.width='100%';
    updateButtonState();
  });
  audio.addEventListener('error',()=>{
    status.textContent='This file could not be loaded.';
    play.textContent='▶';
    updateButtonState();
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
      navigator.mediaSession.setActionHandler('seekbackward',d=>{audio.currentTime=Math.max(0,audio.currentTime-(d.seekOffset||10))});
      navigator.mediaSession.setActionHandler('seekforward',d=>{audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+(d.seekOffset||10))});
    }catch{}
  }
})();
