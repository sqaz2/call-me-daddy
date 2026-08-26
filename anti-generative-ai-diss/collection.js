(()=>{
  const data=window.CMD_ANTI_AI_COLLECTION;
  const mount=document.getElementById('antiCollection');
  const community=document.getElementById('antiCommunity');
  if(!data||!Array.isArray(data.tracks)||!mount)return;

  const safe=(value='')=>String(value).replace(/[&<>\"]/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'
  }[char]));
  const tracks=data.tracks.slice().sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999));

  mount.innerHTML=tracks.map(track=>`
    <article class="anti-track${track.current?' is-current':''}">
      <img src="${safe(track.cover)}" alt="${safe(track.title)} cover artwork" loading="lazy">
      <div class="anti-track-shade"></div>
      <div class="anti-track-copy">
        <small>${String(track.order).padStart(2,'0')} · ${safe(track.role)}</small>
        <strong>${safe(track.title)}</strong>
        <span>${safe(track.artist)}</span>
        <p>${safe(track.summary)}</p>
        <a href="${safe(track.href)}">${track.current?'You are here':'Open track'} →</a>
      </div>
    </article>`).join('');

  if(community&&data.community){
    const item=data.community;
    community.innerHTML=`
      <div>
        <div class="kicker">${safe(item.mode)}</div>
        <h3>${safe(item.title)}</h3>
        <p>${safe(item.summary)}</p>
      </div>
      <a class="btn" href="${safe(item.groupUrl)}" target="_blank" rel="noopener">${safe(item.groupLabel)} ↗</a>`;
  }
})();
