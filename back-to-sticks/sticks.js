(()=>{
  const video=document.getElementById('sticksVideo');
  const audio=document.getElementById('sticksAudio');
  if(!video)return;

  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let heroVisible=true;

  const syncVideo=()=>{
    const audioPlaying=audio&&!audio.paused&&!audio.ended;
    if(reduced||document.hidden||!heroVisible||audioPlaying){
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
    observer.observe(video.closest('.sticks-hero')||video);
  }

  audio?.addEventListener('play',syncVideo);
  audio?.addEventListener('pause',syncVideo);
  audio?.addEventListener('ended',syncVideo);
  document.addEventListener('visibilitychange',syncVideo);
})();
