(()=>{
  const songs=Array.isArray(window.CMD_SAD_MUSIC)?window.CMD_SAD_MUSIC:[];
  const groups=document.getElementById('sadGroups');
  const player=document.getElementById('sadPlayer');
  const audio=document.getElementById('sadAudio');
  const title=document.getElementById('sadPlayerTitle');
  const label=document.getElementById('sadPlayerLabel');
  const status=document.getElementById('sadPlayerStatus');
  const open=document.getElementById('sadPlayerOpen');
  const play=document.getElementById('sadPlay');
  const prev=document.getElementById('sadPrev');
  const next=document.getElementById('sadNext');
  const progress=document.getElementById('sadProgress');
  const bar=document.getElementById('sadProgressBar');
  let queue=[];
  let index=-1;
  let timer=null;

  const safe=(v='')=>String(v).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const grouped=[];
  songs.forEach(song=>{
    let bucket=grouped.find(g=>g.name===song.group);
    if(!bucket){bucket={name:song.group,songs:[]};grouped.push(bucket)}
    bucket.songs.push(song);
  });

  grouped.forEach(group=>{
    const wrap=document.createElement('section');
    wrap.className='sad-group';
    wrap.innerHTML=`<div class="sad-group-title">${safe(group.name)}</div><div class="sad-card-grid"></div>`;
    const grid=wrap.querySelector('.sad-card-grid');
    group.songs.forEach(song=>{
      const card=document.createElement('article');
      card.className='sad-card';
      card.dataset.song=song.id;
      card.dataset.accent=song.accent||'';
      card.innerHTML=`
        <div class="sad-card-top"><span class="sad-card-era">${safe(song.era)}</span><span class="sad-version-count">${song.versions.length} ${song.versions.length===1?'version':'versions'}</span></div>
        <h3>${safe(song.title)}</h3>
        <p>${safe(song.summary)}</p>
        <div class="sad-card-actions"><a class="primary" href="${safe(song.route)}">Open song →</a><button class="sad-quick-play" type="button" hidden>▶ Play</button></div>`;
      grid.appendChild(card);
    });
    groups.appendChild(wrap);
  });

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
    await Promise.all(songs.flatMap(song=>song.versions.map(async version=>{
      if(version.audio)return;
      if(await exists(version.expectedPath))version.audio=version.expectedPath;
    })));
    queue=songs.flatMap(song=>song.versions.filter(v=>v.audio).map(v=>({song,version:v})));
    songs.forEach(song=>{
      const card=document.querySelector(`.sad-card[data-song="${CSS.escape(song.id)}"]`);
      const ready=song.versions.some(v=>v.audio);
      card?.classList.toggle('is-ready',ready);
      const button=card?.querySelector('.sad-quick-play');
      if(button){
        button.hidden=!ready;
        if(ready)button.addEventListener('click',()=>startSong(song.id));
      }
    });
  }

  function media(track){
    if(!('mediaSession'in navigator))return;
    try{navigator.mediaSession.metadata=new MediaMetadata({title:track.song.title,artist:'MusicSubject × Call Me Daddy',album:'When Things Got Heavy'})}catch{}
  }

  function paint(track){
    title.textContent=track.song.title;
    label.textContent=track.version.label;
    status.textContent='Playing';
    open.href=track.song.route;
    open.hidden=false;
    media(track);
  }

  function load(i,autoplay=true){
    clearTimeout(timer);
    if(!queue.length)return;
    index=(i+queue.length)%queue.length;
    const track=queue[index];
    audio.src=track.version.audio;
    audio.load();
    paint(track);
    player.hidden=false;
    document.body.classList.add('sad-player-open');
    if(autoplay)audio.play().catch(()=>{status.textContent='Tap play to continue'});
  }

  function startSong(id){
    const i=queue.findIndex(track=>track.song.id===id);
    if(i>=0)load(i,true);
  }

  play?.addEventListener('click',()=>{
    if(index<0){if(queue.length)load(0,true);return}
    if(audio.paused)audio.play().catch(()=>{});else audio.pause();
  });
  prev?.addEventListener('click',()=>{if(queue.length)load(index<=0?queue.length-1:index-1,true)});
  next?.addEventListener('click',()=>{if(queue.length)load(index+1,true)});
  audio.addEventListener('play',()=>{play.textContent='❚❚';status.textContent='Playing';window.CMDPersistentSite?.setSession(true);if('mediaSession'in navigator)navigator.mediaSession.playbackState='playing'});
  audio.addEventListener('pause',()=>{if(!audio.ended){play.textContent='▶';status.textContent='Paused'}if('mediaSession'in navigator)navigator.mediaSession.playbackState='paused'});
  audio.addEventListener('ended',()=>{
    play.textContent='⋯';
    const n=queue[(index+1)%queue.length];
    status.textContent=n?`Next: ${n.song.title}`:'Finished';
    timer=setTimeout(()=>load(index+1,true),1600);
  });
  audio.addEventListener('timeupdate',()=>{if(audio.duration)bar.style.width=`${(audio.currentTime/audio.duration)*100}%`});
  progress?.addEventListener('click',e=>{if(!audio.duration)return;const r=progress.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(audio.duration,((e.clientX-r.left)/r.width)*audio.duration))});

  if('mediaSession'in navigator){try{
    navigator.mediaSession.setActionHandler('play',()=>audio.play());
    navigator.mediaSession.setActionHandler('pause',()=>audio.pause());
    navigator.mediaSession.setActionHandler('nexttrack',()=>{if(queue.length)load(index+1,true)});
    navigator.mediaSession.setActionHandler('previoustrack',()=>{if(queue.length)load(index-1,true)});
  }catch{}}

  discover();
})();