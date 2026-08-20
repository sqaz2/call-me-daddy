(()=>{
  const songs=Array.isArray(window.CMD_SONGS)?window.CMD_SONGS:[];
  const grid=document.getElementById('songGrid');
  const count=document.getElementById('catalogCount');
  const player=document.getElementById('catalogPlayer');
  const audio=document.getElementById('catalogAudio');
  const play=document.getElementById('catalogPlay');
  const title=document.getElementById('playerTitle');
  const label=document.getElementById('playerLabel');
  const status=document.getElementById('playerStatus');
  const cover=document.getElementById('playerCover');
  const progress=document.getElementById('catalogProgress');
  const bar=document.getElementById('catalogProgressBar');
  let current=null;

  count.textContent=`${songs.length} ${songs.length===1?'track':'tracks'}`;

  if(!songs.length){
    grid.innerHTML='<p class="catalog-empty">No tracks have been added yet.</p>';
    return;
  }

  const safe=(value='')=>String(value).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));

  async function hydrateYoutubeCard(song,card){
    if(!song.youtubeUrl)return;
    try{
      const endpoint=`https://www.youtube.com/oembed?url=${encodeURIComponent(song.youtubeUrl)}&format=json`;
      const res=await fetch(endpoint,{mode:'cors'});
      if(!res.ok)throw new Error('oEmbed unavailable');
      const data=await res.json();
      if(data.title){
        song.title=data.title;
        card.querySelector('h3').textContent=data.title;
        const art=card.querySelector('.song-art-hit');
        if(art)art.setAttribute('aria-label',song.audio?`Play ${data.title}`:`Open ${data.title}`);
      }
      if(data.author_name)card.querySelector('.song-meta span:first-child').textContent=data.author_name;
      const img=card.querySelector('.song-cover');
      if(data.thumbnail_url&&img){img.src=data.thumbnail_url;img.alt=`${data.title||song.title} cover`;}
    }catch{}
  }

  songs.forEach(song=>{
    const card=document.createElement('article');
    card.className='song-card';
    card.dataset.song=song.id;
    const destination=song.experience||song.youtubeUrl||'';
    const artAction=song.audio
      ? `<button class="song-art-hit" type="button" aria-label="Play ${safe(song.title)}"><span class="song-art-cue">▶ Tap artwork to play</span></button>`
      : destination
        ? `<a class="song-art-hit" href="${safe(destination)}" aria-label="Open ${safe(song.title)}"><span class="song-art-cue">↗ Tap artwork to open</span></a>`
        : `<span class="song-art-hit is-disabled" aria-hidden="true"><span class="song-art-cue">Audio coming soon</span></span>`;
    const experienceLabel=song.youtubeUrl?'Song page →':'Open experience →';

    card.innerHTML=`
      <img class="song-cover" src="${safe(song.cover||'')}" alt="${safe(song.title)} cover" loading="lazy">
      ${artAction}
      <div class="song-card-body">
        <div class="song-meta"><span>${safe(song.artist||'Call Me Daddy')}</span><span>${safe(song.year||'')}</span><span>${safe(song.kind||'song')}</span></div>
        <h3>${safe(song.title)}</h3>
        <p>${safe(song.description||'')}</p>
        <div class="song-actions">
          ${song.experience&&song.audio?`<a class="song-link" href="${safe(song.experience)}">${experienceLabel}</a>`:''}
          ${song.youtubeUrl?`<a class="song-link" href="${safe(song.youtubeUrl)}" target="_blank" rel="noopener">YouTube ↗</a>`:''}
          ${song.youtubeMusicUrl?`<a class="song-link" href="${safe(song.youtubeMusicUrl)}" target="_blank" rel="noopener">YouTube Music ↗</a>`:''}
          ${song.spotifyUrl?`<a class="song-link" href="${safe(song.spotifyUrl)}" target="_blank" rel="noopener">Spotify ↗</a>`:''}
          ${song.sunoUrl?`<a class="song-link" href="${safe(song.sunoUrl)}" target="_blank" rel="noopener">Suno ↗</a>`:''}
        </div>
      </div>`;

    const img=card.querySelector('.song-cover');
    if(!song.cover)card.classList.add('fallback');
    img?.addEventListener('error',()=>card.classList.add('fallback'),{once:true});
    card.querySelector('button.song-art-hit')?.addEventListener('click',()=>selectSong(song));
    grid.appendChild(card);
    hydrateYoutubeCard(song,card);
  });

  function setActiveCard(id){
    document.querySelectorAll('.song-card').forEach(card=>{
      const selected=card.dataset.song===id;
      const playing=selected&&!audio.paused&&!audio.ended;
      card.classList.toggle('is-selected',selected);
      card.classList.toggle('is-playing',playing);
      const cue=card.querySelector('button.song-art-hit .song-art-cue');
      if(cue)cue.textContent=playing?'❚❚ Tap artwork to pause':selected?'▶ Tap artwork to resume':'▶ Tap artwork to play';
    });
  }

  function selectSong(song){
    if(!song?.audio)return;
    if(current?.id===song.id){
      if(audio.paused)audio.play().catch(()=>{});else audio.pause();
      return;
    }

    current=song;
    audio.src=song.audio;
    title.textContent=song.title;
    label.textContent=[song.artist,song.project].filter(Boolean).join(' · ');
    status.textContent='Loading…';
    cover.src=song.cover||'';
    cover.alt=`${song.title} cover`;
    cover.onerror=()=>{cover.removeAttribute('src');cover.alt='';};
    bar.style.width='0%';
    player.hidden=false;
    setActiveCard(current.id);
    audio.play().catch(()=>{
      status.textContent='Tap play to start';
      play.textContent='▶';
      setActiveCard(current.id);
    });
  }

  play.addEventListener('click',()=>{
    if(!current)return;
    if(audio.paused)audio.play().catch(()=>{});else audio.pause();
  });

  audio.addEventListener('play',()=>{play.textContent='❚❚';play.setAttribute('aria-label','Pause');status.textContent='Playing';setActiveCard(current?.id)});
  audio.addEventListener('pause',()=>{play.textContent='▶';play.setAttribute('aria-label','Play');if(current&&!audio.ended)status.textContent='Paused';setActiveCard(current?.id)});
  audio.addEventListener('waiting',()=>{if(current)status.textContent='Buffering…'});
  audio.addEventListener('canplay',()=>{if(current&&audio.paused&&!audio.ended){status.textContent='Ready';setActiveCard(current.id)}});
  audio.addEventListener('ended',()=>{play.textContent='▶';play.setAttribute('aria-label','Play');status.textContent='Finished';bar.style.width='100%';setActiveCard(current?.id)});
  audio.addEventListener('error',()=>{status.textContent='This audio file could not be loaded.';play.textContent='▶';play.setAttribute('aria-label','Play');setActiveCard(current?.id)});
  audio.addEventListener('timeupdate',()=>{if(audio.duration)bar.style.width=`${(audio.currentTime/audio.duration)*100}%`});

  progress.addEventListener('click',e=>{
    if(!audio.duration)return;
    const r=progress.getBoundingClientRect();
    const ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    audio.currentTime=ratio*audio.duration;
  });
})();
