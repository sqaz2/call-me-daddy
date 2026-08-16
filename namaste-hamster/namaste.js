(()=>{
  const audio=document.getElementById('namasteAudio');
  const player=document.getElementById('namastePlayer');
  const play=document.getElementById('namastePlay');
  const heroPlay=document.getElementById('heroPlay');
  const coverPlay=document.getElementById('coverPlay');
  const progress=document.getElementById('namasteProgress');
  const bar=document.getElementById('namasteProgressBar');
  const status=document.getElementById('namasteStatus');
  const video=document.querySelector('.namaste-video');
  if(!audio||!player||!play)return;

  const setButton=()=>{
    const playing=!audio.paused;
    play.textContent=playing?'❚❚':'▶';
    if(heroPlay)heroPlay.textContent=playing?'❚❚ Pause the song':'▶ Play the song';
    if(status)status.textContent=playing?'Playing':'Paused';
    if(coverPlay)coverPlay.classList.toggle('is-playing',playing);
  };

  const toggle=()=>{
    player.hidden=false;
    if(audio.paused){
      status.textContent='Loading…';
      audio.play().catch(()=>{status.textContent='Tap play to start';setButton();});
    }else audio.pause();
  };

  [play,heroPlay,coverPlay].forEach(el=>el?.addEventListener('click',toggle));

  audio.addEventListener('play',()=>{setButton();if(video)video.playbackRate=.82;});
  audio.addEventListener('pause',()=>{setButton();if(video)video.playbackRate=1;});
  audio.addEventListener('waiting',()=>{status.textContent='Buffering…';});
  audio.addEventListener('canplay',()=>{if(audio.paused)status.textContent='Ready';});
  audio.addEventListener('ended',()=>{setButton();status.textContent='Finished';bar.style.width='100%';if(video)video.playbackRate=1;});
  audio.addEventListener('error',()=>{player.hidden=false;status.textContent='Audio is being added.';play.textContent='▶';if(heroPlay)heroPlay.textContent='Audio coming online';});
  audio.addEventListener('timeupdate',()=>{if(audio.duration)bar.style.width=`${audio.currentTime/audio.duration*100}%`;});

  progress?.addEventListener('click',e=>{
    if(!audio.duration)return;
    const r=progress.getBoundingClientRect();
    const ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    audio.currentTime=ratio*audio.duration;
  });
})();
