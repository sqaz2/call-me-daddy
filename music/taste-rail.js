(()=>{
  const mount=document.getElementById('tasteRail');
  if(!mount)return;

  const safe=value=>String(value||'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));

  function render(){
    const songs=Array.isArray(window.CMD_SONGS)?window.CMD_SONGS:[];
    const taste=window.CMDListenerTaste;
    const clusters=window.CMDTasteClusters;
    if(!clusters?.rankMostLikely||!taste){
      mount.hidden=true;
      return;
    }

    const likes=taste.likes?.()||[];
    if(!likes.length&&!(taste.dislikes?.()||[]).length){
      mount.hidden=true;
      mount.innerHTML='';
      return;
    }

    const ranked=clusters.rankMostLikely(songs,taste,12);
    if(!ranked.length){
      mount.hidden=true;
      mount.innerHTML='';
      return;
    }

    mount.hidden=false;
    mount.innerHTML=`
      <div class="taste-rail-head">
        <div><div class="kicker">From your likes · this browser only</div><h2>MOST LIKELY FOR YOU.</h2></div>
        <p>Ranked by cluster affinity — lanes you liked rise; full-bleed lanes you skipped soft-hide here (search still finds them).</p>
      </div>
      <div class="taste-rail-track" tabindex="0" aria-label="Most likely songs for you">
        ${ranked.map(song=>{
          const cluster=clusters.clusterFor(song.id);
          const cover=song.cover||'';
          return `<button type="button" class="taste-card" data-play-id="${safe(song.id)}">
            ${cover?`<img src="${safe(cover)}" alt="" loading="lazy">`:'<span class="taste-card-fallback" aria-hidden="true"></span>'}
            <span class="taste-card-copy">
              <small>${safe(cluster?.label||song.project||'Call Me Daddy')}</small>
              <strong>${safe(song.title)}</strong>
              <span>${safe(song.project||song.kind||'')}</span>
            </span>
          </button>`;
        }).join('')}
      </div>`;
  }

  mount.addEventListener('click',event=>{
    const card=event.target.closest('[data-play-id]');
    if(!card)return;
    const id=card.dataset.playId;
    if(window.CMDMusicCatalog?.playSongId){
      window.CMDMusicCatalog.playSongId(id);
      return;
    }
    location.href=`/music/?song=${encodeURIComponent(id)}&intent=surprise&share=1`;
  });

  window.CMDTasteRail={refresh:render};
  render();
})();
