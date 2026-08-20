const tracks={
  up:{
    title:'Find Your People',
    src:'/media/songs/2026/08/find-your-people/audio.mp3',
    duration:149.760,
    artwork:'/media/projects/2026/08/cut-from-the-same-fabric/find-your-people-720.webp'
  },
  beat:{
    title:'Cut From the Same Fabric — Instrumental',
    src:'/media/songs/2026/08/cut-from-the-same-fabric-instrumental/audio.mp3',
    duration:186.576,
    artwork:'/media/projects/2026/08/cut-from-the-same-fabric/cover-720.jpg'
  },
  down:{
    title:'HELL HAS PEOPLE TOO',
    src:'/media/songs/2026/08/hell-has-people-too/audio.mp3',
    duration:223.752,
    artwork:'/media/projects/2026/08/cut-from-the-same-fabric/hell-has-people-too-720.webp'
  }
};

const routes={
  up:{
    order:['up','beat','down'],
    hls:'/cut-from-the-same-fabric/find-first.m3u8',
    rendered:'/media/projects/2026/08/cut-from-the-same-fabric/sequence-find-first.mp3',
    renderedSegments:[
      {key:'up',start:0,end:138.260},
      {key:'beat',start:138.260,end:318.336},
      {key:'down',start:318.336,end:542.088}
    ]
  },
  down:{
    order:['down','beat','up'],
    hls:'/cut-from-the-same-fabric/hell-first.m3u8',
    rendered:'/media/projects/2026/08/cut-from-the-same-fabric/sequence-hell-first.mp3',
    renderedSegments:[
      {key:'down',start:0,end:223.752},
      {key:'beat',start:223.752,end:410.328},
      {key:'up',start:410.328,end:560.088}
    ]
  }
};

const audio=document.getElementById('audio'),
  playBtn=document.getElementById('play'),
  prevBtn=document.getElementById('prev'),
  nextBtn=document.getElementById('next'),
  nowTitle=document.getElementById('nowTitle'),
  nowLabel=document.getElementById('nowLabel'),
  progress=document.getElementById('progress'),
  timeline=document.getElementById('timeline'),
  seq1=document.getElementById('seq1'),
  seq3=document.getElementById('seq3');

const crossAudio=document.createElement('audio');
crossAudio.id='crossfadeAudio';
crossAudio.preload='metadata';
crossAudio.volume=0;
crossAudio.style.display='none';
document.body.appendChild(crossAudio);

const CROSSFADE_LEAD=18;
const FIRST_FADE_SECONDS=6.5;
const SECOND_RISE_SECONDS=5.5;
const SECOND_UNDER_VOLUME=.12;

let order=[],index=0;
let activeAudio=audio;
let crossfadeActive=false;
let crossfadeRaf=0;
let playbackMode='legacy';
let currentPath='';
let singleSegments=[];
let mediaSource=null;
let mediaSourceUrl='';
let mediaBuildToken=0;
let lastMetadataKey='';
const renderedReady={up:false,down:false};

const ua=navigator.userAgent||'';
const mobilePlayback=/Android|iPhone|iPad|iPod|Mobile|FBAN|FBAV|Instagram/i.test(ua);
const nativeHls=Boolean(
  audio.canPlayType('application/vnd.apple.mpegurl')||
  audio.canPlayType('application/x-mpegURL')
);
const mseMp3=Boolean(
  window.MediaSource&&
  typeof MediaSource.isTypeSupported==='function'&&
  MediaSource.isTypeSupported('audio/mpeg')
);

Object.entries(routes).forEach(([path,route])=>{
  fetch(route.rendered,{method:'HEAD',cache:'no-store'})
    .then(r=>{renderedReady[path]=r.ok})
    .catch(()=>{});
});

function clamp01(n){return Math.max(0,Math.min(1,n));}
function smoothstep(n){n=clamp01(n);return n*n*(3-2*n);}

function normalSegments(routeOrder){
  let cursor=0;
  return routeOrder.map(key=>{
    const start=cursor;
    cursor+=tracks[key].duration;
    return {key,start,end:cursor};
  });
}

