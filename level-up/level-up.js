(()=>{
  const video=document.getElementById('levelVideo');
  if(!video)return;

  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dataSaver=navigator.connection?.saveData;
  const players=[...document.querySelectorAll('audio')];
  let heroVisible=true;
  let trilogyPlaying=false;

  const syncVideo=()=>{
    const audioPlaying=trilogyPlaying||players.some(player=>!player.paused&&!player.ended);
    if(reduced||dataSaver||document.hidden||!heroVisible||audioPlaying){
      video.pause();
      return;
    }
    video.play().catch(()=>{});
  };

  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      heroVisible=Boolean(entries[0]?.isIntersecting);
      syncVideo();
    },{threshold:.04});
    observer.observe(video.closest('.level-hero')||video);
  }

  players.forEach(player=>{
    player.addEventListener('play',syncVideo);
    player.addEventListener('pause',syncVideo);
    player.addEventListener('ended',syncVideo);
  });
  document.addEventListener('trilogy:playback',event=>{
    trilogyPlaying=Boolean(event.detail?.playing);
    syncVideo();
  });
  document.addEventListener('visibilitychange',syncVideo);
})();
