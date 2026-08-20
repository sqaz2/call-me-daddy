(()=>{
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
