(()=>{
  const mount=document.getElementById('lineageRail');
  if(!mount)return;
  const families=Array.isArray(window.CMD_LINEAGES)?window.CMD_LINEAGES:[];
  const songs=Array.isArray(window.CMD_SONGS)?window.CMD_SONGS:[];
  const byId=new Map(songs.map(song=>[song.id,song]));

  const resolved=families.map(family=>{
    const members=(family.songIds||[]).map(id=>byId.get(id)).filter(Boolean);
    return {...family,members};
  }).filter(family=>family.members.length);

  if(!resolved.length){
    mount.hidden=true;
    return;
  }

  const safe=value=>String(value||'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));

  mount.innerHTML=`
    <div class="lineage-rail-head">
      <div><div class="kicker">Same song · different lives</div><h2>LINEAGES.</h2></div>
      <p>Swipe the rail. Tap a card to put that identity on the radio — not a playlist clone, a family tree.</p>
    </div>
    <div class="lineage-rail-track" tabindex="0" aria-label="Song lineages">
      ${resolved.map(family=>{
        const lead=family.members[0];
        const cover=lead.cover||'';
        const labels=family.members.map(song=>song.title).join(' · ');
        return `<button type="button" class="lineage-card" data-lineage="${safe(family.id)}" data-play-id="${safe(lead.id)}">
          ${cover?`<img src="${safe(cover)}" alt="" loading="lazy">`:'<span class="lineage-card-fallback" aria-hidden="true"></span>'}
          <span class="lineage-card-copy">
            <small>${safe(family.kicker)}</small>
            <strong>${safe(family.title)}</strong>
            <span>${safe(family.blurb||labels)}</span>
          </span>
        </button>`;
      }).join('')}
    </div>`;

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
})();
