(()=>{
  const audio=document.getElementById('pulseAudio');
  if(!audio)return;

  const sourceVideo=document.getElementById('sourceVideo');
  const play=document.getElementById('pulsePlay');
  const icon=document.getElementById('pulseIcon');
  const status=document.getElementById('pulseStatus');
  const progress=document.getElementById('pulseProgress');
  const bar=document.getElementById('pulseProgressBar');
  const current=document.getElementById('pulseCurrent');
  const duration=document.getElementById('pulseDuration');
  const player=document.getElementById('armandoPlayer');
  const trackTitle=player?.querySelector('.track-copy strong');
  const trackLabel=player?.querySelector('.track-copy small');
  const cover=player?.querySelector('.armando-cover-button img');
  const machineArtist=player?.querySelector('.machine-meta span');
  const machineProject=player?.querySelector('.machine-meta b');
  const historyDrawer=document.querySelector('.armando-history-drawer');

  const WAIT_SECONDS=4;
  const chosen={
    id:'did-armando-die-after-you-held-his-beer',
    title:'Did Armando Die After You Held His Beer?',
    artist:'MusicSubject × Call Me Daddy',
    project:'Armando',
    label:'Chosen version',
    audio:'/media/songs/2026/08/did-armando-die-after-you-held-his-beer/audio.mp3',
    cover:'/media/songs/2026/08/armando/cover.png'
  };
  const earlier={
    id:'armando',
    title:'Armando — Earlier Mix',
    artist:'MusicSubject × Call Me Daddy',
    project:'Armando archive',
    label:'Earlier Armando mix',
    audio:'/media/songs/2026/08/armando/audio.mp3',
    cover:'/media/songs/2026/08/armando/cover.png'
  };

  const catalog=(window.CMD_SONGS||[])
    .filter(song=>song?.audio && !['armando','did-armando-die-after-you-held-his-beer'].includes(song.id))
    .map(song=>({
      id:song.id,
      title:song.title,
      artist:song.artist||'Call Me Daddy',
      project:song.project||'Catalog',
      label:'From the catalog',
      audio:song.audio,
      cover:song.cover||''
    }));

  const queue=[chosen,earlier,...catalog];
  let index=0;
  let countdownTimer=null;
  let countdownTick=null;
  let continuing=false;

  const fmt=seconds=>{
    if(!Number.isFinite(seconds))return '--:--';
    const m=Math.floor(seconds/60),s=Math.floor(seconds%60);
    return `${m}:${String(s).padStart(2,'0')}`;
  };

  const clearCountdown=()=>{
    if(countdownTimer)clearTimeout(countdownTimer);
    if(countdownTick)clearInterval(countdownTick);
    countdownTimer=countdownTick=null;
  };

  const sync=()=>{
    const d=audio.duration;
    const ratio=d?audio.currentTime/d:0;
    if(bar)bar.style.width=`${ratio*100}%`;
    if(current)current.textContent=fmt(audio.currentTime);
    if(duration)duration.textContent=fmt(d);
    progress?.setAttribute('aria-valuenow',String(Math.round(ratio*100)));
  };

  const updateMediaSession=track=>{
    if(!('mediaSession' in navigator))return;
    try{
      const artwork=track.cover?[{src:new URL(track.cover,location.href).href}]:[];
      navigator.mediaSession.metadata=new MediaMetadata({
        title:track.title,
        artist:track.artist,
        album:track.project,
        artwork
      });
    }catch{}
  };

  const paintTrack=track=>{
    if(trackTitle)trackTitle.textContent=track.title;
    if(trackLabel)trackLabel.textContent=track.label;
    if(machineArtist)machineArtist.textContent=track.artist;
    if(machineProject)machineProject.textContent=track.project.toUpperCase();
    if(cover && track.cover){cover.src=track.cover;cover.alt=`${track.title} artwork`;}
    play?.setAttribute('aria-label',`Play ${track.title}`);
    updateMediaSession(track);
  };

  const loadTrack=(nextIndex,{autoplay=false}={})=>{
    clearCountdown();
    index=Math.max(0,Math.min(queue.length-1,nextIndex));
    const track=queue[index];
    continuing=autoplay;
    paintTrack(track);
    audio.src=track.audio;
    audio.load();
    sync();
    if(status)status.textContent=autoplay?'Loading next…':'Tap the artwork to play';
    if(autoplay)audio.play().catch(()=>{if(status)status.textContent='Tap artwork to continue';});
  };

  const startCountdown=()=>{
    clearCountdown();
    if(index>=queue.length-1){
      continuing=false;
      if(status)status.textContent='End of the current catalog';
      if(icon)icon.textContent='▶';
      return;
    }
    let left=WAIT_SECONDS;
    const next=queue[index+1];
    if(status)status.textContent=`Next: ${next.title} in ${left}…`;
    if(icon)icon.textContent='⋯';
    countdownTick=setInterval(()=>{
      left-=1;
      if(left>0 && status)status.textContent=`Next: ${next.title} in ${left}…`;
    },1000);
    countdownTimer=setTimeout(()=>loadTrack(index+1,{autoplay:true}),WAIT_SECONDS*1000);
  };

  const toggle=()=>{
    clearCountdown();
    if(audio.ended){audio.currentTime=0;audio.play().catch(()=>{});return;}
    if(audio.paused){sourceVideo?.pause();audio.play().catch(()=>{});}else audio.pause();
  };

  play?.addEventListener('click',toggle);
  audio.addEventListener('play',()=>{
    sourceVideo?.pause();
    if(icon)icon.textContent='❚❚';
    if(status)status.textContent='Playing';
    player?.classList.add('is-playing');
    updateMediaSession(queue[index]);
  });
  audio.addEventListener('pause',()=>{
    if(icon && !audio.ended)icon.textContent='▶';
    if(status && !audio.ended && !continuing)status.textContent='Paused';
    player?.classList.remove('is-playing');
  });
  audio.addEventListener('ended',()=>{
    player?.classList.remove('is-playing');
    continuing=true;
    sync();
    startCountdown();
  });
  audio.addEventListener('loadedmetadata',sync);
  audio.addEventListener('timeupdate',sync);
  sourceVideo?.addEventListener('play',()=>{clearCountdown();audio.pause();});

  progress?.addEventListener('click',e=>{
    if(!audio.duration)return;
    const r=progress.getBoundingClientRect();
    audio.currentTime=Math.max(0,Math.min(audio.duration,((e.clientX-r.left)/r.width)*audio.duration));
  });
  progress?.addEventListener('keydown',e=>{
    if(e.key==='ArrowRight'){audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+5);e.preventDefault();}
    if(e.key==='ArrowLeft'){audio.currentTime=Math.max(0,audio.currentTime-5);e.preventDefault();}
  });

  historyDrawer?.addEventListener('toggle',e=>{
    const b=e.currentTarget.querySelector('summary b');
    if(b)b.textContent=e.currentTarget.open?'−':'+';
  });
  document.querySelectorAll('.history-audio').forEach(button=>button.addEventListener('click',()=>{
    loadTrack(1,{autoplay:true});
    document.getElementById('listen')?.scrollIntoView({behavior:'smooth',block:'center'});
  }));

  // Keep this document alive while music is playing. Internal site links open
  // separately, so browsers that allow background-tab audio can keep the session going.
  document.addEventListener('click',e=>{
    if(audio.paused || audio.ended)return;
    const a=e.target.closest('a[href]');
    if(!a || a.target || a.hasAttribute('download'))return;
    const url=new URL(a.href,location.href);
    if(url.origin!==location.origin)return;
    const sameDocument=url.pathname===location.pathname && url.search===location.search;
    if(sameDocument && url.hash)return;
    e.preventDefault();
    const opened=window.open(url.href,'_blank','noopener');
    if(!opened)location.href=url.href;
  },true);

  if('mediaSession' in navigator){
    try{
      navigator.mediaSession.setActionHandler('play',()=>audio.play());
      navigator.mediaSession.setActionHandler('pause',()=>audio.pause());
      navigator.mediaSession.setActionHandler('seekbackward',()=>{audio.currentTime=Math.max(0,audio.currentTime-10);});
      navigator.mediaSession.setActionHandler('seekforward',()=>{audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+10);});
      navigator.mediaSession.setActionHandler('nexttrack',()=>{if(index<queue.length-1)loadTrack(index+1,{autoplay:true});});
      navigator.mediaSession.setActionHandler('previoustrack',()=>{if(index>0)loadTrack(index-1,{autoplay:true});});
    }catch{}
  }

  paintTrack(queue[0]);
  sync();
})();
