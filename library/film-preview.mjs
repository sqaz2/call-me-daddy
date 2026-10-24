// The existing song audio owns playback and Media Session. This video is visual only.
export const ROOM_ENOUGH_VIDEO='https://roomenough.grok.me/room-enough.mp4';
export const ROOM_ENOUGH_POSTER='https://roomenough.grok.me/poster.jpg';

export function connectFilmPreview({audio,video,onState=()=>{}}){
  let active=false,enabled=true,buffering=false,destroyed=false,failed=false;
  let generation=0,pending=false,state='';
  const cleanup=[];
  const listen=(target,event,handler)=>{
    target.addEventListener(event,handler);
    cleanup.push(()=>target.removeEventListener(event,handler));
  };
  const report=next=>{if(state!==next){state=next;onState(next);}};
  const silence=()=>{video.defaultMuted=true;video.muted=true;video.volume=0;};
  silence();video.playsInline=true;video.loop=true;video.preload='none';
  const shouldPlay=()=>active&&enabled&&!destroyed&&!buffering&&!audio.paused&&!audio.ended;
  function align(force=false){
    if(!active||!enabled||video.readyState<1||!Number.isFinite(video.duration)||video.duration<=0)return;
    const position=Math.max(0,Number(audio.currentTime)||0)%video.duration;
    if(force||Math.abs(video.currentTime-position)>.35){
      try{video.currentTime=position;}catch{}
    }
  }
  function stop(next=failed?'unavailable':'paused'){
    generation++;pending=false;video.pause();report(next);
  }
  function resume(){
    if(failed){report('unavailable');return;}
    if(!shouldPlay())return;
    silence();
    if(!video.getAttribute('src'))video.src=ROOM_ENOUGH_VIDEO;
    align();
    if(!video.paused||pending)return;
    const token=generation;pending=true;report('loading');
    let attempt;
    try{attempt=video.play();}catch(error){attempt=Promise.reject(error);}
    Promise.resolve(attempt).then(()=>{
      if(destroyed||token!==generation)return;
      pending=false;
      if(shouldPlay()){align();report('playing');}else stop();
    }).catch(error=>{
      if(destroyed||token!==generation)return;
      pending=false;
      if(error?.name==='AbortError')return;
      // A failed picture must never stop, skip, or replace the selected song.
      if(video.error){failed=true;report('unavailable');}
      else report('blocked');
    });
  }
  listen(audio,'play',()=>{
    buffering=audio.readyState<3;
    if(buffering)stop('loading');else resume();
  });
  listen(audio,'playing',()=>{buffering=false;resume();});
  for(const event of ['pause','ended','error'])listen(audio,event,()=>stop());
  for(const event of ['waiting','seeking'])listen(audio,event,()=>{buffering=true;stop('loading');});
  for(const event of ['emptied','loadstart'])listen(audio,event,()=>{buffering=true;stop();});
  listen(audio,'seeked',()=>{
    buffering=audio.readyState<3;align(true);
    if(shouldPlay())resume();else stop();
  });
  listen(audio,'timeupdate',()=>{if(shouldPlay())align();});
  listen(audio,'ratechange',()=>{video.playbackRate=audio.playbackRate||1;});
  listen(video,'loadedmetadata',()=>{align(true);resume();});
  listen(video,'playing',()=>{
    if(shouldPlay()){align();report('playing');}else stop();
  });
  listen(video,'waiting',()=>{if(shouldPlay())report('loading');});
  listen(video,'volumechange',silence);
  listen(video,'error',()=>{failed=true;stop('unavailable');});
  report('paused');
  return {
    // Called by the shared controller for selections, next/previous, and repeats.
    select(){
      stop();active=true;buffering=false;
      try{video.currentTime=0;}catch{}
    },
    setEnabled(value){
      enabled=!!value;
      if(enabled){align(true);resume();}else stop();
    },
    retry(){
      failed=false;
      if(video.error)video.load();
      resume();
    },
    destroy(){
      destroyed=true;cleanup.forEach(remove=>remove());stop();
    }
  };
}
