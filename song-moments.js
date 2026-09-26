(()=>{
  if(window.CMDSongMoments)return;
  const ORIGIN='https://callmedaddy.musicsubject.com';
  const seconds=value=>{const number=Number(value);return Number.isFinite(number)?Math.max(0,Math.floor(number)):0};
  const format=value=>{const total=seconds(value),hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),rest=String(total%60).padStart(2,'0');return hours?`${hours}:${String(minutes).padStart(2,'0')}:${rest}`:`${minutes}:${rest}`};
  const identity=track=>({songId:String(track?.songId||track?.id||'').split(':')[0],variantId:String(track?.variantId||'main')});
  const absolute=value=>{try{return new URL(value,location.href).href}catch{return ''}};
  function shareData(track,time){
    const {songId,variantId}=identity(track);if(!songId)return null;
    const start=seconds(time),url=new URL('/music/',ORIGIN);
    url.searchParams.set('song',songId);url.searchParams.set('version',variantId);url.searchParams.set('t',String(start));url.searchParams.set('share','1');
    const detail=track.variantCount>1&&track.variantLabel?` — ${track.variantLabel}`:'';
    return {title:`${track.title||'MusicSubject'}${detail}`,text:`Hear this moment at ${format(start)} in ${track.title||'this song'}${detail}.`,url:url.href};
  }
  async function share(track,time){
    const data=shareData(track,time);if(!data)return {status:'unavailable'};
    // Whole-song helpers may replace URLs with short links; moments retain t.
    if(typeof navigator.share==='function'){
      try{await navigator.share(data);return {status:'shared',url:data.url}}
      catch(error){if(error?.name==='AbortError')return {status:'cancelled',url:data.url}}
    }
    try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(`${data.text}\n${data.url}`);return {status:'copied',url:data.url}}}catch{}
    return {status:'copy',url:data.url};
  }
  function readRequest(search,track){
    const params=new URLSearchParams(search),requested=identity(track);
    if(!track||!params.has('t')||params.get('song')!==requested.songId||(params.get('version')||'main')!==requested.variantId)return null;
    return {...requested,seconds:seconds(params.get('t')),audio:absolute(track.audio)};
  }
  function cue(request,{onApplied=()=>{}}={}){
    let consumed=false,media=null,done=false,currentTrack=null;
    const events=['loadedmetadata','durationchange','canplay'];
    const clear=()=>{if(!media)return;events.forEach(type=>media.removeEventListener?.(type,apply));media.removeEventListener?.('loadstart',sourceChanged)};
    const cancel=()=>{done=true;clear()};
    function sourceChanged(){if(absolute(media?.getAttribute?.('src')||media?.src)!==request?.audio)cancel()}
    function apply(){
      if(done||!media||!request)return false;
      const selected=absolute(media.getAttribute?.('src')||media.src),loaded=absolute(media.currentSrc||media.src);
      if(currentTrack){const actual=identity(currentTrack());if(actual.songId!==request.songId||actual.variantId!==request.variantId)return false}
      const duration=Number(media.duration);
      if(selected!==request.audio||loaded!==request.audio||media.readyState<1||!Number.isFinite(duration)||duration<=0)return false;
      // Avoid seeking to ended, which could immediately advance the queue.
      const time=Math.min(request.seconds,Math.max(0,duration-0.1));
      try{media.currentTime=time}catch{return false}
      done=true;clear();onApplied(time);return true;
    }
    function arm(target,getTrack){
      if(consumed||!request||!target)return false;
      consumed=true;media=target;currentTrack=getTrack;events.forEach(type=>media.addEventListener?.(type,apply));media.addEventListener?.('loadstart',sourceChanged);apply();return true;
    }
    return {arm,apply,cancel,get consumed(){return consumed}};
  }
  window.CMDSongMoments={shareData,share,readRequest,cue,format};
})();
