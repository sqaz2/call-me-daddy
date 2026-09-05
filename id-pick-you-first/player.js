(()=>{
  const audio=document.getElementById('pickAudio'),dock=document.getElementById('pickPlayer'),play=document.getElementById('pickPlay'),status=document.getElementById('pickStatus'),progress=document.getElementById('pickProgress'),bar=document.getElementById('pickProgressBar'),tactileMount=document.getElementById('pickTactile'),copy=dock?.querySelector('.pick-player-copy'),copyLabel=copy?.querySelector('small'),copyTitle=copy?.querySelector('strong'),triggers=[document.getElementById('pickHeroPlay'),document.getElementById('pickPunchPlay'),document.getElementById('pickStoryPlay')].filter(Boolean);
  if(!audio||!dock||!play||!window.CMDContinuousPlayback)return;

  const self={id:'id-pick-you-first',songId:'id-pick-you-first',title:'I’d Pick You First',artist:'MusicSubject',project:'Call Me Daddy · remastered',audio:'/media/songs/2026/08/id-pick-you-first/audio.mp3',experience:'/id-pick-you-first/'};
  const songLink=document.createElement('a');songLink.className='cmd-now-song-link';songLink.textContent='Open this song →';songLink.hidden=true;copy?.appendChild(songLink);
  const shareButton=document.createElement('button');shareButton.className='cmd-now-share';shareButton.type='button';shareButton.textContent='↗ Share this song';copy?.appendChild(shareButton);
  let active=self,activeIndex=0;
  window.CMDTactileScrubber?.create({mount:tactileMount,getDuration:()=>audio.duration,getTime:()=>audio.currentTime,seek:time=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=Math.max(0,Math.min(audio.duration,time))},label:'DRAG TO SCAN',detail:'ONE TURN = WHOLE SONG',haptics:true});
  const setTriggerState=playing=>{triggers.forEach(button=>{const base=button.dataset.baseLabel||button.textContent.replace(/^▶\s*/,'').replace(/^❚❚\s*/,'');button.dataset.baseLabel=base;button.textContent=`${playing?'❚❚':'▶'} ${base}`})};
  const reveal=()=>{dock.hidden=false;document.body.classList.add('pick-player-open');window.CMDPersistentSite?.refreshClearance?.()};
  const paint=(track,state={})=>{active=track;activeIndex=state.index??activeIndex;if(copyLabel)copyLabel.textContent=activeIndex===0?'MusicSubject · remastered':'Play the site';if(copyTitle)copyTitle.textContent=track.title;songLink.hidden=!(activeIndex>0&&track.experience);if(!songLink.hidden)songLink.href=track.experience;status.textContent=state.reason==='ready'?'Ready':'Loading next…';if(state.reason==='restore')reveal()};
  const controller=window.CMDContinuousPlayback.create({
    id:'pick-endless-player',audio,tracks:[self],localCount:1,excludeIds:[self.id],lastSongId:self.id,route:'/id-pick-you-first/',replacePlayer:dock,
    onTrack:paint,
    onTime:(time,total)=>{if(total)bar.style.width=`${Math.min(100,time/total*100)}%`},
    onPlayState:playing=>{if(playing)reveal();play.textContent=playing?'❚❚':'▶';play.setAttribute('aria-label',playing?'Pause':'Play');status.textContent=playing?'Playing':(!audio.ended?'Paused':status.textContent);setTriggerState(playing)},
    onStatus:kind=>{if(kind==='waiting'||kind==='stalled')status.textContent='Buffering…';else if(kind==='blocked')status.textContent='Tap play to continue';else if(kind==='error')status.textContent='Skipping unavailable track…';else if(kind==='failed')status.textContent='Playback needs a tap'}
  });
  const toggle=()=>{reveal();controller.toggle()};
  triggers.forEach(button=>button.addEventListener('click',toggle));
  play.addEventListener('click',toggle);
  shareButton.addEventListener('click',()=>window.CMDPlaylistRadio?.share(active));
  progress.addEventListener('click',event=>{if(!audio.duration)return;const rect=progress.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(audio.duration,(event.clientX-rect.left)/rect.width*audio.duration))});
})();