function setChoiceUI(path){
  currentPath=path;
  order=[...routes[path].order];
  document.querySelectorAll('.choice').forEach(b=>b.classList.toggle('active',b.dataset.path===path));
  seq1.innerHTML=`<span class="num">01 · START</span><strong>${tracks[order[0]].title}</strong>`;
  seq3.innerHTML=`<span class="num">03 · OTHER SIDE</span><strong>${tracks[order[2]].title}</strong>`;
}

function stopCrossfade(){
  cancelAnimationFrame(crossfadeRaf);
  crossfadeRaf=0;
  crossfadeActive=false;
  crossAudio.pause();
  crossAudio.volume=0;
  try{crossAudio.currentTime=0}catch(_){ }
  audio.volume=1;
}

function releaseMediaSource(){
  mediaBuildToken++;
  mediaSource=null;
  if(mediaSourceUrl){
    const old=mediaSourceUrl;
    mediaSourceUrl='';
    setTimeout(()=>URL.revokeObjectURL(old),1000);
  }
}

function primeBeat(){
  if(order[0]!=='up')return;
  if(crossAudio.src!==new URL(tracks.beat.src,location.href).href){
    crossAudio.src=tracks.beat.src;
    crossAudio.load();
  }
  crossAudio.volume=0;
}

function setMediaMetadata(key,force=false){
  if(!key||(!force&&lastMetadataKey===key))return;
  lastMetadataKey=key;
  if(!('mediaSession' in navigator)||typeof MediaMetadata==='undefined')return;
  try{
    navigator.mediaSession.metadata=new MediaMetadata({
      title:tracks[key].title,
      artist:'Call Me Daddy',
      album:'Cut From the Same Fabric',
      artwork:[
        {src:new URL(tracks[key].artwork,location.href).href,sizes:'720x720'}
      ]
    });
  }catch(_){ }
}

function setPlaybackState(state){
  if(!('mediaSession' in navigator))return;
  try{navigator.mediaSession.playbackState=state}catch(_){ }
}

function segmentForTime(time){
  if(!singleSegments.length)return {segment:null,segmentIndex:0};
  const t=Math.max(0,Number(time)||0);
  let segmentIndex=singleSegments.findIndex((seg,i)=>t<seg.end-.02||i===singleSegments.length-1);
  if(segmentIndex<0)segmentIndex=singleSegments.length-1;
  return {segment:singleSegments[segmentIndex],segmentIndex};
}

function updateSingleUI(){
  if(playbackMode!=='single'||!singleSegments.length)return;
  const {segment,segmentIndex}=segmentForTime(audio.currentTime);
  if(!segment)return;
  index=segmentIndex;
  const span=Math.max(.01,segment.end-segment.start);
  const local=clamp01((audio.currentTime-segment.start)/span);
  progress.style.width=`${local*100}%`;
  nowTitle.textContent=tracks[segment.key].title;
  nowLabel.textContent=`Track ${segmentIndex+1} of 3 · continuous`;
  setMediaMetadata(segment.key);
}

function setSingleSource(path,src,segments,autoplay=true,label='Continuous lock-screen playback'){
  stopCrossfade();
  releaseMediaSource();
  playbackMode='single';
  activeAudio=audio;
  singleSegments=segments.map(s=>({...s}));
  index=0;
  audio.pause();
  audio.src=src;
  audio.volume=1;
  audio.load();
  progress.style.width='0%';
  nowTitle.textContent=tracks[order[0]].title;
  nowLabel.textContent=label;
  setMediaMetadata(order[0],true);
  if(autoplay){
    const p=audio.play();
    if(p&&typeof p.catch==='function')p.catch(()=>{
      playBtn.textContent='▶';
      nowLabel.textContent='Ready · tap ▶ to play';
    });
  }
}

