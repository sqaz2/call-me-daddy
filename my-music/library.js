(()=>{
  if(window.CMDMyMusic)return;
  // The persistent browser's song frame and its dock share one session store.
  try{if(window.top!==window&&window.top?.location.origin===window.location.origin&&window.top.CMDMyMusic){window.CMDMyMusic=window.top.CMDMyMusic;return}}catch{}

  const STORAGE='cmd-my-music-v1';
  const LIMITS={playlists:20,recordings:200,name:80,raw:1500000};
  const subscribers=new Set();
  let memory={version:1,playlists:[],resume:null},memoryOnly=false;
  let lastSavedAt=-Infinity,lastSample=null,ownerMedia=null,ownerSource='';
  let sequence=0;
  const empty=()=>({version:1,playlists:[],resume:null});
  const copy=value=>JSON.parse(JSON.stringify(value));
  const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
  const identifier=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,159}$/.test(value)?value:null;
  const timestamp=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?Math.min(value,Number.MAX_SAFE_INTEGER):0;
  const nameOf=value=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,LIMITS.name):'';
  function reference(value,fromTrack=false){
    if(!object(value))return null;
    const fallback=fromTrack&&typeof value.id==='string'?value.id.split(':'):[];
    const songId=identifier(value.songId||fallback[0]);
    const variant=value.variantId??(fallback.length>1?fallback.slice(1).join(':'):'main');
    const variantId=identifier(variant===''?'main':variant);
    return songId&&variantId?{songId,variantId}:null;
  }
  const same=(a,b)=>Boolean(a&&b&&a.songId===b.songId&&a.variantId===b.variantId);
  function recordings(values){
    if(!Array.isArray(values))return [];
    const result=[],seen=new Set();
    for(const value of values.slice(0,10000)){
      const ref=reference(value);if(!ref)continue;
      const key=`${ref.songId}:${ref.variantId}`;if(seen.has(key))continue;
      seen.add(key);result.push(ref);if(result.length===LIMITS.recordings)break;
    }
    return result;
  }
  function boundedQueue(queue,index){
    const start=Math.max(0,Math.min(index-Math.floor(LIMITS.recordings/2),queue.length-LIMITS.recordings));
    return {queue:queue.slice(start,start+LIMITS.recordings),index:index-start};
  }
  function resumeOf(value){
    if(!object(value)||!Array.isArray(value.queue)||!Number.isInteger(value.index)||value.index<0||value.index>=value.queue.length||value.queue.length>10000)return null;
    const current=reference(value.queue[value.index]);if(!current)return null;
    const queue=[];let index=-1;
    value.queue.forEach((item,i)=>{const ref=reference(item);if(!ref)return;if(i===value.index)index=queue.length;queue.push(ref)});
    if(index<0)return null;
    return {...boundedQueue(queue,index),position:typeof value.position==='number'&&Number.isFinite(value.position)?Math.max(0,Math.min(86400,value.position)):0,updatedAt:timestamp(value.updatedAt)};
  }
  function sanitize(value){
    if(!object(value)||value.version!==1)return empty();
    const playlists=[],ids=new Set();
    for(const item of (Array.isArray(value.playlists)?value.playlists:[]).slice(0,1000)){
      if(!object(item))continue;
      const id=identifier(item.id),name=nameOf(item.name);if(!id||!name||ids.has(id))continue;
      ids.add(id);playlists.push({id,name,recordings:recordings(item.recordings),updatedAt:timestamp(item.updatedAt)});
      if(playlists.length===LIMITS.playlists)break;
    }
    return {version:1,playlists,resume:resumeOf(value.resume)};
  }
  function read(){
    if(memoryOnly)return copy(memory);
    let raw;
    try{raw=localStorage.getItem(STORAGE)}catch{memoryOnly=true;return copy(memory)}
    // Broken or oversized saved data is recoverable; it is not a storage denial.
    try{memory=raw&&raw.length<=LIMITS.raw?sanitize(JSON.parse(raw)):empty()}catch{memory=empty()}
    return copy(memory);
  }
  function notify(){
    subscribers.forEach(fn=>{try{fn()}catch{}});
    try{if(typeof CustomEvent==='function')window.dispatchEvent?.(new CustomEvent('cmd:my-music-change'))}catch{}
  }
  function write(value){
    memory=sanitize(value);
    if(!memoryOnly)try{localStorage.setItem(STORAGE,JSON.stringify(memory))}catch{memoryOnly=true}
    notify();
  }
  // Probe writes too: browsers may permit reads while blocking persistence.
  read();
  if(!memoryOnly)try{localStorage.setItem(`${STORAGE}:probe`,'1');localStorage.removeItem(`${STORAGE}:probe`)}catch{memoryOnly=true}
  function createPlaylist(name){
    name=nameOf(name);if(!name)return {ok:false,error:'Give the playlist a name.'};
    const state=read();if(state.playlists.length>=LIMITS.playlists)return {ok:false,error:'You can save up to 20 playlists.'};
    let id;
    do{id=`p-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2,10)}`}while(state.playlists.some(item=>item.id===id));
    const playlist={id,name,recordings:[],updatedAt:Date.now()};state.playlists.push(playlist);write(state);
    return {ok:true,playlist:copy(playlist)};
  }
  function change(id,mutate){
    const state=read(),playlist=state.playlists.find(item=>item.id===id);
    if(!playlist)return {ok:false,error:'This playlist is no longer available.'};
    const result=mutate(playlist,state);if(result?.ok===false)return result;
    playlist.updatedAt=Date.now();write(state);return {ok:true};
  }
  function renamePlaylist(id,name){
    name=nameOf(name);if(!name)return {ok:false,error:'Give the playlist a name.'};
    return change(id,playlist=>{playlist.name=name});
  }
  const deletePlaylist=id=>change(id,(playlist,state)=>{state.playlists=state.playlists.filter(item=>item!==playlist)});
  function addRecording(id,value){
    const ref=reference(value);if(!ref)return {ok:false,error:'Choose a recording from the music library.'};
    return change(id,playlist=>{
      if(playlist.recordings.some(item=>same(item,ref)))return {ok:false,error:'That recording is already in this playlist.'};
      if(playlist.recordings.length>=LIMITS.recordings)return {ok:false,error:'A playlist can hold up to 200 recordings.'};
      playlist.recordings.push(ref);
    });
  }
  function removeRecording(id,value){
    const ref=reference(value);if(!ref)return {ok:false,error:'Choose a recording to remove.'};
    return change(id,playlist=>{playlist.recordings=playlist.recordings.filter(item=>!same(item,ref))});
  }
  function moveRecording(id,value,delta){
    const ref=reference(value);if(!ref||!Number.isInteger(delta)||!delta)return {ok:false,error:'Choose a recording and a direction.'};
    return change(id,playlist=>{
      const from=playlist.recordings.findIndex(item=>same(item,ref));if(from<0)return {ok:false,error:'That recording is no longer in this playlist.'};
      const to=Math.max(0,Math.min(playlist.recordings.length-1,from+delta));
      playlist.recordings.splice(to,0,playlist.recordings.splice(from,1)[0]);
    });
  }
  function absolute(value,media){
    if(typeof value!=='string'||!value)return '';
    try{const url=new URL(value,media?.ownerDocument?.baseURI||window.location?.href||location.href);return /^https?:$/.test(url.protocol)?url.href:''}catch{return ''}
  }
  function playbackQueue(values,requestedIndex,current,source,media){
    const raw=Array.isArray(values)?values.slice(0,10000):[];
    const entries=raw.map((item,rawIndex)=>({ref:reference(item,true),source:absolute(item?.audio,media),rawIndex})).filter(item=>item.ref);
    const matches=item=>same(item.ref,current)&&(!item.source||item.source===source);
    let index=entries.findIndex(item=>item.rawIndex===requestedIndex&&matches(item));
    if(index<0)index=entries.findIndex(item=>item.source===source&&same(item.ref,current));
    if(index<0)index=entries.findIndex(matches);
    // A stale adapter queue cannot substitute a different recording identity.
    if(index<0){entries.push({ref:current});index=entries.length-1}
    return boundedQueue(entries.map(item=>item.ref),index);
  }
  function rememberPlayback({track,media,playing,queue,index}={}){
    if(!media||!track)return;
    const current=reference(track,true),source=absolute(media.currentSrc||media.getAttribute?.('src')||media.src,media);
    if(!current||!source||absolute(track.audio,media)!==source)return;
    const isPlaying=Boolean(playing&&!media.paused&&!media.ended);
    // Only genuine playback can claim resume ownership; mounting an idle page
    // (even one preloaded at a saved time) must leave the listener's queue intact.
    if(!isPlaying&&(ownerMedia!==media||ownerSource!==source))return;
    if(isPlaying){ownerMedia=media;ownerSource=source}
    const bounded=playbackQueue(queue,index??track.queueIndex,current,source,media);
    const duration=Number(media.duration),time=Number(media.currentTime);
    // A completed recording resumes at its start, rather than instantly ending.
    const position=media.ended?0:Math.max(0,Math.min(Number.isFinite(time)?time:0,Number.isFinite(duration)&&duration>0?duration:86400,86400));
    const signature=JSON.stringify(bounded),now=Date.now();
    const changed=!lastSample||lastSample.source!==source||lastSample.signature!==signature||lastSample.media!==media;
    const pauseOrSeek=!isPlaying&&(!lastSample||lastSample.playing||lastSample.position!==position);
    lastSample={source,signature,media,playing:isPlaying,position};
    if(!changed&&!pauseOrSeek&&(!isPlaying||now-lastSavedAt<4000))return;
    const state=read();state.resume={...bounded,position,updatedAt:now};lastSavedAt=now;write(state);
  }
  window.addEventListener?.('storage',event=>{if(!memoryOnly&&(!event.key||event.key===STORAGE)){read();notify()}});
  window.CMDMyMusic={
    getPlaylists:()=>read().playlists,createPlaylist,renamePlaylist,deletePlaylist,addRecording,removeRecording,moveRecording,
    getResume:()=>read().resume,rememberPlayback,storageStatus:()=>({persistent:!memoryOnly}),
    subscribe(fn){if(typeof fn!=='function')return ()=>{};subscribers.add(fn);return ()=>subscribers.delete(fn)}
  };
})();
