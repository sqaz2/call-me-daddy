(()=>{
  const player=document.getElementById('ssPlayer');
  const audio=document.getElementById('ssAudio');
  if(!player||!audio)return;
  const byId=id=>document.getElementById(id);
  const coverButton=document.querySelector('.ss-cover-button');
  const coverPlay=document.querySelector('.ss-cover-play');
  const status=byId('ssPlayerStatus');
  const fallback={id:'superstore-effect',songId:'superstore-effect',variantId:'main',variantCount:1,title:'the superstore effect',artist:'Call Me Daddy',project:'Red Deer Civic Emergency',audio:'/media/songs/2026/09/superstore-effect/audio.mp3',cover:'/media/songs/2026/09/superstore-effect/cover.jpg',experience:'/superstore-effect/',radioIntent:'laugh'};
  const song=(window.CMD_SONGS||[]).find(song=>song.id===fallback.id);
  const local={...fallback,...song,songId:fallback.id,variantId:'main',variantCount:1,radioIntent:'laugh'};
  let current=local,coverStarted=false;
  const syncCover=()=>{
    const localPlaying=current.audio===local.audio&&!audio.paused&&!audio.ended;
    if(localPlaying)coverStarted=true;
    if(coverPlay)coverPlay.hidden=coverStarted||localPlaying;
    coverButton?.setAttribute('aria-label',localPlaying?'Pause the superstore effect':'Play the superstore effect');
  };
  if(!window.CMDContinuousPlayback?.create){if(status)status.textContent='Player did not load. Refresh to try again.';return}
  // One queue, one audio owner, one dock. Do not add a second ended/error handler.
  const controller=window.CMDContinuousPlayback.create({
    id:'superstore-effect',audio,tracks:[local],localCount:1,intent:'laugh',replacePlayer:player,pageFollowSeconds:0,
    onTrack:track=>{
      current=track;
      const cover=byId('ssPlayerCover'),title=byId('ssPlayerTitle'),label=byId('ssPlayerLabel');
      if(cover){cover.src=track.cover||'';cover.hidden=!track.cover}
      if(title){title.textContent=track.title;title.href=track.experience||`/now-playing/?song=${encodeURIComponent(track.songId||track.id)}&version=${encodeURIComponent(track.variantId||'main')}`}
      if(label)label.textContent=track.audio===local.audio?'Red Deer civic satire':'Play the site';
      if(status)status.textContent='Loading…';syncCover();
    },
    onPlayState:playing=>{const button=byId('ssPlay');if(button)button.textContent=playing?'❚❚':'▶';if(status)status.textContent=playing?'Playing':'Paused';syncCover()},
    onTime:(time,duration)=>{const bar=byId('ssProgressBar');if(bar)bar.style.width=`${duration>0?time/duration*100:0}%`},
    onStatus:kind=>{if(status)status.textContent=kind==='failed'?'Playback stopped. Tap play to retry.':kind==='error'?'Skipping unavailable track…':'Buffering…'},
    onNeedsTap:()=>{if(status)status.textContent='Ready · tap ▶ to continue';syncCover()}
  });
  document.querySelectorAll('[data-ss-play]').forEach(button=>button.addEventListener('click',()=>{if(controller.current()?.audio===local.audio)controller.toggle();else controller.load(0,{autoplay:true,reason:'cover'})}));
  byId('ssPlay')?.addEventListener('click',()=>controller.toggle());
  byId('ssPrev')?.addEventListener('click',()=>controller.previous());
  byId('ssNext')?.addEventListener('click',()=>controller.next('button-next'));
  byId('ssPlayerShare')?.addEventListener('click',()=>window.CMDPlaylistRadio?.share(controller.current()));
  byId('ssProgress')?.addEventListener('click',event=>{if(!Number.isFinite(audio.duration)||audio.duration<=0)return;const rect=event.currentTarget.getBoundingClientRect();if(rect.width>0)audio.currentTime=Math.max(0,Math.min(audio.duration,(event.clientX-rect.left)/rect.width*audio.duration))});
  document.querySelector('.ss-lyrics details')?.addEventListener('toggle',event=>{const marker=event.currentTarget.querySelector('summary b');if(marker)marker.textContent=event.currentTarget.open?'−':'+'});
  syncCover();
})();
