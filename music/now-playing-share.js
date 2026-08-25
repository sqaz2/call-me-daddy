(()=>{
  const audio=document.getElementById('catalogAudio');
  const controls=document.querySelector('.catalog-controls');
  const songs=Array.isArray(window.CMD_SONGS)?window.CMD_SONGS:[];
  const cycle=window.CMDCatalogCycle;
  if(!audio||!controls||!songs.length||!cycle)return;

  const love=songs.find(song=>song.id==='i-need-love');
  if(love){
    love.description='Older recording → 2024 AI reimagining → 2026 busker, ska-punk and dubstep branches.';
    const card=[...document.querySelectorAll('.song-card')].find(el=>el.dataset.song==='i-need-love');
    const copy=card?.querySelector('.song-card-body p');
    if(copy)copy.textContent=love.description;
  }

  const abs=value=>{try{return new URL(value,location.href).href}catch{return value||''}};
  const variantsFor=song=>cycle.variants(song);
  const shareUrl=(songId,variantId)=>{
    const url=new URL('/music/',location.origin);
    url.searchParams.set('song',songId);
    if(variantId)url.searchParams.set('version',variantId);
    return url.href;
  };
  const findCurrent=()=>{
    const src=abs(audio.currentSrc||audio.src||'');
    if(!src)return null;
    for(const song of songs){
      const variants=variantsFor(song);
      for(const variant of variants){
        if(abs(variant.audio)===src){
          return {
            song,
            variant,
            songId:song.id,
            variantId:variant.id||'main',
            variantLabel:variant.label||song.kind||'Version',
            variantCount:variants.length
          };
        }
      }
    }
    return null;
  };

  const share=document.createElement('button');
  share.id='catalogShare';
  share.className='catalog-skip catalog-share';
  share.type='button';
  share.setAttribute('aria-label','Share now playing');
  share.title='Share now playing';
  share.textContent='↗';
  controls.appendChild(share);

  share.addEventListener('click',async()=>{
    const current=findCurrent();
    if(!current)return;
    const detail=current.variantCount>1?` — ${current.variantLabel}`:'';
    const data={
      title:`${current.song.title}${detail}`,
      text:`Listen to ${current.song.title}${detail}.`,
      url:shareUrl(current.songId,current.variantId)
    };
    if(window.CMDShare?.nativeShare){await window.CMDShare.nativeShare(data);return;}
    try{
      if(navigator.share){await navigator.share(data);return;}
      await navigator.clipboard?.writeText(`${data.text}\n${data.url}`);
    }catch{}
  });

  const openSharedTrack=()=>{
    let songId='';
    try{songId=new URLSearchParams(location.search).get('song')||''}catch{}
    if(!songId)return;
    const card=[...document.querySelectorAll('.song-card')].find(el=>el.dataset.song===songId);
    const button=card?.querySelector('button.song-art-hit');
    if(!button)return;
    window.setTimeout(()=>{
      button.click();
      card.scrollIntoView({block:'center',behavior:'smooth'});
    },80);
  };
  openSharedTrack();
})();