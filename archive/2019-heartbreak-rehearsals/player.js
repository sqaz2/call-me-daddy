(()=>{
  const audio=document.getElementById('archiveAudio');
  const player=document.getElementById('archivePlayer');
  if(!audio||!player||!window.CMDContinuousPlayback)return;

  const ids=['september-26th-heartbreak','heartbreak-you-water-me'];
  const catalog=Array.isArray(window.CMD_SONGS)?window.CMD_SONGS:[];
  const tracks=ids.map(id=>{
    const song=catalog.find(item=>item.id===id);
    const variant=song?.variants?.find(item=>item?.audio)||null;
    return song&&variant?{...song,songId:song.id,variantId:variant.id,variantLabel:variant.label,variantCount:song.variants.length,audio:variant.audio}:null;
  }).filter(Boolean);
  if(tracks.length!==ids.length)return;

  const title=document.getElementById('archiveTitle');
  const version=document.getElementById('archiveVersion');
  const status=document.getElementById('archiveStatus');
  const play=document.getElementById('archivePlay');
  const previous=document.getElementById('archivePrev');
  const next=document.getElementById('archiveNext');
  const share=document.getElementById('archiveShare');
  const progress=document.getElementById('archiveProgress');
  const bar=document.getElementById('archiveProgressBar');
  let active=tracks[0];
  let activeIndex=0;

  const syncProgress=(time=audio.currentTime,duration=audio.duration)=>{
    const ratio=Number.isFinite(duration)&&duration>0?Math.max(0,Math.min(1,time/duration)):0;
    bar.style.width=`${ratio*100}%`;
  };
  const paint=(track,state={})=>{
    active=track;
    activeIndex=Number.isInteger(state.index)?state.index:activeIndex;
    title.textContent=track.title;
    version.textContent=state.radio?'Play the site · old files':track.variantLabel||'2019 rehearsal → 2026 remix';
    status.textContent=state.reason==='ready'?'Ready':'Loading next…';
    player.hidden=state.reason==='ready'&&audio.paused;
    syncProgress();
    window.CMDPersistentSite?.refreshClearance?.();
  };

  const controller=window.CMDContinuousPlayback.create({
    id:'heartbreak-rehearsals-endless-player',
    audio,
    tracks,
    localCount:tracks.length,
    intent:'old-files',
    excludeIds:ids,
    lastSongId:ids.at(-1),
    route:'/archive/2019-heartbreak-rehearsals/',
    onTrack:paint,
    onTime:syncProgress,
    onReady:()=>syncProgress(),
    onPlayState:playing=>{
      player.hidden=false;
      play.textContent=playing?'❚❚':'▶';
      status.textContent=playing?'Playing':(!audio.ended?'Paused':status.textContent);
    },
    onStatus:kind=>{
      if(kind==='waiting'||kind==='stalled')status.textContent='Buffering…';
      else if(kind==='blocked')status.textContent='Tap play to continue';
      else if(kind==='error')status.textContent='Skipping unavailable track…';
      else if(kind==='failed')status.textContent='Playback needs a tap';
      else if(kind==='unavailable')status.textContent='Radio unavailable · open Music';
    }
  });

  document.querySelectorAll('[data-track-index]').forEach(button=>button.addEventListener('click',()=>{
    player.hidden=false;
    controller.load(Number(button.dataset.trackIndex)||0,{autoplay:true,reason:'selection'});
  }));
  document.querySelectorAll('[data-share-track]').forEach(button=>button.addEventListener('click',()=>{
    const track=tracks[Number(button.dataset.shareTrack)||0];
    window.CMDPlaylistRadio?.share(track);
  }));
  play.addEventListener('click',()=>{player.hidden=false;controller.toggle()});
  previous.addEventListener('click',()=>controller.previous());
  next.addEventListener('click',()=>controller.next('manual-next'));
  share.addEventListener('click',()=>window.CMDPlaylistRadio?.share(active));
  progress.addEventListener('click',event=>{
    if(!Number.isFinite(audio.duration)||audio.duration<=0)return;
    const rect=progress.getBoundingClientRect();
    audio.currentTime=Math.max(0,Math.min(audio.duration,((event.clientX-rect.left)/rect.width)*audio.duration));
  });
})();
