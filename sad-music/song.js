(()=>{
  const id=document.body.dataset.sadSong;
  const songs=Array.isArray(window.CMD_SAD_MUSIC)?window.CMD_SAD_MUSIC:[];
  const song=songs.find(s=>s.id===id);
  const app=document.getElementById('sadSongApp');
  if(!song||!app)return;

  const safe=(v='')=>String(v).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  document.title=`${song.title} — MusicSubject × Call Me Daddy`;

  const currentIndex=songs.findIndex(s=>s.id===song.id);
  const previous=songs[(currentIndex-1+songs.length)%songs.length];
  const next=songs[(currentIndex+1)%songs.length];

  app.innerHTML=`
    <section class="sad-song-hero">
      <div class="shell sad-song-hero-inner">
        <a class="back" href="/sad-music/">← When Things Got Heavy</a>
        <div class="eyebrow">${safe(song.era)} · ${safe(song.group.replace(/^\d{4}\s·\s/,''))}</div>
        <h1>${safe(song.title)}</h1>
        <p class="lede">${safe(song.summary)}</p>
        <div class="actions"><a class="btn" href="/sad-music/">Collection</a></div>
      </div>
    </section>
    <section class="shell sad-song-main">
      <div class="sad-version-layout">
        <div class="sad-versions" id="sadVersionList"></div>
        <aside class="sad-story">
          <div class="eyebrow">The story</div>
          <h2>WHY THIS ONE EXISTS.</h2>
          <p>${safe(song.summary)}</p>
          <details><summary>More story</summary><p>${safe(song.story)}</p></details>
          <div class="sad-neighbors"><a href="${safe(previous.route)}">← ${safe(previous.title)}</a><a href="${safe(next.route)}">${safe(next.title)} →</a></div>
        </aside>
      </div>
    </section>`;

  const versions=document.getElementById('sadVersionList');
  song.versions.forEach(version=>{
    const row=document.createElement('article');
    row.className='sad-version';
    row.dataset.version=version.id;
    row.innerHTML=`<div class="sad-version-top"><strong>${safe(version.label)}</strong><small>${safe(song.era)}</small></div><button type="button" disabled>Audio not attached yet</button>`;
    versions.appendChild(row);
  });

  const player=document.getElementById('sadSongPlayer');
  const audio=document.getElementById('sadSongAudio');
  const pTitle=document.getElementById('sadSongPlayerTitle');
  const pLabel=document.getElementById('sadSongPlayerLabel');
  const pStatus=document.getElementById('sadSongPlayerStatus');
  const pPlay=document.getElementById('sadSongPlay');
  const pPrev=document.getElementById('sadSongPrev');
  const pNext=document.getElementById('sadSongNext');
  const progress=document.getElementById('sadSongProgress');
  const bar=document.getElementById('sadSongProgressBar');
  let playable=[];
  let index=-1;

  async function exists(path){
    if(!path)return false;
    try{
      let res=await fetch(path,{method:'HEAD',cache:'no-store'});
      if(res.ok)return true;
      if(res.status===405){res=await fetch(path,{headers:{Range:'bytes=0-0'},cache:'no-store'});return res.ok||res.status===206}
    }catch{}
    return false;
  }

  async function discover(){
    await Promise.all(song.versions.map(async version=>{
      if(!version.audio&&await exists(version.expectedPath))version.audio=version.expectedPath;
    }));
    playable=song.versions.filter(v=>v.audio);
    song.versions.forEach(version=>{
      const row=versions.querySelector(`[data-version="${CSS.escape(version.id)}"]`);
      const button=row?.querySelector('button');
      if(!button)return;
      if(version.audio){
        button.disabled=false;
        button.textContent='▶ Play this version';
        button.addEventListener('click',()=>load(playable.findIndex(v=>v.id===version.id),true));
      }
    });
  }

  function media(version){
    if(!('mediaSession'in navigator))return;
    try{navigator.mediaSession.metadata=new MediaMetadata({title:song.title,artist:'MusicSubject × Call Me Daddy',album:version.label})}catch{}
  }

  function load(i,auto=true){
    if(!playable.length)return;
    index=(i+playable.length)%playable.length;
    const version=playable[index];
    audio.src=version.audio;
    audio.load();
    pTitle.textContent=song.title;
    pLabel.textContent=version.label;
    pStatus.textContent=auto?'Loading…':'Ready';
    player.hidden=false;
    media(version);
    if(auto)audio.play().catch(()=>{pStatus.textContent='Tap play to continue'});
  }

  pPlay?.addEventListener('click',()=>{if(index<0){if(playable.length)load(0,true);return}if(audio.paused)audio.play().catch(()=>{});else audio.pause()});
  pPrev?.addEventListener('click',()=>{if(playable.length)load(index-1,true)});
  pNext?.addEventListener('click',()=>{if(playable.length)load(index+1,true)});
  audio.addEventListener('play',()=>{pPlay.textContent='❚❚';pStatus.textContent='Playing';window.CMDPersistentSite?.setSession(true);if('mediaSession'in navigator)navigator.mediaSession.playbackState='playing'});
  audio.addEventListener('pause',()=>{if(!audio.ended){pPlay.textContent='▶';pStatus.textContent='Paused'}if('mediaSession'in navigator)navigator.mediaSession.playbackState='paused'});
  audio.addEventListener('ended',()=>{if(playable.length>1)load(index+1,true);else{pPlay.textContent='▶';pStatus.textContent='Finished'}});
  audio.addEventListener('timeupdate',()=>{if(audio.duration)bar.style.width=`${(audio.currentTime/audio.duration)*100}%`});
  progress?.addEventListener('click',e=>{if(!audio.duration)return;const r=progress.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(audio.duration,((e.clientX-r.left)/r.width)*audio.duration))});

  if('mediaSession'in navigator){try{
    navigator.mediaSession.setActionHandler('play',()=>audio.play());
    navigator.mediaSession.setActionHandler('pause',()=>audio.pause());
    navigator.mediaSession.setActionHandler('nexttrack',()=>{if(playable.length)load(index+1,true)});
    navigator.mediaSession.setActionHandler('previoustrack',()=>{if(playable.length)load(index-1,true)});
  }catch{}}

  discover();
})();