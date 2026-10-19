(()=>{
  const id=document.body.dataset.sadSong,songs=(Array.isArray(window.CMD_SAD_MUSIC)?window.CMD_SAD_MUSIC:[]).filter(s=>s.id!=='i-need-love'),song=songs.find(s=>s.id===id),app=document.getElementById('sadSongApp');if(!song||!app)return;
  const safe=(v='')=>String(v).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));document.title=`${song.title} — MusicSubject × Call Me Daddy`;
  const ci=songs.findIndex(s=>s.id===song.id),previous=songs[(ci-1+songs.length)%songs.length],next=songs[(ci+1)%songs.length],more=song.story?`<details><summary>More story</summary><p>${safe(song.story)}</p></details>`:'';
  const sunoLinks=Array.isArray(song.sunoUrls)?song.sunoUrls.filter(Boolean):[];
  const sunoHistory=sunoLinks.length?`<details class="suno-history"><summary>${sunoLinks.length===1?'Suno source':'Suno history · '+sunoLinks.length+' generations'}</summary><div class="suno-links">${sunoLinks.map((url,i)=>`<a href="${safe(url)}" target="_blank" rel="noopener">${sunoLinks.length===1?'Open on Suno':'Suno '+(i+1)} ↗</a>`).join('')}</div></details>`:'';
  const historyLinks=Array.isArray(song.historyLinks)?song.historyLinks.filter(x=>x?.url):[];
  const earlierHistory=historyLinks.length?`<details class="suno-history"><summary>Earlier recording history</summary><div class="suno-links">${historyLinks.map(x=>`<a href="${safe(x.url)}" target="_blank" rel="noopener">${safe(x.label||'Earlier version')} ↗</a>`).join('')}</div></details>`:'';
  app.innerHTML=`<section class="sad-song-hero"><div class="shell sad-song-hero-inner"><a class="back" href="/sad-music/">← When Things Got Heavy</a><div class="eyebrow">${safe(song.era)} · ${safe(song.group.replace(/^\d{4}\s·\s/,''))}</div><h1>${safe(song.title)}</h1><p class="lede">${safe(song.summary)}</p><div class="actions"><a class="btn" href="/sad-music/">Collection</a><button class="btn" id="sadSongShare" type="button">↗ Share</button></div></div></section><section class="shell sad-song-main"><div class="sad-version-layout"><div class="sad-versions" id="sadVersionList"></div><aside class="sad-story"><div class="eyebrow">The story</div><h2>WHY THIS ONE EXISTS.</h2><p>${safe(song.summary)}</p>${more}${earlierHistory}${sunoHistory}<div class="sad-neighbors"><a href="${safe(previous.route)}">← ${safe(previous.title)}</a><a href="${safe(next.route)}">${safe(next.title)} →</a></div></aside></div></section>`;
  const shareVersion=version=>{
    const track={songId:song.id,variantId:version.id,title:song.title,variantLabel:version.label,variantCount:song.versions.length,audio:version.audio||version.expectedPath,experience:song.route};
    return window.CMDShare?.shareTrack(track);
  };
  document.getElementById('sadSongShare')?.addEventListener('click',()=>shareVersion(song.versions[0]));
  const versions=document.getElementById('sadVersionList');song.versions.forEach(v=>{const row=document.createElement('article');row.className='sad-version';row.dataset.version=v.id;const suno=v.sunoUrl?`<a class="sad-version-suno" href="${safe(v.sunoUrl)}" target="_blank" rel="noopener">Open this version on Suno ↗</a>`:'';row.innerHTML=`<div class="sad-version-top"><strong>${safe(v.label)}</strong><small>${safe(song.era)}</small></div><button type="button" hidden>▶ Play this version</button><button class="sad-version-share" type="button">↗ Share this version</button>${suno}`;row.querySelector('.sad-version-share')?.addEventListener('click',()=>shareVersion(v));versions.appendChild(row)});
  const player=document.getElementById('sadSongPlayer'),audio=document.getElementById('sadSongAudio'),pTitle=document.getElementById('sadSongPlayerTitle'),pLabel=document.getElementById('sadSongPlayerLabel'),pStatus=document.getElementById('sadSongPlayerStatus'),pPlay=document.getElementById('sadSongPlay'),pPrev=document.getElementById('sadSongPrev'),pNext=document.getElementById('sadSongNext'),progress=document.getElementById('sadSongProgress'),bar=document.getElementById('sadSongProgressBar'),copy=player?.querySelector('.sad-song-player-copy');
  const pOpen=document.createElement('a');pOpen.className='sad-open-song';pOpen.textContent='Open this song →';pOpen.hidden=true;copy?.appendChild(pOpen);
  let queue=[],controller=null;
  async function exists(path){if(!path)return false;try{let r=await fetch(path,{method:'HEAD',cache:'no-store'});if(r.ok)return true;if(r.status===405){r=await fetch(path,{headers:{Range:'bytes=0-0'},cache:'no-store'});return r.ok||r.status===206}}catch{}return false}
  function paint(track,state={}){if(!track)return;pTitle.textContent=track.title;pLabel.textContent=track.variantLabel;pStatus.textContent=state.reason==='ready'?'Ready':'Loading next…';pOpen.hidden=track.songId===song.id;pOpen.href=track.experience;if(state.reason!=='ready')player.hidden=false;window.CMDPersistentSite?.refreshClearance?.()}
  function sync(time=audio.currentTime,total=audio.duration){if(total)bar.style.width=`${time/total*100}%`}
  async function discover(){
    await Promise.all(songs.flatMap(item=>item.versions.map(async version=>{if(!version.audio&&await exists(version.expectedPath))version.audio=version.expectedPath})));
    queue=songs.flatMap(item=>item.versions.filter(version=>version.audio).map(version=>({id:`${item.id}:${version.id}`,songId:item.id,variantId:version.id,title:item.title,artist:'MusicSubject × Call Me Daddy',project:'When Things Got Heavy',variantLabel:version.label,audio:version.audio,experience:item.route,song:item,version})));
    if(!queue.length||!window.CMDContinuousPlayback)return;
    controller=window.CMDContinuousPlayback.create({
      id:'heavy-song-player',audio,tracks:queue,localCount:queue.length,loopLocal:true,route:song.route,replacePlayer:player,
      startIndex:Math.max(0,queue.findIndex(track=>track.songId===song.id)),
      onTrack:paint,onTime:sync,
      onPlayState:playing=>{pPlay.textContent=playing?'❚❚':'▶';if(playing)pStatus.textContent='Playing';else if(!audio.ended)pStatus.textContent='Paused'},
      onStatus:kind=>{if(kind==='waiting'||kind==='stalled')pStatus.textContent='Buffering…';else if(kind==='blocked')pStatus.textContent='Tap play to continue';else if(kind==='error')pStatus.textContent='Skipping unavailable track…';else if(kind==='failed')pStatus.textContent='Playback needs a tap'}
    });
    song.versions.forEach(version=>{const button=versions.querySelector(`[data-version="${CSS.escape(version.id)}"] button`),queueIndex=queue.findIndex(track=>track.songId===song.id&&track.variantId===version.id);if(queueIndex>=0&&button){button.hidden=false;button.addEventListener('click',()=>controller.load(queueIndex,{autoplay:true,reason:'version-choice'}))}});
  }
  pPlay?.addEventListener('click',()=>controller?.toggle());
  pPrev?.addEventListener('click',()=>controller?.previous());
  pNext?.addEventListener('click',()=>controller?.next('button-next'));
  progress?.addEventListener('click',event=>{if(!audio.duration)return;const rect=progress.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(audio.duration,(event.clientX-rect.left)/rect.width*audio.duration))});
  discover();
})();
