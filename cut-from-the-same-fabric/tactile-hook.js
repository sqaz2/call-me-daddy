(()=>{
  // Compatibility guard for the three-track player.
  // Chromium can report MediaSource MP3 support while still stalling when
  // separate MP3 files are stitched into one SourceBuffer. Prefer the real
  // MP3 player unless a pre-rendered continuous mix or native HLS is available.
  try{
    if(typeof startLockSafe==='function'){
      startLockSafe=(path,autoplay=true)=>{
        const route=routes[path];
        if(renderedReady[path]){
          setSingleSource(path,route.rendered,route.renderedSegments,autoplay,'Continuous lock-screen mix');
          return true;
        }
        if(nativeHls){
          setSingleSource(path,route.hls,normalSegments(order),autoplay,'Continuous lock-screen playback');
          return true;
        }
        return false;
      };
    }

    // If a continuous source itself fails, recover to the three original MP3s
    // instead of leaving the controls in a silent/broken state.
    if(typeof audio!=='undefined'&&audio){
      audio.addEventListener('error',()=>{
        try{
          if(playbackMode!=='single'||!currentPath)return;
          const failedPath=currentPath;
          console.warn('Continuous route failed; falling back to direct MP3 playback.');
          startLegacy(failedPath,true);
        }catch(_){ }
      });
    }
  }catch(err){
    console.warn('Player fallback guard could not initialize.',err);
  }

  const mount=document.getElementById('fabricTactile');
  if(!mount||!window.CMDTactileScrubber)return;
  window.CMDTactileScrubber.create({
    mount,
    getDuration:()=>{
      try{return Number(activeAudio?.duration)||Number(audio?.duration)||0}catch{return 0}
    },
    getTime:()=>{
      try{return Number(activeAudio?.currentTime)||0}catch{return 0}
    },
    seek:time=>{
      try{
        const target=activeAudio||audio;
        if(!target||!Number.isFinite(target.duration)||target.duration<=0)return;
        target.currentTime=Math.max(0,Math.min(target.duration,time));
        if(typeof updateProgress==='function')updateProgress(target);
      }catch{}
    },
    label:'DRAG TO SCAN',
    detail:'ONE TURN = CURRENT AUDIO',
    haptics:true
  });
})();
