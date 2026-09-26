(()=>{
  if(window.CMDQuietTip)return;
  let host=window;
  try{if(window.top?.location.origin===window.location.origin)host=window.top}catch{}
  if(host.CMDQuietTip){window.CMDQuietTip=host.CMDQuietTip;return}

  // This is local engagement state only. It never starts, seeks or pauses media.
  const KEY='cmd-quiet-tip-v1',IDLE=30*60*1000,MAX_GAP=10,MIN_SECONDS=900,MIN_SONGS=3;
  const subscribers=new Set();
  let state={version:1,listenedSeconds:0,completedSongs:0,lastActivity:0};
  let owner=null,cleanups=[],memoryOnly=false,lastWrite=-Infinity;
  const now=()=>Date.now();
  function snapshot(){return {eligible:state.listenedSeconds>=MIN_SECONDS&&state.completedSongs>=MIN_SONGS,listenedSeconds:state.listenedSeconds,completedSongs:state.completedSongs}}
  function notify(){const value=snapshot();subscribers.forEach(fn=>{try{fn({...value})}catch{}})}
  function save(force=false){
    const at=now();if(!force&&at-lastWrite<5000)return;
    lastWrite=at;
    if(!memoryOnly)try{host.sessionStorage.setItem(KEY,JSON.stringify(state))}catch{memoryOnly=true}
  }
  try{
    const raw=host.sessionStorage.getItem(KEY),value=raw&&raw.length<1024?JSON.parse(raw):null;
    if(value?.version===1&&Number.isFinite(value.listenedSeconds)&&value.listenedSeconds>=0&&value.listenedSeconds<=86400&&Number.isInteger(value.completedSongs)&&value.completedSongs>=0&&value.completedSongs<=1000&&Number.isFinite(value.lastActivity)&&value.lastActivity>0&&value.lastActivity<=now()&&now()-value.lastActivity<IDLE){
      state={version:1,listenedSeconds:value.listenedSeconds,completedSongs:value.completedSongs,lastActivity:value.lastActivity};
    }
  }catch{memoryOnly=true}
  function expire(){
    if(!state.lastActivity||now()-state.lastActivity<IDLE)return false;
    state={version:1,listenedSeconds:0,completedSongs:0,lastActivity:0};
    if(owner){owner.ranges=[];owner.tail=0;owner.last=null}
    save(true);notify();return true;
  }
  function absolute(value,media){
    if(typeof value!=='string'||!value)return '';
    try{const url=new URL(value,media?.ownerDocument?.baseURI||window.location.href);return /^https?:$/.test(url.protocol)?url.href:''}catch{return ''}
  }
  function source(media){return absolute(media?.currentSrc||media?.getAttribute?.('src')||media?.src,media)}
  function matching(record){
    if(!record||source(record.media)!==record.source)return false;
    const declared=record.media.getAttribute?.('src')||record.media.src;
    return !declared||absolute(declared,record.media)===record.source;
  }
  function audible(record,ending=false){
    const m=record.media,rate=Number(m.playbackRate??1);
    return matching(record)&&!record.waiting&&!record.seeking&&!m.seeking&&!m.muted&&Number(m.volume??1)>0&&Number(m.readyState??4)>=3&&rate>0&&rate<=16&&(ending?m.ended===true:!m.paused&&!m.ended);
  }
  function baseline(record){
    const time=Number(record.media.currentTime),rate=Number(record.media.playbackRate??1);
    record.last={at:now(),time:Number.isFinite(time)?time:0,rate,audible:audible(record)};
  }
  function addRange(record,start,end){
    const ranges=record.ranges.concat([[start,end]]).sort((a,b)=>a[0]-b[0]),merged=[];
    for(const range of ranges){const previous=merged[merged.length-1];if(previous&&range[0]<=previous[1]+.01)previous[1]=Math.max(previous[1],range[1]);else merged.push(range)}
    // Excessive seeking may undercount a completion, but cannot qualify it early.
    record.ranges=merged.slice(-128);
  }
  function sample(record,ending=false){
    if(record!==owner)return;
    expire();
    const previous=record.last,time=Number(record.media.currentTime),at=now(),rate=Number(record.media.playbackRate??1);
    const elapsed=previous?(at-previous.at)/1000:0,advance=previous?time-previous.time:0;
    const active=audible(record,ending);
    const valid=previous?.audible&&active&&Number.isFinite(time)&&elapsed>0&&elapsed<=MAX_GAP&&advance>0&&rate===previous.rate&&advance<=elapsed*rate+.1;
    if(valid){
      const heard=Math.min(elapsed,advance/rate);
      state.listenedSeconds=Math.min(86400,state.listenedSeconds+heard);state.lastActivity=at;
      addRange(record,previous.time,time);record.tail+=advance;
      save();notify();
    }else if(!active||advance<0||advance>elapsed*rate+.1||elapsed>MAX_GAP){record.tail=0}
    record.last={at,time:Number.isFinite(time)?time:0,rate,audible:!ending&&active};
  }
  function completed(record){
    if(record!==owner||record.finished||!matching(record))return;
    sample(record,true);
    const m=record.media,duration=Number(m.duration),position=Number(m.currentTime);
    const coverage=record.ranges.reduce((sum,[start,end])=>sum+Math.max(0,Math.min(end,duration)-Math.max(0,start)),0);
    if(m.ended===true&&Number.isFinite(duration)&&duration>0&&position>=duration-.35&&coverage>=duration*.75&&record.tail>=Math.min(5,duration*.25)){
      state.completedSongs=Math.min(1000,state.completedSongs+1);state.lastActivity=now();save(true);notify();
    }
    record.finished=true;
  }
  function detach(){cleanups.forEach(fn=>fn());cleanups=[]}
  function adopt(media,expected){
    detach();
    const record=owner={media,source:expected,ranges:[],tail:0,last:null,waiting:false,seeking:false,finished:false};
    const listen=(type,fn)=>{media.addEventListener?.(type,fn,true);cleanups.push(()=>media.removeEventListener?.(type,fn,true))};
    listen('ended',()=>completed(record));
    // Browsers may expose ended=true on the final timeupdate/pause before ended.
    // Preserve its last audible sample for the capture-phase completion handler.
    listen('timeupdate',()=>{if(!media.ended)sample(record)});
    for(const type of ['waiting','stalled'])listen(type,()=>{record.waiting=true;record.tail=0;baseline(record)});
    listen('playing',()=>{record.waiting=false;baseline(record)});
    listen('seeking',()=>{record.seeking=true;record.tail=0;baseline(record)});
    listen('seeked',()=>{record.seeking=false;record.tail=0;baseline(record)});
    for(const type of ['pause','play','volumechange','ratechange','loadstart','emptied'])listen(type,()=>{if(type==='pause'&&media.ended)return;record.tail=0;baseline(record)});
    baseline(record);
  }
  function observe({track,media,playing}={}){
    expire();
    const expected=absolute(track?.audio,media);
    if(!media||!expected||source(media)!==expected||String(media.tagName||'AUDIO').toUpperCase()!=='AUDIO')return;
    const active=Boolean(playing&&!media.paused&&!media.ended&&!media.muted&&Number(media.volume??1)>0);
    if(owner?.media!==media||owner?.source!==expected||owner.finished&&active){
      if(!active)return;
      adopt(media,expected);return;
    }
    // Only the current owner may contribute; mounting another idle player is inert.
    if(!media.ended)sample(owner);
  }
  const api={observe,getState(){expire();return snapshot()},subscribe(fn){if(typeof fn!=='function')return ()=>{};subscribers.add(fn);return ()=>subscribers.delete(fn)}};
  host.CMDQuietTip=api;window.CMDQuietTip=api;
})();