function waitForUpdateEnd(sourceBuffer,buffer,token){
  return new Promise((resolve,reject)=>{
    if(token!==mediaBuildToken){reject(new Error('stale build'));return;}
    const clean=()=>{
      sourceBuffer.removeEventListener('updateend',onEnd);
      sourceBuffer.removeEventListener('error',onError);
    };
    const onEnd=()=>{clean();resolve()};
    const onError=()=>{clean();reject(new Error('source buffer error'))};
    sourceBuffer.addEventListener('updateend',onEnd,{once:true});
    sourceBuffer.addEventListener('error',onError,{once:true});
    try{sourceBuffer.appendBuffer(buffer)}catch(err){clean();reject(err)}
  });
}

function startMseRoute(path,autoplay=true){
  stopCrossfade();
  releaseMediaSource();
  playbackMode='single';
  activeAudio=audio;
  singleSegments=normalSegments(order);
  index=0;
  progress.style.width='0%';
  nowTitle.textContent=tracks[order[0]].title;
  nowLabel.textContent='Preparing continuous lock-screen playback…';
  setMediaMetadata(order[0],true);

  const token=mediaBuildToken;
  mediaSource=new MediaSource();
  mediaSourceUrl=URL.createObjectURL(mediaSource);
  audio.pause();
  audio.src=mediaSourceUrl;
  audio.volume=1;
  audio.load();

  if(autoplay){
    const pendingPlay=audio.play();
    if(pendingPlay&&typeof pendingPlay.catch==='function')pendingPlay.catch(()=>{});
  }

  mediaSource.addEventListener('sourceopen',async()=>{
    if(token!==mediaBuildToken||!mediaSource)return;
    try{
      const sourceBuffer=mediaSource.addSourceBuffer('audio/mpeg');
      try{sourceBuffer.mode='sequence'}catch(_){ }

      const downloads=order.map(key=>fetch(tracks[key].src,{cache:'force-cache'}).then(r=>{
        if(!r.ok)throw new Error(`Could not load ${key}`);
        return r.arrayBuffer();
      }));
      const buffers=await Promise.all(downloads);
      if(token!==mediaBuildToken)return;

      for(const buffer of buffers){
        await waitForUpdateEnd(sourceBuffer,buffer,token);
      }
      if(token!==mediaBuildToken)return;
      if(mediaSource.readyState==='open')mediaSource.endOfStream();
      nowLabel.textContent='Track 1 of 3 · continuous';
      updateSingleUI();

      if(autoplay&&audio.paused){
        const p=audio.play();
        if(p&&typeof p.catch==='function')p.catch(()=>{nowLabel.textContent='Ready · tap ▶ to play'});
      }
    }catch(err){
      if(token!==mediaBuildToken)return;
      console.warn('Continuous media source unavailable; using standard player.',err);
      startLegacy(path,autoplay);
    }
  },{once:true});
}

function startLockSafe(path,autoplay=true){
  const route=routes[path];
  if(renderedReady[path]){
    setSingleSource(path,route.rendered,route.renderedSegments,autoplay,'Continuous lock-screen mix');
    return true;
  }
  if(nativeHls){
    setSingleSource(path,route.hls,normalSegments(order),autoplay,'Continuous lock-screen playback');
    return true;
  }
  if(mseMp3){
    startMseRoute(path,autoplay);
    return true;
  }
  return false;
}

function choose(path){
  setChoiceUI(path);
  const shouldUseLockSafe=mobilePlayback||renderedReady[path];
  if(shouldUseLockSafe&&startLockSafe(path,true))return;
  startLegacy(path,true);
}

function startLegacy(path,autoplay=true){
  setChoiceUI(path);
  releaseMediaSource();
  playbackMode='legacy';
  singleSegments=[];
  stopCrossfade();
  activeAudio=audio;
  index=0;
  loadLegacy(autoplay);
  if(path==='up')primeBeat();
}

