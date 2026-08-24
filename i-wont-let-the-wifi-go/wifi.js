(()=>{
  const audio=document.getElementById('wifiAudio'); if(!audio)return;
  const loadHelper=(src,key)=>new Promise(resolve=>{if(window[key])return resolve();const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=resolve;document.head.appendChild(s)});
  loadHelper('/persistent-site-browser.js?v=20260823-1','CMDPersistentSite');
  const gapReady=loadHelper('/silent-gap.js?v=20260823-1','CMD_SILENT_GAP');
  const play=document.getElementById('wifiPlay'),icon=document.getElementById('wifiIcon'),status=document.getElementById('wifiStatus'),progress=document.getElementById('wifiProgress'),bar=document.getElementById('wifiProgressBar'),current=document.getElementById('wifiCurrent'),duration=document.getElementById('wifiDuration'),nextUp=document.getElementById('wifiNext'),history=document.querySelector('.wifi-history details'),player=document.getElementById('wifiPlayer');
  const songLink=document.createElement('a');songLink.className='cmd-now-song-link';songLink.textContent='Open this song →';songLink.hidden=true;player?.appendChild(songLink);
  const self={id:'i-wont-let-the-wifi-go',title:'I Won’t Let the Wi‑Fi Go',artist:'MusicSubject × Call Me Daddy',project:'2025 · early AI-music experiment',audio:'/media/songs/2025/i-wont-let-the-wifi-go/audio.mp3',cover:'',experience:'/i-wont-let-the-wifi-go/'};
  const catalog=(window.CMD_SONGS||[]).filter(s=>s?.audio&&s.id!==self.id).map(s=>({id:s.id,title:s.title,artist:s.artist||'Call Me Daddy',project:s.project||'Catalog',audio:s.audio,cover:s.cover||'',experience:s.experience||''}));
  const queue=[self,...catalog]; let index=0,inGap=false,pending=-1;
  const fmt=s=>Number.isFinite(s)?`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`:'--:--';
  const sync=()=>{if(inGap)return;const d=audio.duration,r=d?audio.currentTime/d:0;bar.style.width=`${r*100}%`;current.textContent=fmt(audio.currentTime);duration.textContent=fmt(d);progress.setAttribute('aria-valuenow',String(Math.round(r*100)))};
  const media=t=>{if(!('mediaSession'in navigator))return;try{navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist,album:t.project,artwork:t.cover?[{src:new URL(t.cover,location.href).href}]:[]})}catch{}};
  const paint=t=>{status.textContent=t.title===self.title?'Play':t.title;nextUp.textContent=index===0?'Start here. The rest of the playable catalog follows automatically.':`Now playing · ${t.title}`;const can=index>0&&t.experience;songLink.hidden=!can;if(can)songLink.href=t.experience;media(t)};
  const load=(i,auto=true)=>{inGap=false;pending=-1;index=Math.max(0,Math.min(queue.length-1,i));const t=queue[index];audio.src=t.audio;audio.load();paint(t);sync();if(auto)audio.play().catch(()=>{status.textContent='Tap to continue'})};
  const gap=async()=>{if(index>=queue.length-1){nextUp.textContent='End of the current catalog.';icon.textContent='▶';return}pending=index+1;const n=queue[pending];nextUp.textContent=`Next: ${n.title}…`;status.textContent='4-second pause';icon.textContent='⋯';await gapReady;if(!window.CMD_SILENT_GAP){load(pending,true);return}inGap=true;audio.src=window.CMD_SILENT_GAP;audio.load();audio.play().catch(()=>load(pending,true))};
  play.addEventListener('click',()=>{if(inGap){audio.pause();load(pending,false);return}if(audio.paused)audio.play().catch(()=>{});else audio.pause()});
  audio.addEventListener('play',()=>{icon.textContent=inGap?'⋯':'❚❚';if(!inGap)status.textContent=index===0?'Playing':queue[index].title;if(!inGap)media(queue[index]);window.CMDPersistentSite?.setSession(true);if('mediaSession'in navigator)navigator.mediaSession.playbackState='playing'});
  audio.addEventListener('pause',()=>{if(!inGap&&!audio.ended){icon.textContent='▶';status.textContent='Paused'}if('mediaSession'in navigator)navigator.mediaSession.playbackState='paused'});
  audio.addEventListener('ended',()=>{if(inGap){const target=pending;inGap=false;load(target,true)}else{bar.style.width='100%';gap()}});
  audio.addEventListener('loadedmetadata',sync);audio.addEventListener('timeupdate',sync);
  progress.addEventListener('click',e=>{if(inGap||!audio.duration)return;const r=progress.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(audio.duration,((e.clientX-r.left)/r.width)*audio.duration))});
  history?.addEventListener('toggle',()=>{const b=history.querySelector('summary b');if(b)b.textContent=history.open?'−':'+'});
  if('mediaSession'in navigator){try{navigator.mediaSession.setActionHandler('play',()=>audio.play());navigator.mediaSession.setActionHandler('pause',()=>audio.pause());navigator.mediaSession.setActionHandler('nexttrack',()=>{if(index<queue.length-1)load(index+1,true)});navigator.mediaSession.setActionHandler('previoustrack',()=>{if(index>0)load(index-1,true)})}catch{}}
  paint(self);sync();
})();