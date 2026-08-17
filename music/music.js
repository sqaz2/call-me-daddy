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

  const safe=(value='')=>String(value).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

  async function hydrateYoutubeCard(song,card){
    if(!song.youtubeUrl)return;
    try{
      const endpoint=`https://www.youtube.com/oembed?url=${encodeURIComponent(song.youtubeUrl)}&format=json`;
      const res=await fetch(endpoint,{mode:'cors'});
      if(!res.ok)throw new Error('oEmbed unavailable');
      const data=await res.json();
      if(data.title){song.title=data.title;card.querySelector('h3').textContent=data.title;}
      if(data.author_name){card.querySelector('.song-meta span:first-child').textContent=data.author_name;}
      const img=card.querySelector('.song-cover');
      if(data.thumbnail_url&&img){img.src=data.thumbnail_url;img.alt=`${data.title||song.title} cover`;}
    }catch{}
  }

  songs.forEach(song=>{
    const card=document.createElement('article');
    card.className='song-card';
    card.dataset.song=song.id;
    const primaryAction=song.audio
      ? `<button class="song-play" type="button">Play</button>`
      : song.youtubeUrl
        ? `<a class="song-play" href="${safe(song.experience||song.youtubeUrl)}">Watch</a>`
        : `<button class="song-play" type="button" disabled>Audio coming soon</button>`;
    const experienceLabel=song.youtubeUrl?'Song page →':'Open experience →';
    card.innerHTML=`
      <img class="song-cover" src="${safe(song.cover||'')}" alt="${safe(song.title)} cover" loading="lazy">
      <div class="song-card-body">
        <div class="song-meta"><span>${safe(song.artist||'Call Me Daddy')}</span><span>${safe(song.year||'')}</span><span>${safe(song.kind||'song')}</span></div>
        <h3>${safe(song.title)}</h3>
        <p>${safe(song.description||'')}</p>
        <div class="song-actions">
          ${primaryAction}
          ${song.experience&&song.audio?`<a class="song-link" href="${safe(song.experience)}">${experienceLabel}</a>`:''}
          ${song.youtubeUrl?`<a class="song-link" href="${safe(song.youtubeUrl)}" target="_blank" rel="noopener">YouTube ↗</a>`:''}
        </div>
      </div>`;

    const img=card.querySelector('.song-cover');
    if(!song.cover)card.classList.add('fallback');
    img?.addEventListener('error',()=>card.classList.add('fallback'),{once:true});
    card.querySelector('button.song-play:not([disabled])')?.addEventListener('click',()=>selectSong(song));
    grid.appendChild(card);
    hydrateYoutubeCard(song,card);
  });

  function setActiveCard(id){
    document.querySelectorAll('.song-card').forEach(card=>card.classList.toggle('is-playing',card.dataset.song===id&&!audio.paused));
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
    audio.play().catch(()=>{status.textContent='Tap play to start';play.textContent='▶';});
  }

  play.addEventListener('click',()=>{
    if(!current)return;
    if(audio.paused)audio.play().catch(()=>{});else audio.pause();
  });

  audio.addEventListener('play',()=>{play.textContent='❚❚';status.textContent='Playing';setActiveCard(current?.id)});
  audio.addEventListener('pause',()=>{play.textContent='▶';if(current)status.textContent='Paused';setActiveCard(current?.id)});
  audio.addEventListener('waiting',()=>{if(current)status.textContent='Buffering…'});
  audio.addEventListener('canplay',()=>{if(current&&audio.paused)status.textContent='Ready'});
  audio.addEventListener('ended',()=>{play.textContent='▶';status.textContent='Finished';bar.style.width='100%';setActiveCard(current?.id)});
  audio.addEventListener('error',()=>{status.textContent='This audio file could not be loaded.';play.textContent='▶';setActiveCard(current?.id)});
  audio.addEventListener('timeupdate',()=>{if(audio.duration)bar.style.width=`${(audio.currentTime/audio.duration)*100}%`});

  progress.addEventListener('click',e=>{
    if(!audio.duration)return;
    const r=progress.getBoundingClientRect();
    const ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    audio.currentTime=ratio*audio.duration;
  });
})();
