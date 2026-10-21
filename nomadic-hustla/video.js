(()=>{
  const video=document.getElementById('songClip');
  const owner=()=>{try{return window.top.CMDUniversalPlayer||window.CMDUniversalPlayer}catch{return window.CMDUniversalPlayer}};
  // Register before the universal native-media fallback: this page-only clip
  // must not be mistaken for the full recording or enter its radio queue.
  document.addEventListener('play',event=>{
    if(event.target===video){owner()?.control('pause');event.stopImmediatePropagation();}
    else if(event.target.tagName==='AUDIO')video.pause();
  },true);
  document.getElementById('releasePlay').addEventListener('click',()=>video.pause(),true);
  document.querySelectorAll('[data-cut]').forEach(button=>button.addEventListener('click',()=>video.pause(),true));
})();
