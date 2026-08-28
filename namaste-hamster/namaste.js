(()=>{
  const audio=document.getElementById('namasteAudio'),player=document.getElementById('namastePlayer'),play=document.getElementById('namastePlay'),heroPlay=document.getElementById('heroPlay'),coverPlay=document.getElementById('coverPlay'),progress=document.getElementById('namasteProgress'),bar=document.getElementById('namasteProgressBar'),status=document.getElementById('namasteStatus'),video=document.querySelector('.namaste-video'),copy=player?.querySelector('.namaste-player-copy'),copyLabel=copy?.querySelector('small'),copyTitle=copy?.querySelector('strong'),miniCover=player?.querySelector('.namaste-mini-cover');
  if(!audio||!player||!play||!window.CMDContinuousPlayback)return;

  const self={id:'namaste-hamster',songId:'namaste-hamster',title:'Namaste, Hamster',artist:'Call Me Daddy × MusicSubject',project:'Namaste, Hamster',audio:'/media/songs/2026/08/namaste-hamster/audio.mp3',cover:'/media/songs/2026/08/namaste-hamster/cover.jpg',experience:'/namaste-hamster/'};
  const songLink=document.createElement('a');songLink.className='cmd-now-song-link';songLink.textContent='Open this song →';songLink.hidden=true;copy?.appendChild(songLink);
  const shareButton=document.createElement('button');shareButton.className='cmd-now-share';shareButton.type='button';shareButton.textContent='↗ Share this song';copy?.appendChild(shareButton);
  let active=self,activeIndex=0;
  const setButtons=playing=>{play.textContent=playing?'❚❚':'▶';if(heroPlay)heroPlay.textContent=playing?'❚❚ Pause the music':'▶ Play the music';if(coverPlay)coverPlay.classList.toggle('is-playing',playing)};
  const paint=(track,state={})=>{active=track;activeIndex=state.index??activeIndex;if(state.reason!=='ready')player.hidden=false;if(copyLabel)copyLabel.textContent=activeIndex===0?'Call Me Daddy':'Play the site';if(copyTitle)copyTitle.textContent=track.title;if(miniCover&&track.cover){miniCover.src=track.cover;miniCover.alt=`${track.title} artwork`}songLink.hidden=!(activeIndex>0&&track.experience);if(!songLink.hidden)songLink.href=track.experience;status.textContent=state.reason==='ready'?'Ready':'Loading next…';window.CMDPersistentSite?.refreshClearance?.()};
  const controller=window.CMDContinuousPlayback.create({
    id:'namaste-endless-player',audio,tracks:[self],localCount:1,excludeIds:[self.id],lastSongId:self.id,route:'/namaste-hamster/',
    onTrack:paint,
    onTime:(time,total)=>{if(total)bar.style.width=`${time/total*100}%`},
    onPlayState:playing=>{setButtons(playing);status.textContent=playing?'Playing':(!audio.ended?'Paused':status.textContent);if(video)video.playbackRate=playing ? .82 : 1},
    onStatus:kind=>{if(kind==='waiting'||kind==='stalled')status.textContent='Buffering…';else if(kind==='blocked')status.textContent='Tap play to continue';else if(kind==='error')status.textContent='Skipping unavailable track…';else if(kind==='failed')status.textContent='Playback needs a tap'}
  });
  const toggle=()=>{player.hidden=false;controller.toggle()};
  [play,heroPlay,coverPlay].forEach(element=>element?.addEventListener('click',toggle));
  shareButton.addEventListener('click',()=>window.CMDPlaylistRadio?.share(active));
  progress?.addEventListener('click',event=>{if(!audio.duration)return;const rect=progress.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(audio.duration,(event.clientX-rect.left)/rect.width*audio.duration))});
})();
