(()=>{
  const songs=(Array.isArray(window.CMD_SAD_MUSIC)?window.CMD_SAD_MUSIC:[]).filter(song=>song.id!=='i-need-love'),groups=document.getElementById('sadGroups'),player=document.getElementById('sadPlayer'),audio=document.getElementById('sadAudio'),title=document.getElementById('sadPlayerTitle'),label=document.getElementById('sadPlayerLabel'),status=document.getElementById('sadPlayerStatus'),open=document.getElementById('sadPlayerOpen'),play=document.getElementById('sadPlay'),prev=document.getElementById('sadPrev'),next=document.getElementById('sadNext'),progress=document.getElementById('sadProgress'),bar=document.getElementById('sadProgressBar');
  let queue=[],controller=null;
  const safe=(value='')=>String(value).replace(/[&<>\"]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[character]));
  const grouped=[];
  songs.forEach(song=>{let bucket=grouped.find(group=>group.name===song.group);if(!bucket){bucket={name:song.group,songs:[]};grouped.push(bucket)}bucket.songs.push(song)});
  grouped.forEach(group=>{
    const wrap=document.createElement('section');wrap.className='sad-group';wrap.innerHTML=`<div class="sad-group-title">${safe(group.name)}</div><div class="sad-card-grid"></div>`;
    const grid=wrap.querySelector('.sad-card-grid');
    group.songs.forEach(song=>{
      const card=document.createElement('article');card.className='sad-card';card.dataset.song=song.id;card.dataset.accent=song.accent||'';card.innerHTML=`<div class="sad-card-top"><span class="sad-card-era">${safe(song.era)}</span><span class="sad-version-count">${song.versions.length} ${song.versions.length===1?'version':'versions'}</span></div><h3>${safe(song.title)}</h3><p>${safe(song.summary)}</p><div class="sad-card-actions"><a class="primary" href="${safe(song.route)}">Open song →</a><button class="sad-quick-play" type="button" hidden>▶ Play</button><button class="sad-share-song" type="button">↗ Share song</button></div>`;
      card.querySelector('.sad-share-song')?.addEventListener('click',()=>{const data={title:song.title,text:`Listen to ${song.title}.`,url:new URL(song.route,location.origin).href};if(window.CMDShare?.nativeShare)window.CMDShare.nativeShare(data);else if(navigator.share)navigator.share(data)});
      grid.appendChild(card);
    });
    groups.appendChild(wrap);
  });

  async function exists(path){if(!path)return false;try{let response=await fetch(path,{method:'HEAD',cache:'no-store'});if(response.ok)return true;if(response.status===405){response=await fetch(path,{headers:{Range:'bytes=0-0'},cache:'no-store'});return response.ok||response.status===206}}catch{}return false}
  const paint=(track,state={})=>{title.textContent=track.title;label.textContent=track.variantLabel;status.textContent=state.reason==='ready'?'Ready':'Loading next…';open.href=track.experience;open.hidden=false;if(state.reason!=='ready'){player.hidden=false;document.body.classList.add('sad-player-open')}window.CMDPersistentSite?.refreshClearance?.()};
  const sync=(time=audio.currentTime,total=audio.duration)=>{if(total)bar.style.width=`${time/total*100}%`};
  const startSong=id=>{const index=queue.findIndex(track=>track.songId===id);if(index>=0)controller?.load(index,{autoplay:true,reason:'song-choice'})};

  async function discover(){
    await Promise.all(songs.flatMap(song=>song.versions.map(async version=>{if(!version.audio&&await exists(version.expectedPath))version.audio=version.expectedPath})));
    queue=songs.flatMap(song=>song.versions.filter(version=>version.audio).map(version=>({
      id:`${song.id}:${version.id}`,
      songId:song.id,
      variantId:version.id,
      title:song.title,
      artist:'MusicSubject × Call Me Daddy',
      project:'When Things Got Heavy',
      variantLabel:version.label,
      audio:version.audio,
      experience:song.route,
      song,
      version
    })));
    songs.forEach(song=>{const card=document.querySelector(`.sad-card[data-song="${CSS.escape(song.id)}"]`),ready=queue.some(track=>track.songId===song.id),button=card?.querySelector('.sad-quick-play');card?.classList.toggle('is-ready',ready);if(button){button.hidden=!ready;if(ready)button.addEventListener('click',()=>startSong(song.id))}});
    if(!queue.length||!window.CMDContinuousPlayback)return;
    controller=window.CMDContinuousPlayback.create({
      id:'heavy-collection-player',
      audio,
      tracks:queue,
      localCount:queue.length,
      loopLocal:true,
      route:'/sad-music/',
      onTrack:paint,
      onTime:sync,
      onPlayState:playing=>{play.textContent=playing?'❚❚':'▶';if(playing)status.textContent='Playing';else if(!audio.ended)status.textContent='Paused'},
      onStatus:kind=>{if(kind==='waiting'||kind==='stalled')status.textContent='Buffering…';else if(kind==='blocked')status.textContent='Tap play to continue';else if(kind==='error')status.textContent='Skipping unavailable track…';else if(kind==='failed')status.textContent='Playback needs a tap'}
    });
  }

  play?.addEventListener('click',()=>{if(controller)controller.toggle()});
  prev?.addEventListener('click',()=>controller?.previous());
  next?.addEventListener('click',()=>controller?.next('button-next'));
  progress?.addEventListener('click',event=>{if(!audio.duration)return;const rect=progress.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(audio.duration,(event.clientX-rect.left)/rect.width*audio.duration))});
  discover();
})();
