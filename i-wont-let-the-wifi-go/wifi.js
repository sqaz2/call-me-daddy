(()=>{
  const audio=document.getElementById('wifiAudio');
  if(!audio)return;

  if(!window.CMDPersistentSite){
    const script=document.createElement('script');
    script.src='/persistent-site-browser.js?v=20260823-1';
    document.head.appendChild(script);
  }

  const play=document.getElementById('wifiPlay');
  const icon=document.getElementById('wifiIcon');
  const status=document.getElementById('wifiStatus');
  const progress=document.getElementById('wifiProgress');
  const bar=document.getElementById('wifiProgressBar');
  const current=document.getElementById('wifiCurrent');
  const duration=document.getElementById('wifiDuration');
  const nextUp=document.getElementById('wifiNext');
  const history=document.querySelector('.wifi-history details');
  const player=document.getElementById('wifiPlayer');
  const songLink=document.createElement('a');
  songLink.className='cmd-now-song-link';
  songLink.textContent='Open this song →';
  songLink.hidden=true;
  player?.appendChild(songLink);

  const WAIT=4;
  const self={id:'i-wont-let-the-wifi-go',title:'I Won’t Let the Wi‑Fi Go',artist:'MusicSubject × Call Me Daddy',project:'2025 · early AI-music experiment',audio:'/media/songs/2025/i-wont-let-the-wifi-go/audio.mp3',cover:'',experience:'/i-wont-let-the-wifi-go/'};
  const catalog=(window.CMD_SONGS||[]).filter(s=>s?.audio&&s.id!==self.id).map(s=>({id:s.id,title:s.title,artist:s.artist||'Call Me Daddy',project:s.project||'Catalog',audio:s.audio,cover:s.cover||'',experience:s.experience||''}));
  const queue=[self,...catalog];
  let index=0,timer=null,tick=null;

  const fmt=s=>{if(!Number.isFinite(s))return'--:--';const m=Math.floor(s/60);return`${m}:${String(Math.floor(s%60)).padStart(2,'0')}`};
  const clearWait=()=>{if(timer)clearTimeout(timer);if(tick)clearInterval(tick);timer=tick=null};
  const sync=()=>{const d=audio.duration,r=d?audio.currentTime/d:0;bar.style.width=`${r*100}%`;current.textContent=fmt(audio.currentTime);duration.textContent=fmt(d);progress.setAttribute('aria-valuenow',String(Math.round(r*100)))};
  const media=track=>{if(!('mediaSession'in navigator))return;try{navigator.mediaSession.metadata=new MediaMetadata({title:track.title,artist:track.artist,album:track.project,artwork:track.cover?[{src:new URL(track.cover,location.href).href}]:[]})}catch{}};
  const paint=track=>{
    status.textContent=track.title===self.title?'Play':track.title;
    nextUp.textContent=index===0?'Start here. The rest of the playable catalog follows automatically.':`Now playing · ${track.title}`;
    const canOpen=index>0&&Boolean(track.experience);
    songLink.hidden=!canOpen;
    if(canOpen)songLink.href=track.experience;
    media(track);
  };
  const load=(i,auto=true)=>{clearWait();index=Math.max(0,Math.min(queue.length-1,i));const track=queue[index];audio.src=track.audio;audio.load();paint(track);sync();if(auto)audio.play().catch(()=>{status.textContent='Tap to continue'})};
  const countdown=()=>{clearWait();if(index>=queue.length-1){nextUp.textContent='End of the current catalog.';icon.textContent='▶';return}let left=WAIT;const n=queue[index+1];nextUp.textContent=`Next: ${n.title} in ${left}…`;icon.textContent='⋯';tick=setInterval(()=>{left--;if(left>0)nextUp.textContent=`Next: ${n.title} in ${left}…`},1000);timer=setTimeout(()=>load(index+1,true),WAIT*1000)};

  play.addEventListener('click',()=>{clearWait();if(audio.paused)audio.play().catch(()=>{});else audio.pause()});
  audio.addEventListener('play',()=>{icon.textContent='❚❚';status.textContent=index===0?'Playing':queue[index].title;media(queue[index]);window.CMDPersistentSite?.setSession(true);if('mediaSession'in navigator)navigator.mediaSession.playbackState='playing'});
  audio.addEventListener('pause',()=>{if(!audio.ended){icon.textContent='▶';status.textContent='Paused'}if('mediaSession'in navigator)navigator.mediaSession.playbackState='paused'});
  audio.addEventListener('ended',()=>{bar.style.width='100%';countdown()});
  audio.addEventListener('loadedmetadata',sync);audio.addEventListener('timeupdate',sync);
  progress.addEventListener('click',e=>{if(!audio.duration)return;const r=progress.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(audio.duration,((e.clientX-r.left)/r.width)*audio.duration))});
  progress.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+5);e.preventDefault()}if(e.key==='ArrowLeft'){audio.currentTime=Math.max(0,audio.currentTime-5);e.preventDefault()}});
  history?.addEventListener('toggle',()=>{const b=history.querySelector('summary b');if(b)b.textContent=history.open?'−':'+'});

  if('mediaSession'in navigator){try{navigator.mediaSession.setActionHandler('play',()=>audio.play());navigator.mediaSession.setActionHandler('pause',()=>audio.pause());navigator.mediaSession.setActionHandler('nexttrack',()=>{if(index<queue.length-1)load(index+1,true)});navigator.mediaSession.setActionHandler('previoustrack',()=>{if(index>0)load(index-1,true)});navigator.mediaSession.setActionHandler('seekbackward',()=>{audio.currentTime=Math.max(0,audio.currentTime-10)});navigator.mediaSession.setActionHandler('seekforward',()=>{audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+10)})}catch{}}
  paint(self);sync();
})();