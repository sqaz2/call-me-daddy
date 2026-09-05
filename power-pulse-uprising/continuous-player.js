(()=>{
  const audio=document.getElementById('pulseAudio');
  if(!audio||!window.CMDContinuousPlayback)return;

  const sourceVideo=document.getElementById('sourceVideo'),play=document.getElementById('pulsePlay'),icon=document.getElementById('pulseIcon'),status=document.getElementById('pulseStatus'),progress=document.getElementById('pulseProgress'),bar=document.getElementById('pulseProgressBar'),current=document.getElementById('pulseCurrent'),duration=document.getElementById('pulseDuration'),player=document.getElementById('armandoPlayer'),trackCopy=player?.querySelector('.track-copy'),trackTitle=trackCopy?.querySelector('strong'),trackLabel=trackCopy?.querySelector('small'),cover=player?.querySelector('.armando-cover-button img'),machineArtist=player?.querySelector('.machine-meta span'),machineProject=player?.querySelector('.machine-meta b'),historyDrawer=document.querySelector('.armando-history-drawer');
  const songLink=document.createElement('a');songLink.className='cmd-now-song-link';songLink.textContent='Open this song →';songLink.hidden=true;trackCopy?.appendChild(songLink);
  const shareButton=document.createElement('button');shareButton.className='cmd-now-share';shareButton.type='button';shareButton.textContent='↗ Share this song';trackCopy?.appendChild(shareButton);
  const chosen={id:'did-armando-die-after-you-held-his-beer',songId:'did-armando-die-after-you-held-his-beer',title:'Did Armando Die After You Held His Beer?',artist:'MusicSubject × Call Me Daddy',project:'Armando',label:'Chosen version',audio:'/media/songs/2026/08/did-armando-die-after-you-held-his-beer/audio.mp3',cover:'/media/songs/2026/08/armando/cover.png',experience:'/power-pulse-uprising/'};
  const earlier={id:'armando',songId:'armando',title:'Armando — Earlier Mix',artist:'MusicSubject × Call Me Daddy',project:'Armando archive',label:'Earlier Armando mix',audio:'/media/songs/2026/08/armando/audio.mp3',cover:'/media/songs/2026/08/armando/cover.png',experience:'/power-pulse-uprising/'};
  let active=chosen,activeIndex=0;
  const fmt=value=>Number.isFinite(value)?`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`:'--:--';
  const sync=(time=audio.currentTime,total=audio.duration)=>{const ratio=total?time/total:0;if(bar)bar.style.width=`${ratio*100}%`;if(current)current.textContent=fmt(time);if(duration)duration.textContent=fmt(total);progress?.setAttribute('aria-valuenow',String(Math.round(ratio*100)))};
  const paint=(track,state={})=>{active=track;activeIndex=state.index??activeIndex;if(trackTitle)trackTitle.textContent=track.title;if(trackLabel)trackLabel.textContent=track.label||(track.variantCount>1?`Play the site · ${track.variantLabel}`:'Play the site');if(machineArtist)machineArtist.textContent=track.artist||'MusicSubject × Call Me Daddy';if(machineProject)machineProject.textContent=(track.project||'Call Me Daddy radio').toUpperCase();if(cover&&track.cover){cover.src=track.cover;cover.alt=`${track.title} artwork`}const can=activeIndex>1&&track.experience;songLink.hidden=!can;if(can)songLink.href=track.experience;if(status)status.textContent=state.reason==='ready'?'Tap artwork to play':'Loading next…';sync()};
  const controller=window.CMDContinuousPlayback.create({
    id:'armando-endless-player',
    audio,
    tracks:[chosen,earlier],
    localCount:2,
    excludeIds:[chosen.id,earlier.id],
    lastSongId:earlier.id,
    route:'/power-pulse-uprising/',
    replacePlayer:player,
    onTrack:paint,
    onTime:sync,
    onReady:()=>sync(),
    onPlayState:playing=>{if(playing)sourceVideo?.pause();if(icon)icon.textContent=playing?'❚❚':'▶';if(status)status.textContent=playing?'Playing':(!audio.ended?'Paused':status.textContent);player?.classList.toggle('is-playing',playing)},
    onStatus:kind=>{if(!status)return;if(kind==='waiting'||kind==='stalled')status.textContent='Buffering…';else if(kind==='blocked')status.textContent='Tap artwork to continue';else if(kind==='error')status.textContent='Skipping unavailable track…';else if(kind==='failed')status.textContent='Playback needs a tap';else if(kind==='unavailable')status.textContent='Radio unavailable · open Music'},
    onNeedsTap:()=>{if(icon)icon.textContent='▶'}
  });

  play?.addEventListener('click',()=>{if(audio.paused){sourceVideo?.pause();controller.play()}else controller.pause()});
  shareButton.addEventListener('click',()=>window.CMDPlaylistRadio?.share(active));
  sourceVideo?.addEventListener('play',()=>controller.pause());
  progress?.addEventListener('click',event=>{if(!audio.duration)return;const rect=progress.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(audio.duration,((event.clientX-rect.left)/rect.width)*audio.duration))});
  historyDrawer?.addEventListener('toggle',event=>{const button=event.currentTarget.querySelector('summary b');if(button)button.textContent=event.currentTarget.open?'−':'+'});
  document.querySelectorAll('.history-audio').forEach(button=>button.addEventListener('click',()=>{controller.load(1,{autoplay:true,reason:'history'});document.getElementById('listen')?.scrollIntoView({behavior:'smooth',block:'center'})}));
  sync();
})();
