(()=>{
  const audio=document.getElementById('pickAudio');
  const dock=document.getElementById('pickPlayer');
  const play=document.getElementById('pickPlay');
  const status=document.getElementById('pickStatus');
  const progress=document.getElementById('pickProgress');
  const bar=document.getElementById('pickProgressBar');
  const tactileMount=document.getElementById('pickTactile');
  const triggers=[document.getElementById('pickHeroPlay'),document.getElementById('pickPunchPlay'),document.getElementById('pickStoryPlay')].filter(Boolean);
  if(!window.CMDPersistentSite){const s=document.createElement('script');s.src='/persistent-site-browser.js?v=20260823-1';document.head.appendChild(s)}

  window.CMDTactileScrubber?.create({mount:tactileMount,getDuration:()=>audio.duration,getTime:()=>audio.currentTime,seek:time=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=Math.max(0,Math.min(audio.duration,time));},label:'DRAG TO SCAN',detail:'ONE TURN = WHOLE SONG',haptics:true});

  const setTriggerState=()=>{const playing=!audio.paused&&!audio.ended;triggers.forEach(button=>{const base=button.dataset.baseLabel||button.textContent.replace(/^▶\s*/,'').replace(/^❚❚\s*/,'');button.dataset.baseLabel=base;button.textContent=`${playing?'❚❚':'▶'} ${base}`})};
  const reveal=()=>{dock.hidden=false;document.body.classList.add('pick-player-open')};
  const toggle=()=>{reveal();if(audio.paused)audio.play().catch(()=>{status.textContent='Tap play to start'});else audio.pause()};
  triggers.forEach(button=>button.addEventListener('click',toggle));play.addEventListener('click',toggle);

  audio.addEventListener('play',()=>{reveal();play.textContent='❚❚';play.setAttribute('aria-label','Pause');status.textContent='Playing';setTriggerState();window.CMDPersistentSite?.setSession(true);if('mediaSession'in navigator){try{navigator.mediaSession.playbackState='playing'}catch{}}});
  audio.addEventListener('pause',()=>{play.textContent='▶';play.setAttribute('aria-label','Play');if(!audio.ended)status.textContent='Paused';setTriggerState();if('mediaSession'in navigator){try{navigator.mediaSession.playbackState='paused'}catch{}}});
  audio.addEventListener('waiting',()=>{status.textContent='Buffering…'});audio.addEventListener('canplay',()=>{if(audio.paused&&!audio.ended)status.textContent='Ready'});audio.addEventListener('ended',()=>{status.textContent='Finished';play.textContent='▶';bar.style.width='100%';setTriggerState()});audio.addEventListener('error',()=>{status.textContent='This audio file could not be loaded.';play.textContent='▶';setTriggerState()});
  audio.addEventListener('timeupdate',()=>{if(audio.duration){bar.style.width=`${Math.min(100,audio.currentTime/audio.duration*100)}%`;if('mediaSession'in navigator&&Number.isFinite(audio.duration)){try{navigator.mediaSession.setPositionState({duration:audio.duration,playbackRate:audio.playbackRate,position:Math.min(audio.currentTime,audio.duration)})}catch{}}}});
  progress.addEventListener('click',e=>{if(!audio.duration)return;const r=progress.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(audio.duration,(e.clientX-r.left)/r.width*audio.duration))});
  if('mediaSession'in navigator&&typeof MediaMetadata!=='undefined'){try{navigator.mediaSession.metadata=new MediaMetadata({title:'I’d Pick You First (remastered)',artist:'MusicSubject',album:'Call Me Daddy'});navigator.mediaSession.setActionHandler('play',()=>audio.play().catch(()=>{}));navigator.mediaSession.setActionHandler('pause',()=>audio.pause());navigator.mediaSession.setActionHandler('seekbackward',d=>{audio.currentTime=Math.max(0,audio.currentTime-(d.seekOffset||10))});navigator.mediaSession.setActionHandler('seekforward',d=>{audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+(d.seekOffset||10))});navigator.mediaSession.setActionHandler('seekto',d=>{if(typeof d.seekTime==='number')audio.currentTime=Math.max(0,Math.min(audio.duration||Infinity,d.seekTime))})}catch{}}
})();