function loadLegacy(autoplay=false){
  if(!order.length)return;
  stopCrossfade();
  if(activeAudio!==audio){activeAudio.pause();activeAudio=audio;}
  const key=order[index],t=tracks[key];
  audio.src=t.src;
  audio.volume=1;
  nowTitle.textContent=t.title;
  nowLabel.textContent=`Track ${index+1} of 3`;
  progress.style.width='0%';
  setMediaMetadata(key,true);
  if(autoplay){
    const p=audio.play();
    if(p&&typeof p.then==='function')p.then(()=>playBtn.textContent='❚❚').catch(()=>playBtn.textContent='▶');
  }
}

function toggle(){
  if(!order.length){choose('up');return;}
  if(activeAudio.paused){
    const p=activeAudio.play();
    if(p&&typeof p.catch==='function')p.catch(()=>{});
  }else activeAudio.pause();
}

function step(delta){
  if(!order.length)return;
  if(playbackMode==='single'){
    const {segmentIndex}=segmentForTime(audio.currentTime);
    let targetIndex=segmentIndex;
    if(delta<0&&audio.currentTime-singleSegments[segmentIndex].start>5){
      targetIndex=segmentIndex;
    }else{
      targetIndex=(segmentIndex+delta+singleSegments.length)%singleSegments.length;
    }
    audio.currentTime=singleSegments[targetIndex].start+.02;
    updateSingleUI();
    if(audio.paused)audio.play().catch(()=>{});
    return;
  }
  stopCrossfade();
  activeAudio=audio;
  index=(index+delta+order.length)%order.length;
  loadLegacy(true);
}

function updateProgress(el){
  if(playbackMode==='single'){
    if(el===audio)updateSingleUI();
    return;
  }
  if(el!==activeAudio||!el.duration)return;
  progress.style.width=`${el.currentTime/el.duration*100}%`;
}

function shouldCrossfade(){
  return playbackMode==='legacy'&&order.length===3&&order[0]==='up'&&index===0&&order[index]==='up'&&activeAudio===audio&&!crossfadeActive&&Number.isFinite(audio.duration)&&audio.duration>CROSSFADE_LEAD+2;
}

function beginPositiveCrossfade(){
  if(!shouldCrossfade())return;
  const fadeStart=audio.duration-CROSSFADE_LEAD;
  if(audio.currentTime<fadeStart)return;

  crossfadeActive=true;
  const initialElapsed=Math.max(0,audio.currentTime-fadeStart);
  if(crossAudio.src!==new URL(tracks.beat.src,location.href).href){
    crossAudio.src=tracks.beat.src;
    crossAudio.load();
  }
  crossAudio.volume=0;
  try{crossAudio.currentTime=Math.min(initialElapsed,CROSSFADE_LEAD)}catch(_){ }

  const startBeat=()=>{
    const beatStartPosition=crossAudio.currentTime;
    let firstStopped=false;

    const switchToInstrumental=()=>{
      if(firstStopped)return;
      firstStopped=true;
      audio.pause();
      audio.volume=1;
      activeAudio=crossAudio;
      index=1;
      nowTitle.textContent=tracks.beat.title;
      nowLabel.textContent='Track 2 of 3 · blended in';
      setMediaMetadata('beat',true);
      updateProgress(crossAudio);
    };

    const tick=()=>{
      if(!crossfadeActive)return;
      const elapsed=initialElapsed+Math.max(0,crossAudio.currentTime-beatStartPosition);
      const firstP=clamp01(elapsed/FIRST_FADE_SECONDS);

      if(firstP<1){
        audio.volume=Math.pow(1-firstP,2.15);
        crossAudio.volume=SECOND_UNDER_VOLUME*Math.pow(firstP,1.7);
      }else{
        switchToInstrumental();
        const riseP=clamp01((elapsed-FIRST_FADE_SECONDS)/SECOND_RISE_SECONDS);
        crossAudio.volume=SECOND_UNDER_VOLUME+(1-SECOND_UNDER_VOLUME)*smoothstep(riseP);
        if(riseP>=1){
          cancelAnimationFrame(crossfadeRaf);
          crossfadeRaf=0;
          crossAudio.volume=1;
          crossfadeActive=false;
          updateProgress(crossAudio);
          return;
        }
      }
      crossfadeRaf=requestAnimationFrame(tick);
    };

    cancelAnimationFrame(crossfadeRaf);
    crossfadeRaf=requestAnimationFrame(tick);
  };

  const p=crossAudio.play();
  if(p&&typeof p.then==='function')p.then(startBeat).catch(()=>{crossfadeActive=false;audio.volume=1;});
  else startBeat();
}

