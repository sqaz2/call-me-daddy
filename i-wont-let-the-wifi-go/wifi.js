(()=>{
  const audio=document.getElementById('wifiAudio');
  if(!audio||!window.CMDContinuousPlayback)return;

  const play=document.getElementById('wifiPlay'),icon=document.getElementById('wifiIcon'),status=document.getElementById('wifiStatus'),progress=document.getElementById('wifiProgress'),bar=document.getElementById('wifiProgressBar'),current=document.getElementById('wifiCurrent'),duration=document.getElementById('wifiDuration'),nextUp=document.getElementById('wifiNext'),history=document.querySelector('.wifi-history details'),player=document.getElementById('wifiPlayer');
  const songLink=document.createElement('a');songLink.className='cmd-now-song-link';songLink.textContent='Open this song →';songLink.hidden=true;player?.appendChild(songLink);
  const shareButton=document.createElement('button');shareButton.className='cmd-now-share';shareButton.type='button';shareButton.textContent='↗ Share this song';player?.appendChild(shareButton);
  const self={id:'i-wont-let-the-wifi-go',songId:'i-wont-let-the-wifi-go',title:'I Won’t Let the Wi‑Fi Go',artist:'MusicSubject × Call Me Daddy',project:'2025 · early AI-music experiment',audio:'/media/songs/2025/i-wont-let-the-wifi-go/audio.mp3',cover:'',experience:'/i-wont-let-the-wifi-go/'};
  let active=self,activeIndex=0;
  const fmt=value=>Number.isFinite(value)?`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`:'--:--';
  const sync=(time=audio.currentTime,total=audio.duration)=>{const ratio=total?time/total:0;bar.style.width=`${ratio*100}%`;current.textContent=fmt(time);duration.textContent=fmt(total);progress.setAttribute('aria-valuenow',String(Math.round(ratio*100)))};
  const paint=(track,state={})=>{active=track;activeIndex=state.index??activeIndex;status.textContent=state.reason==='ready'?'Play':'Loading next…';nextUp.textContent=activeIndex===0?'Start here. Play the site takes over automatically afterward.':`Play the site · ${track.variantLabel||track.title}`;const can=activeIndex>0&&track.experience;songLink.hidden=!can;if(can)songLink.href=track.experience;sync();window.CMDPersistentSite?.refreshClearance?.()};
  const controller=window.CMDContinuousPlayback.create({
    id:'wifi-endless-player',
    audio,
    tracks:[self],
    localCount:1,
    excludeIds:[self.id],
    lastSongId:self.id,
    route:'/i-wont-let-the-wifi-go/',
    replacePlayer:player,
    onTrack:paint,
    onTime:sync,
    onReady:()=>sync(),
    onPlayState:playing=>{icon.textContent=playing?'❚❚':'▶';if(playing)status.textContent=activeIndex===0?'Playing':active.title;else if(!audio.ended)status.textContent='Paused'},
    onStatus:kind=>{if(kind==='waiting'||kind==='stalled')status.textContent='Buffering…';else if(kind==='blocked')status.textContent='Tap to continue';else if(kind==='error')status.textContent='Skipping unavailable track…';else if(kind==='failed')status.textContent='Playback needs a tap';else if(kind==='unavailable')status.textContent='Radio unavailable · open Music'},
    onNeedsTap:()=>{icon.textContent='▶'}
  });

  play.addEventListener('click',()=>controller.toggle());
  shareButton.addEventListener('click',()=>window.CMDPlaylistRadio?.share(active));
  progress.addEventListener('click',event=>{if(!audio.duration)return;const rect=progress.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(audio.duration,((event.clientX-rect.left)/rect.width)*audio.duration))});
  history?.addEventListener('toggle',()=>{const button=history.querySelector('summary b');if(button)button.textContent=history.open?'−':'+'});
  sync();
})();