function handleEnded(el){
  if(el!==activeAudio)return;
  if(playbackMode==='single'){
    playBtn.textContent='▶';
    setPlaybackState('none');
    return;
  }
  if(index<order.length-1){
    index++;
    loadLegacy(true);
  }else{
    playBtn.textContent='▶';
    setPlaybackState('none');
  }
}

function configureMediaSession(){
  if(!('mediaSession' in navigator))return;
  const handlers={
    play:()=>{if(order.length)activeAudio.play().catch(()=>{})},
    pause:()=>{if(order.length)activeAudio.pause()},
    previoustrack:()=>step(-1),
    nexttrack:()=>step(1),
    seekbackward:details=>{
      if(!order.length)return;
      activeAudio.currentTime=Math.max(0,activeAudio.currentTime-(details.seekOffset||10));
    },
    seekforward:details=>{
      if(!order.length)return;
      const duration=Number.isFinite(activeAudio.duration)?activeAudio.duration:Infinity;
      activeAudio.currentTime=Math.min(duration,activeAudio.currentTime+(details.seekOffset||10));
    },
    seekto:details=>{
      if(!order.length||typeof details.seekTime!=='number')return;
      activeAudio.currentTime=details.seekTime;
    }
  };
  Object.entries(handlers).forEach(([action,handler])=>{
    try{navigator.mediaSession.setActionHandler(action,handler)}catch(_){ }
  });
}

configureMediaSession();

document.querySelectorAll('.choice').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.path)));
playBtn.addEventListener('click',toggle);
prevBtn.addEventListener('click',()=>step(-1));
nextBtn.addEventListener('click',()=>step(1));

audio.addEventListener('play',()=>{
  if(activeAudio===audio){
    playBtn.textContent='❚❚';
    setPlaybackState('playing');
  }
});
audio.addEventListener('pause',()=>{
  if(activeAudio===audio&&!crossfadeActive){
    playBtn.textContent='▶';
    if(!audio.ended)setPlaybackState('paused');
  }
});
audio.addEventListener('ended',()=>handleEnded(audio));
audio.addEventListener('timeupdate',()=>{
  updateProgress(audio);
  if(shouldCrossfade()&&audio.duration-audio.currentTime<=CROSSFADE_LEAD)beginPositiveCrossfade();
});
audio.addEventListener('loadedmetadata',()=>{
  if(playbackMode==='single'&&singleSegments.length&&Number.isFinite(audio.duration)){
    singleSegments[singleSegments.length-1].end=Math.max(singleSegments[singleSegments.length-1].start+.1,audio.duration);
    updateSingleUI();
  }
});

crossAudio.addEventListener('play',()=>{
  if(activeAudio===crossAudio){
    playBtn.textContent='❚❚';
    setPlaybackState('playing');
  }
});
crossAudio.addEventListener('pause',()=>{
  if(activeAudio===crossAudio){
    playBtn.textContent='▶';
    setPlaybackState('paused');
  }
});
crossAudio.addEventListener('ended',()=>handleEnded(crossAudio));
crossAudio.addEventListener('timeupdate',()=>updateProgress(crossAudio));

timeline.addEventListener('click',e=>{
  if(!order.length)return;
  const r=timeline.getBoundingClientRect();
  const ratio=clamp01((e.clientX-r.left)/r.width);
  if(playbackMode==='single'&&singleSegments.length){
    const {segment}=segmentForTime(audio.currentTime);
    if(!segment)return;
    audio.currentTime=segment.start+ratio*(segment.end-segment.start);
    updateSingleUI();
    return;
  }
  if(!activeAudio.duration)return;
  activeAudio.currentTime=ratio*activeAudio.duration;
});
